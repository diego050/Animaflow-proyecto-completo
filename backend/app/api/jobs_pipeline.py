from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.schemas.job import (
    JobResponse,
    SceneRegenerateRequest,
    SceneApprovalRequest,
    SceneEditRequest,
    JobReformatRequest,
)
from app.db.session import get_db
from app.db.models import JobModel, User
from app.core.logging import get_logger
from app.core.security import get_current_user
from app.core.limiter import limiter
from app.api.deps import get_job_or_404

# Service imports
from app.modules.pipeline.scene_manager import regenerate_single_scene_sync
from app.services.scene_editor import (
    apply_manual_changes,
    apply_conversational_changes,
    validate_scene_spec,
)
from app.services.context_manager import save_message, get_history
from app.services.intent_router import classify_intent, answer_query


router = APIRouter()


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


@router.post("/{job_id}/reformat")
async def reformat_job(
    job_id: str,
    data: JobReformatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reformat a job to a new aspect ratio with scene selection."""
    job = get_job_or_404(db, job_id, current_user.id)

    if not job.result_spec or not job.result_spec.get("scenes"):
        raise HTTPException(status_code=400, detail="Job must be completed before reformatting")

    scenes = job.result_spec["scenes"]

    # Validate scene indices
    if data.scene_selection == "selected":
        if not data.scene_indices:
            raise HTTPException(status_code=400, detail="scene_indices required when scene_selection='selected'")
        for idx in data.scene_indices:
            if idx < 0 or idx >= len(scenes):
                raise HTTPException(status_code=400, detail=f"Invalid scene index: {idx}")

    if data.scene_selection == "current":
        if data.current_scene_index is None:
            raise HTTPException(status_code=400, detail="current_scene_index required when scene_selection='current'")
        if data.current_scene_index < 0 or data.current_scene_index >= len(scenes):
            raise HTTPException(status_code=400, detail=f"Invalid current_scene_index: {data.current_scene_index}")

    # Create new job
    new_job = JobModel(
        script_text=job.script_text,
        aspect_ratio=data.aspect_ratio,
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
        "selection": data.scene_selection,
        "indices": data.scene_indices if data.scene_selection == "selected" else
                   [data.current_scene_index] if data.scene_selection == "current" else
                   list(range(len(scenes)))
    }

    return {
        "message": "Reformat job created",
        "new_job_id": new_job.id,
        "original_job_id": job.id,
        "aspect_ratio": data.aspect_ratio,
        "scene_selection": data.scene_selection,
        "scenes_to_reformat": scenes_to_reformat["indices"],
    }


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
