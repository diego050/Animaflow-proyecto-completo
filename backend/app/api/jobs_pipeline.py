from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
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
from app.core.scheduler import scheduler

# Service imports
from app.modules.pipeline.scene_manager import regenerate_single_scene_sync
from app.services.scene_editor import (
    apply_manual_changes,
    apply_conversational_changes,
    validate_scene_spec,
)
from app.services.context_manager import save_message, get_history
from app.services.intent_router import classify_intent, answer_query
from app.services.animation_store import save_generated_animation


router = APIRouter()
logger = get_logger("api.jobs")


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

    # CODE-GEN: los componentes son RESPONSIVOS (useVideoConfig width/height) → basta copiar el
    # spec y cambiar el aspect_ratio para que TODAS las escenas se adapten al nuevo formato.
    # Instantáneo, sin regenerar, sin gastar tokens. (Antes este endpoint no generaba nada → el
    # job quedaba "pending" vacío: ese era el bug.)
    import copy as _copy
    new_spec = _copy.deepcopy(job.result_spec)
    new_spec["aspect_ratio"] = data.aspect_ratio
    new_job.result_spec = new_spec
    new_job.status = "completed"
    flag_modified(new_job, "result_spec")
    db.commit()

    return {
        "message": f"Video reformateado a {data.aspect_ratio}",
        "new_job_id": new_job.id,
        "original_job_id": job.id,
        "aspect_ratio": data.aspect_ratio,
    }


