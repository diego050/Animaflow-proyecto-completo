import os
from typing import Any, List, Literal
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError, OperationalError


from app.schemas.job import (
    JobCreate,
    JobResponse,
    JobListResponse,
    JobDraftRequest,
    ScriptGenerateRequest,
    ScriptGenerateResponse,
    SceneRegenerateRequest,
    SceneApprovalRequest,
)
from app.db.session import get_db
from app.db.models import JobModel, User, DesignTemplate
from app.core.config import settings
from app.services.intent_router import classify_intent, answer_query
from app.services.context_manager import get_history, save_message
from app.core.logging import get_logger
from app.core.security import get_current_user, get_current_user_from_token
from app.core.limiter import limiter
from app.core.storage_paths import get_storage_dir
from app.modules.pipeline.orchestrator import run_pipeline, run_pipeline_enrichment
from app.core.file_logger import JobFileLogger
from app.api.deps import get_job_or_404

from pydantic import BaseModel
from sqlalchemy.orm.attributes import flag_modified


class SceneEditRequest(BaseModel):
    """Request body for editing a scene's spec."""
    mode: Literal["manual", "conversational"]
    # For manual mode
    changes: list[dict[str, Any]] | None = None  # [{"field_path": "...", "value": ...}]
    # For conversational mode
    prompt: str | None = None


VIDEOS_STORAGE = get_storage_dir("videos")

router = APIRouter()