@router.post("/{job_id}/render", response_model=JobResponse)
@limiter.limit("5/minute")
async def trigger_render(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger MP4 render on-demand. Only jobs in 'completed' status can be rendered."""
    logger = get_logger("api.jobs")

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

    # Only allow render from 'completed' status (enrichment finished, ready for preview)
    # Also allow re-render from 'completed' if user wants a fresh MP4
    if job.status not in ("completed",):
        raise HTTPException(
            status_code=400,
            detail=f"Job must be in 'completed' status to trigger render (current: {job.status})"
        )

    if job.status == "rendering":
        raise HTTPException(status_code=400, detail="Job is already rendering")

    # Set status to rendering and commit before starting the potentially long render
    job.status = "rendering"
    db.commit()

    try:
        # Directly invoke the render phase (same logic the scheduler used, but on-demand)
        await scheduler._phase_render(job_id)

        # Refresh job to get updated status/video_url from _phase_render
        db.refresh(job)

        return JobResponse(
            job_id=job.id,
            status=job.status,
            result_spec=job.result_spec,
            video_url=job.video_url,
            error_message=job.error_message,
        )
    except Exception as e:
        logger.exception("Render failed for job %s: %s", job_id, e)
        # Update job status on unexpected error
        job.status = "failed"
        job.error_message = f"Render failed: {str(e)}"
        db.commit()
        db.refresh(job)
        raise HTTPException(status_code=500, detail=f"Render failed: {str(e)}")


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

    # Escena CODE-GEN → editar el CÓDIGO con la instrucción del chat (surgical, estilo Cursor).
    # Usa la key del usuario resuelta por provider (generate_animation). NO pasa por el editor
    # de spec viejo del orquestador (que además fallaba con API_KEY_INVALID).
    if scene_spec.get("custom_code"):
        instruction = (body.prompt or "").strip()
        if not instruction:
            raise HTTPException(status_code=400, detail="Escribe qué quieres cambiar en la escena.")
        from app.modules.llm.animation_generator import generate_animation
        try:
            result = generate_animation(
                prompt="",
                user_id=current_user.id,
                aspect_ratio=spec.get("aspect_ratio", job.aspect_ratio or "9:16"),
                duration_seconds=scene_spec.get("duration_seconds", 6.0),
                previous_code=scene_spec["custom_code"],
                edit_instruction=instruction,
            )
        except Exception as e:  # noqa: BLE001
            logger.exception("Edición code-gen (chat) falló job %s escena %d", job_id, scene_index)
            raise HTTPException(status_code=500, detail=f"La edición falló: {e}")
        if not (result.get("valid") and result.get("code")):
            raise HTTPException(status_code=422, detail=f"La edición no salió válida: {result.get('errors')}")
        scene_spec["custom_code"] = result["code"]
        scenes[scene_index] = scene_spec
        spec["scenes"] = scenes
        job.result_spec = spec
        flag_modified(job, "result_spec")
        db.commit()
        save_generated_animation(
            code=result["code"], source="edit", job_id=job_id, scene_index=scene_index,
            user_id=current_user.id, prompt_text=scene_spec.get("text"), art_direction=instruction,
            model=result.get("model"), valid=True, status="edited", tokens=result.get("tokens"),
            duration_frames=result.get("duration_frames"), aspect_ratio=spec.get("aspect_ratio"),
        )
        return {
            "success": True,
            "intent": "edit",
            "explanation": f"Edité la escena {scene_index + 1} ({result.get('edit_mode')}).",
            "updated_scene": scene_spec,
            "changes_applied": True,
            "changes": result.get("changes", []),
            "warnings": [],
        }

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


class SceneCodeEditRequest(BaseModel):
    instruction: str = Field(min_length=2, max_length=500)


@router.post("/{job_id}/scenes/{scene_index}/edit-code")
async def edit_scene_code(
    job_id: str,
    scene_index: int,
    body: SceneCodeEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edición QUIRÚRGICA del componente code-gen de UNA escena con una instrucción en
    lenguaje natural ("haz el corazón más grande"). Actualiza el `custom_code` → el preview
    del editor se recompila en vivo. NO renderiza mp4 (el render es siempre on-demand).
    """
    logger = get_logger("api.jobs")
    job = db.query(JobModel).filter(
        JobModel.id == job_id, JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job o spec no encontrado")

    scenes = job.result_spec.get("scenes", [])
    if scene_index < 0 or scene_index >= len(scenes):
        raise HTTPException(status_code=400, detail="Índice de escena fuera de rango")

    scene = scenes[scene_index]
    current_code = scene.get("custom_code")
    if not current_code:
        raise HTTPException(
            status_code=400, detail="Esta escena no es code-gen (no tiene custom_code)."
        )

    from app.modules.llm.animation_generator import generate_animation
    try:
        result = generate_animation(
            prompt="",
            user_id=current_user.id,
            aspect_ratio=job.result_spec.get("aspect_ratio", job.aspect_ratio or "9:16"),
            duration_seconds=scene.get("duration_seconds", 6.0),
            previous_code=current_code,
            edit_instruction=body.instruction,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Edición code-gen falló (job %s, escena %d)", job_id, scene_index)
        raise HTTPException(status_code=500, detail=f"La edición falló: {e}")

    if not (result.get("valid") and result.get("code")):
        # No tocamos la escena: se queda el código anterior (el preview no cambia).
        raise HTTPException(
            status_code=422,
            detail=f"La edición no salió válida: {result.get('errors')}",
        )

    scene["custom_code"] = result["code"]
    scene["quality_status"] = "passed"
    flag_modified(job, "result_spec")
    db.commit()
    save_generated_animation(
        code=result["code"], source="edit", job_id=job_id, scene_index=scene_index,
        user_id=current_user.id, prompt_text=scene.get("text"), art_direction=body.instruction,
        model=result.get("model"), valid=True, status="edited", tokens=result.get("tokens"),
        duration_frames=result.get("duration_frames"),
        aspect_ratio=job.result_spec.get("aspect_ratio"),
    )
    logger.info("Escena %d editada con code-gen (job %s)", scene_index, job_id)
    return {"scene_index": scene_index, "custom_code": result["code"], "valid": True}


@router.post("/{job_id}/scenes/{scene_index}/regenerate-code")
async def regenerate_scene_code(
    job_id: str,
    scene_index: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """"Hazlo distinto": genera una versión NUEVA y con enfoque visual distinto del
    componente code-gen de la escena. Actualiza el `custom_code` → preview en vivo.
    NO renderiza mp4 (render on-demand).
    """
    logger = get_logger("api.jobs")
    job = db.query(JobModel).filter(
        JobModel.id == job_id, JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job o spec no encontrado")

    scenes = job.result_spec.get("scenes", [])
    if scene_index < 0 or scene_index >= len(scenes):
        raise HTTPException(status_code=400, detail="Índice de escena fuera de rango")

    scene = scenes[scene_index]
    if not scene.get("custom_code"):
        raise HTTPException(
            status_code=400, detail="Esta escena no es code-gen (no tiene custom_code)."
        )

    # Timestamps relativos a la escena (los almacenados son globales).
    scene_start = scene.get("start_time_seconds", 0.0) or 0.0
    rel_wts = [
        {
            "word": w.get("word", ""),
            "start": max(0.0, (w.get("start", 0) or 0) - scene_start),
            "end": max(0.0, (w.get("end", 0) or 0) - scene_start),
        }
        for w in (scene.get("word_timestamps") or [])
    ]

    from app.modules.llm.animation_generator import generate_scene_animation
    try:
        result = generate_scene_animation(
            text=scene.get("text", ""),
            duration_seconds=scene.get("duration_seconds", 6.0),
            word_timestamps=rel_wts,
            bg_hint=(scene.get("remotion_props") or {}).get("backgroundColor"),
            art_direction=scene.get("media_query"),
            user_id=current_user.id,
            aspect_ratio=job.result_spec.get("aspect_ratio", job.aspect_ratio or "9:16"),
            variation=True,
            scene_index=scene_index,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Regeneración code-gen falló (job %s, escena %d)", job_id, scene_index)
        raise HTTPException(status_code=500, detail=f"La regeneración falló: {e}")

    if not (result.get("valid") and result.get("code")):
        raise HTTPException(
            status_code=422, detail=f"La regeneración no salió válida: {result.get('errors')}"
        )

    scene["custom_code"] = result["code"]
    scene["quality_status"] = "passed"
    flag_modified(job, "result_spec")
    db.commit()
    save_generated_animation(
        code=result["code"], source="regenerate", job_id=job_id, scene_index=scene_index,
        user_id=current_user.id, prompt_text=scene.get("text"),
        art_direction=scene.get("media_query"), model=result.get("model"), valid=True,
        status="passed", tokens=result.get("tokens"),
        duration_frames=result.get("duration_frames"),
        aspect_ratio=job.result_spec.get("aspect_ratio"),
    )
    logger.info("Escena %d regenerada (hazlo distinto) en job %s", scene_index, job_id)
    return {"scene_index": scene_index, "custom_code": result["code"], "valid": True}


class SceneRevertRequest(BaseModel):
    version_id: str


@router.get("/{job_id}/scenes/{scene_index}/history")
async def scene_code_history(
    job_id: str,
    scene_index: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historial de versiones (checkpoints) del código de UNA escena, para deshacer/rehacer.
    Sale de `generated_animations` (cada generación/edición quedó guardada)."""
    from app.db.models import GeneratedAnimation
    job = db.query(JobModel).filter(
        JobModel.id == job_id, JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job o spec no encontrado")
    scenes = job.result_spec.get("scenes", [])
    current_code = scenes[scene_index].get("custom_code") if 0 <= scene_index < len(scenes) else None
    rows = (
        db.query(GeneratedAnimation)
        .filter(GeneratedAnimation.job_id == job_id, GeneratedAnimation.scene_index == scene_index)
        .order_by(GeneratedAnimation.created_at.desc())
        .limit(40)
        .all()
    )
    return {
        "scene_index": scene_index,
        "versions": [
            {
                "id": r.id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "source": r.source,        # pipeline | edit | regenerate
                "status": r.status,
                "is_current": bool(current_code) and r.code == current_code,
            }
            for r in rows
        ],
    }


@router.post("/{job_id}/scenes/{scene_index}/revert")
async def revert_scene_code(
    job_id: str,
    scene_index: int,
    body: SceneRevertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restaura una versión anterior del código de la escena (checkpoint). NO renderiza mp4."""
    from app.db.models import GeneratedAnimation
    job = db.query(JobModel).filter(
        JobModel.id == job_id, JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job o spec no encontrado")
    rec = (
        db.query(GeneratedAnimation)
        .filter(
            GeneratedAnimation.id == body.version_id,
            GeneratedAnimation.job_id == job_id,
            GeneratedAnimation.scene_index == scene_index,
        )
        .first()
    )
    if not rec or not rec.code:
        raise HTTPException(status_code=404, detail="Versión no encontrada")
    scenes = job.result_spec.get("scenes", [])
    if not (0 <= scene_index < len(scenes)):
        raise HTTPException(status_code=400, detail="Índice de escena fuera de rango")
    scenes[scene_index]["custom_code"] = rec.code
    job.result_spec["scenes"] = scenes
    flag_modified(job, "result_spec")
    db.commit()
    logger.info("Escena %d revertida a versión %s (job %s)", scene_index, body.version_id, job_id)
    return {"scene_index": scene_index, "custom_code": rec.code}


class SceneCodeRequest(BaseModel):
    custom_code: str = Field(min_length=1, max_length=200000)


@router.post("/{job_id}/scenes/{scene_index}/code")
async def set_scene_code(
    job_id: str,
    scene_index: int,
    body: SceneCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fija el custom_code de una escena (editor manual determinista del frontend). NO renderiza mp4."""
    job = db.query(JobModel).filter(
        JobModel.id == job_id, JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job o spec no encontrado")
    scenes = job.result_spec.get("scenes", [])
    if not (0 <= scene_index < len(scenes)):
        raise HTTPException(status_code=400, detail="Índice de escena fuera de rango")
    scenes[scene_index]["custom_code"] = body.custom_code
    job.result_spec["scenes"] = scenes
    flag_modified(job, "result_spec")
    db.commit()
    return {"scene_index": scene_index, "custom_code": body.custom_code}


class AssistantRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    focused_scene_index: Optional[int] = None


@router.post("/{job_id}/assistant")
async def assistant(
    job_id: str,
    body: AssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat GLOBAL de edición: entiende a qué escena(s) te refieres (del texto) y qué quieres
    (editar puntual / regenerar desde el guion / preguntar), y lo aplica. NO renderiza mp4."""
    from app.services.scene_assistant import parse_intent
    from app.modules.llm.animation_generator import generate_animation, generate_scene_animation

    job = db.query(JobModel).filter(
        JobModel.id == job_id, JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job o spec no encontrado")
    scenes = job.result_spec.get("scenes", [])
    if not scenes:
        raise HTTPException(status_code=400, detail="El video no tiene escenas.")
    aspect = job.result_spec.get("aspect_ratio") or job.aspect_ratio or "9:16"

    intent = parse_intent(body.prompt, scenes, body.focused_scene_index, current_user.id)
    targets = intent["scene_indices"] or [
        body.focused_scene_index if body.focused_scene_index is not None else 0
    ]
    action = intent["action"]
    instruction = intent["instruction"]

    if action == "query":
        return {"message": instruction, "intent": "query", "edited_scenes": []}

    edited: list[int] = []
    all_changes: list[dict] = []
    for i in targets:
        if not (0 <= i < len(scenes)):
            continue
        scene = scenes[i]
        try:
            if action == "regenerate" or not scene.get("custom_code"):
                scene_start = scene.get("start_time_seconds", 0.0) or 0.0
                rel_wts = [
                    {"word": w.get("word", ""),
                     "start": max(0.0, (w.get("start", 0) or 0) - scene_start),
                     "end": max(0.0, (w.get("end", 0) or 0) - scene_start)}
                    for w in (scene.get("word_timestamps") or [])
                ]
                result = generate_scene_animation(
                    text=scene.get("text", ""), duration_seconds=scene.get("duration_seconds", 6.0),
                    word_timestamps=rel_wts, bg_hint=(scene.get("remotion_props") or {}).get("backgroundColor"),
                    art_direction=scene.get("media_query"), user_id=current_user.id, aspect_ratio=aspect,
                    variation=True, scene_index=i,
                )
                src = "regenerate"
            else:
                result = generate_animation(
                    prompt="", user_id=current_user.id, aspect_ratio=aspect,
                    duration_seconds=scene.get("duration_seconds", 6.0),
                    previous_code=scene["custom_code"], edit_instruction=instruction,
                )
                src = "edit"
        except Exception:  # noqa: BLE001
            logger.exception("Asistente: falló escena %d (job %s)", i, job_id)
            continue
        if result.get("valid") and result.get("code"):
            scene["custom_code"] = result["code"]
            scenes[i] = scene
            edited.append(i)
            for ch in (result.get("changes") or []):
                all_changes.append({"scene": i + 1, "before": ch.get("before"), "after": ch.get("after")})
            save_generated_animation(
                code=result["code"], source=src, job_id=job_id, scene_index=i,
                user_id=current_user.id, prompt_text=scene.get("text"), art_direction=instruction,
                model=result.get("model"), valid=True, status="edited", tokens=result.get("tokens"),
                duration_frames=result.get("duration_frames"), aspect_ratio=aspect,
            )

    job.result_spec["scenes"] = scenes
    flag_modified(job, "result_spec")
    db.commit()

    if edited:
        nums = ", ".join(str(i + 1) for i in edited)
        verb = "Regeneré" if action == "regenerate" else "Edité"
        detail = f" ({len(all_changes)} cambio(s))" if all_changes else ""
        message = f"{verb} la escena {nums}{detail}."
    else:
        message = "No pude aplicar el cambio (no salió válido). Sé más específico o intenta de nuevo."
    return {
        "message": message,
        "intent": action,
        "edited_scenes": edited,
        "changes": all_changes,
        "updated_spec": job.result_spec,
    }


@router.get("/{job_id}/formats")
async def get_job_formats(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all aspect ratio variations (reformats) for a given job.

    Finds the root job (either the job itself or its parent), then returns
    all sibling reformats including the root. Each entry includes an
    `is_current` flag to identify the requested job.
    """
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Determine the root job
    root_job_id = job.parent_job_id if job.parent_job_id else job.id

    # Fetch root job and all its children (reformats)
    related_jobs = db.query(JobModel).filter(
        JobModel.user_id == current_user.id,
        (JobModel.id == root_job_id) | (JobModel.parent_job_id == root_job_id),
    ).order_by(JobModel.created_at).all()

    return [
        {
            "job_id": j.id,
            "aspect_ratio": j.aspect_ratio,
            "status": j.status,
            "name": (j.result_spec or {}).get("name") if j.result_spec else None,
            "is_current": j.id == job_id,
        }
        for j in related_jobs
    ]


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retry a failed job from the point of failure.

    Determines which pipeline phase failed based on the job's status
    and resets it to the appropriate retry state for re-processing.
    """
    logger = get_logger("api.jobs")

    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in ("failed", "failed_render"):
        raise HTTPException(
            status_code=400,
            detail=f"Job must be in 'failed' or 'failed_render' status to retry (current: {job.status})"
        )

    # Determine which phase failed and reset accordingly
    if job.status == "failed_render":
        # Render failed — reset to completed so user can trigger render again
        job.status = "completed"
        job.error_message = None
        logger.info("Job %s retry: resetting to completed for re-render", job_id)
    elif job.status == "failed":
        # Check if we have a result_spec with scenes (enrichment phase)
        spec = job.result_spec or {}
        scenes = spec.get("scenes", [])

        if scenes and any(s.get("anima_composer") for s in scenes):
            # Enrichment partially or fully completed — reset to completed
            # (some scenes may have failed, but user can regenerate individually)
            job.status = "completed"
            job.error_message = None
            logger.info("Job %s retry: enrichment partially done, resetting to completed", job_id)
        elif spec.get("scenes"):
            # Scenes exist but not enriched — reset to segmented for re-approval
            # Reset scene states
            for scene in scenes:
                scene["audio_url"] = None
                scene["word_timestamps"] = []
                scene["type"] = "pending"
                scene["anima_composer"] = None
                scene["quality_status"] = None
            spec["scenes"] = scenes
            spec["approved"] = False
            job.result_spec = spec
            flag_modified(job, "result_spec")
            job.status = "segmented"
            job.error_message = None
            logger.info("Job %s retry: resetting to segmented for re-approval", job_id)
        else:
            # No scenes yet — reset to pending for re-segmentation
            job.status = "pending"
            job.error_message = None
            logger.info("Job %s retry: resetting to pending for re-segmentation", job_id)

    db.commit()
    db.refresh(job)

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
        error_message=job.error_message,
    )