@router.post("/", response_model=JobResponse, status_code=201)
@limiter.limit("10/minute")
async def create_job(
    request: Request,
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Resolve design_md: design_template_id takes precedence over inline design_md
    resolved_design_md = job_in.design_md
    if job_in.design_template_id:
        template = db.query(DesignTemplate).filter(
            DesignTemplate.id == job_in.design_template_id,
            DesignTemplate.user_id == current_user.id,
        ).first()
        if not template:
            raise HTTPException(status_code=404, detail="Design template not found")
        resolved_design_md = template.content

    # Store resolved design_md and system_prompt in result_spec for the scheduler to pick up
    initial_spec: dict = {}
    if resolved_design_md:
        initial_spec["design_md"] = resolved_design_md
    if job_in.system_prompt:
        initial_spec["system_prompt"] = job_in.system_prompt

    # Associate job with the authenticated user
    new_job = JobModel(
        script_text=job_in.script_text,
        status="pending",
        user_id=current_user.id,
        aspect_ratio=job_in.aspect_ratio,
        tts_provider=job_in.tts_provider,
        tts_voice_id=job_in.tts_voice_id,
        llm_model=job_in.model,
        result_spec=initial_spec or None,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # El scheduler se encargará de esto ahora que está en 'pending'
    # db.refresh(new_job) fue llamado arriba.

    return JobResponse(job_id=new_job.id, status=new_job.status, error_message=new_job.error_message)


@router.post("/draft", response_model=JobResponse, status_code=201)
async def create_draft(
    draft_in: JobDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new draft job."""
    # Guardamos los datos del draft en result_spec temporalmente
    new_job = JobModel(
        script_text=draft_in.draft_data.get("script", "[DRAFT]"),
        status="draft",
        user_id=current_user.id,
        result_spec=draft_in.draft_data,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return JobResponse(job_id=new_job.id, status=new_job.status, result_spec=new_job.result_spec, error_message=new_job.error_message)


@router.put("/{job_id}/draft", response_model=JobResponse)
async def update_draft(
    job_id: str,
    draft_in: JobDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing draft."""
    job = get_job_or_404(db, job_id, current_user.id)
    if job.status != "draft":
        raise HTTPException(status_code=400, detail="Job is not in draft status")
    
    job.result_spec = draft_in.draft_data
    if "script" in draft_in.draft_data:
        job.script_text = draft_in.draft_data["script"]
        
    flag_modified(job, "result_spec")
    db.commit()
    return JobResponse(job_id=job.id, status=job.status, result_spec=job.result_spec, error_message=job.error_message)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the job belongs to the current user
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
        error_message=job.error_message,
    )


@router.post("/{job_id}/approve-scenes", response_model=JobResponse)
async def approve_scenes(
    job_id: str,
    approval: SceneApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve or edit segmented scenes and continue the pipeline.

    The frontend sends the confirmed/edited scenes with their media_query
    prompts. We persist these scenes into result_spec, then set status to
    'queued_enrichment' so the scheduler picks up TTS + anima_composer generation.
    """
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "segmented":
        raise HTTPException(
            status_code=400,
            detail=f"Job must be in 'segmented' status to approve scenes (current: {job.status})"
        )

    if not approval.scenes:
        raise HTTPException(status_code=400, detail="No scenes provided for approval")

    # Persist the approved/edited scenes into result_spec.
    # The scheduler will pick up 'queued_enrichment' and run TTS + anima_composer.
    current_spec = job.result_spec or {}
    
    # Build updated scenes list from user's approval (may have edited text/media_query)
    approved_scenes = []
    for i, approved_scene in enumerate(approval.scenes):
        # Preserve existing scene data but override with user edits
        existing = current_spec.get("scenes", [])[i] if i < len(current_spec.get("scenes", [])) else {}
        updated_scene = {
            **existing,
            "text": approved_scene.text,
            "media_query": approved_scene.media_query or existing.get("media_query", ""),
            "duration_seconds": approved_scene.duration_seconds or existing.get("duration_seconds", 0.0),
            "start_time_seconds": approved_scene.start_time_seconds or existing.get("start_time_seconds", 0.0),
            # Reset enrichment fields — they will be regenerated
            "audio_url": None,
            "word_timestamps": [],
            "type": "pending",
            "anima_composer": None,
            "quality_status": None,
        }
        approved_scenes.append(updated_scene)

    current_spec["scenes"] = approved_scenes
    current_spec["approved"] = True
    job.result_spec = current_spec
    job.status = "queued_enrichment"
    flag_modified(job, "result_spec")
    db.commit()

    # Return immediately with the updated status
    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
        error_message=job.error_message,
    )


@router.get("/{job_id}/logs")
async def get_job_logs(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Obtener logs del job desde archivo."""
    job = get_job_or_404(db, job_id, current_user.id)
    return {"logs": JobFileLogger.get_logs(job_id)}


@router.get("/{job_id}/history")
async def get_job_history(
    job_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve conversation history for a specific job.
    Returns messages in chronological order.
    """
    # Verify job ownership
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        messages = await get_history(db, job_id, limit=limit)
    except (ProgrammingError, OperationalError):
        raise HTTPException(
            status_code=503,
            detail="Conversation history service unavailable"
        )

    return {"messages": messages}



@router.get("/{job_id}/video")
async def get_job_video(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Servir MP4 final del job."""
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.video_url:
        raise HTTPException(status_code=404, detail="Video not ready")

    # Extraer path del video_url
    video_path = os.path.join(VIDEOS_STORAGE, f"{job_id}.mp4")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(video_path, media_type="video/mp4")


@router.post("/{job_id}/reformat")
async def reformat_job(
    job_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reformat a job to a new aspect ratio with scene selection.

    Body:
        aspect_ratio: str (e.g., "16:9", "9:16", "1:1", "21:9", "2.39:1")
        scene_selection: str ("all", "selected", "current")
        scene_indices: list[int] (required if scene_selection="selected")
        current_scene_index: int (required if scene_selection="current")
    """
    aspect_ratio = data.get("aspect_ratio")
    scene_selection = data.get("scene_selection", "all")
    scene_indices = data.get("scene_indices", [])
    current_scene_index = data.get("current_scene_index")

    # Validate aspect ratio
    if not aspect_ratio:
        raise HTTPException(status_code=400, detail="aspect_ratio required")

    # Support formats: "16:9", "1:1", "21:9", "2.39:1"
    import re
    if not re.match(r'^\d+(\.\d+)?:\d+(\.\d+)?$', aspect_ratio):
        raise HTTPException(status_code=400, detail="Invalid aspect_ratio format. Use 'width:height' (e.g., '16:9', '2.39:1')")

    # Validate scene selection
    if scene_selection not in ["all", "selected", "current"]:
        raise HTTPException(status_code=400, detail="scene_selection must be 'all', 'selected', or 'current'")

    if scene_selection == "selected" and not scene_indices:
        raise HTTPException(status_code=400, detail="scene_indices required when scene_selection='selected'")

    if scene_selection == "current" and current_scene_index is None:
        raise HTTPException(status_code=400, detail="current_scene_index required when scene_selection='current'")

    job = get_job_or_404(db, job_id, current_user.id)

    if not job.result_spec or not job.result_spec.get("scenes"):
        raise HTTPException(status_code=400, detail="Job must be completed before reformatting")

    scenes = job.result_spec["scenes"]

    # Validate scene indices
    if scene_selection == "selected":
        for idx in scene_indices:
            if idx < 0 or idx >= len(scenes):
                raise HTTPException(status_code=400, detail=f"Invalid scene index: {idx}")

    if scene_selection == "current":
        if current_scene_index < 0 or current_scene_index >= len(scenes):
            raise HTTPException(status_code=400, detail=f"Invalid current_scene_index: {current_scene_index}")

    # Create new job
    new_job = JobModel(
        script_text=job.script_text,
        aspect_ratio=aspect_ratio,
        status="pending",
        user_id=current_user.id,
        tts_provider=job.tts_provider,
        tts_voice_id=job.tts_voice_id,
        parent_job_id=job.id,
        llm_model=job.llm_model,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Determine which scenes to reformat
    scenes_to_reformat = {
        "selection": scene_selection,
        "indices": scene_indices if scene_selection == "selected" else
                   [current_scene_index] if scene_selection == "current" else
                   list(range(len(scenes)))
    }

    # El Scheduler procesará esto
    pass

    return {
        "message": "Reformat job created",
        "new_job_id": new_job.id,
        "original_job_id": job.id,
        "aspect_ratio": aspect_ratio,
        "scene_selection": scene_selection,
        "scenes_to_reformat": scenes_to_reformat["indices"],
    }


@router.delete("/{job_id}", response_model=dict)
async def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.job_cleanup import delete_job_files

    # Verify current_user owns this job before deletion
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    delete_job_files(job_id, current_user.id)

    # 6. Delete DB record
    db.delete(job)
    db.commit()
    return {"status": "deleted", "job_id": job_id}


@router.post("/{job_id}/render", response_model=JobResponse)
@limiter.limit("5/minute")
async def trigger_render(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify current_user owns this job before triggering render
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.result_spec:
        raise HTTPException(
            status_code=400, detail="Job does not have a generated spec to render"
        )

    if job.status == "rendering":
        raise HTTPException(status_code=400, detail="Job is already rendering")

    job.status = "queued_render"
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
        error_message=job.error_message,
    )


@router.post("/generate-script", response_model=ScriptGenerateResponse)
def generate_script(
    req: ScriptGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    from app.modules.llm.script_generator import generate_script_from_info
    from app.modules.llm.resolver import MissingApiKeyError

    try:
        script = generate_script_from_info(
            info=req.info,
            user_id=current_user.id,
            template_id=req.template_id,
            custom_system_prompt=req.custom_prompt,
            api_key=req.api_key,
            provider=req.provider,
            target_duration_seconds=req.target_duration_seconds,
        )
    except MissingApiKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ScriptGenerateResponse(script_text=script)


@router.get("", response_model=List[JobListResponse])
async def get_all_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Filter jobs by current_user.id for per-user scoping
    jobs = (
        db.query(JobModel)
        .filter(JobModel.user_id == current_user.id)
        .order_by(JobModel.created_at.desc().nullslast())
        .limit(50)
        .all()
    )
    return [
        JobListResponse(
            job_id=j.id,
            status=j.status,
            script_text=j.script_text,
            video_url=j.video_url,
            created_at=j.created_at,
            aspect_ratio=j.aspect_ratio,
            parent_job_id=j.parent_job_id,
        )
        for j in jobs
    ]


@router.post("/{job_id}/scenes/{scene_index}/regenerate", response_model=JobResponse)
async def trigger_scene_regenerate(
    job_id: str,
    scene_index: int,
    req: SceneRegenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Regenerate a single scene's TTS and visual spec synchronously.

    Calls regenerate_single_scene_sync which handles:
    - TTS regeneration (if text changed)
    - Visual spec (anima_composer) regeneration
    - DB persistence
    """
    from app.modules.pipeline.scene_manager import regenerate_single_scene_sync

    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job not found or missing spec")

    scenes = job.result_spec.get("scenes", [])
    if scene_index < 0 or scene_index >= len(scenes):
        raise HTTPException(status_code=400, detail="Invalid scene index")

    try:
        # Call the sync regeneration function (handles TTS + visual spec)
        updated_spec = regenerate_single_scene_sync(
            job_id=job_id,
            spec=job.result_spec,
            scene_index=scene_index,
            new_media_query=req.media_query,
            new_text=req.text,
            user_id=current_user.id,
        )

        # Refresh job from DB (regenerate_single_scene_sync already committed)
        db.refresh(job)

        return JobResponse(
            job_id=job.id,
            status=job.status,
            result_spec=job.result_spec,
            video_url=job.video_url,
            error_message=job.error_message,
        )

    except Exception as e:
        logger = get_logger("api.jobs")
        logger.exception("Scene regeneration failed for job %s, scene %d: %s", job_id, scene_index, e)
        raise HTTPException(
            status_code=500,
            detail=f"Scene regeneration failed: {str(e)}"
        )


@router.patch("/{job_id}/scenes/{scene_index}/edit")
async def edit_scene(
    job_id: str,
    scene_index: int,
    body: SceneEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Edit a scene's spec (manual or conversational mode).

    Manual mode: Direct field path modifications
    Conversational mode: LLM parses natural language prompt
    """
    from app.services.scene_editor import (
        apply_manual_changes,
        apply_conversational_changes,
        validate_scene_spec,
    )

    logger = get_logger("api.jobs")

    # Find the job
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get the spec
    spec = job.result_spec
    if not spec:
        raise HTTPException(status_code=400, detail="No spec available for this job")

    # Validate scene index
    scenes = spec.get("scenes", [])
    if scene_index < 0 or scene_index >= len(scenes):
        raise HTTPException(
            status_code=400,
            detail=f"Scene index {scene_index} out of range (0-{len(scenes)-1})"
        )

    scene_spec = scenes[scene_index]

    try:
        if body.mode == "manual":
            if not body.changes:
                raise HTTPException(status_code=400, detail="changes required for manual mode")
            # Apply manual changes
            apply_manual_changes(scene_spec, body.changes)
            explanation = f"Applied {len(body.changes)} manual changes"
        elif body.mode == "conversational":
            if not body.prompt:
                raise HTTPException(status_code=400, detail="Prompt is required for conversational mode")

            # Step 1: Save user message to history
            await save_message(
                db=db,
                job_id=job_id,
                user_id=current_user.id,
                role="user",
                content=body.prompt,
                metadata={"mode": "conversational"},
            )

            # Step 2: Get history for context
            history = await get_history(db, job_id, limit=15)

            # Step 3: Classify intent WITH history
            intent = await classify_intent(body.prompt, history=history)

            if intent == "query":
                # Answer without sending full spec
                answer = await answer_query(body.prompt, history=history)

                # Save AI response
                await save_message(
                    db=db,
                    job_id=job_id,
                    user_id=current_user.id,
                    role="assistant",
                    content=answer,
                    metadata={"intent": "query"},
                )

                return {
                    "success": True,
                    "intent": "query",
                    "answer": answer,
                    "changes_applied": False,
                    "warnings": [],
                }

            if intent == "recommend":
                # For now, treat as edit (future implementation)
                pass

            # intent == "edit" → proceed with editing flow WITH history
            scene_spec, explanation = await apply_conversational_changes(
                scene_spec, body.prompt, history=history
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid mode. Use 'manual' or 'conversational'")

        # Validate after edit
        warnings = validate_scene_spec(scene_spec)

        # Update the job
        scenes[scene_index] = scene_spec
        spec["scenes"] = scenes
        job.result_spec = spec
        flag_modified(job, "result_spec")
        db.commit()

        # Build applied changes list for response
        applied_changes = []
        if body.mode == "manual":
            for change in body.changes:
                applied_changes.append({
                    "field_path": change["field_path"],
                    "new_value": change["value"],
                })

        # Save AI response to history (conversational mode)
        if body.mode == "conversational":
            await save_message(
                db=db,
                job_id=job_id,
                user_id=current_user.id,
                role="assistant",
                content=explanation,
                metadata={"intent": "edit", "operations_count": len(applied_changes)},
            )

        return {
            "success": True,
            "intent": "edit",
            "explanation": explanation,
            "applied_changes": applied_changes,
            "warnings": warnings,
            "updated_scene": scene_spec,
            "changes_applied": True,
        }

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Invalid field path: {e}")
    except IndexError as e:
        raise HTTPException(status_code=400, detail=f"Invalid index in path: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error("Scene edit service unavailable for job %s, scene %d: %s", job_id, scene_index, e)
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Scene edit failed for job %s, scene %d: %s", job_id, scene_index, e)
        raise HTTPException(status_code=500, detail=f"Edit failed: {str(e)}")
