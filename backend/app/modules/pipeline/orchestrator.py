import os
import shutil
import asyncio
import copy
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, get_db_context
from app.db.models import JobModel, ApiKey
from app.schemas.spec import TimelineSpec
from app.core.logging import get_logger
from sqlalchemy.orm.attributes import flag_modified

logger = get_logger("pipeline")

from ..tts.service import generate_tts_with_timestamps, AUDIO_STORAGE
from ..segmentation.service import split_text_into_chunks
from ..llm.visual_spec import generate_batch_visuals_with_llm, VisualSpecResult
from ..llm.component_strategy import generate_scene_composer
from ..remotion.scene_renderer import render_single_scene, SCENES_STORAGE
from ..video.concat import concat_scenes, VIDEOS_STORAGE


def _get_user_api_key(user_id: str, provider: str, db: Session) -> Optional[str]:
    """Look up user's stored API key for a given provider."""
    key_entry = db.query(ApiKey).filter(
        ApiKey.user_id == user_id,
        ApiKey.provider == provider,
        ApiKey.is_active == True,
    ).first()
    return key_entry.api_key if key_entry else None


def run_pipeline_approved(job_id: str, user_id: Optional[str] = None):
    """Fase 2+3: Enriquecimiento y renderizado sincrónico (backward-compatible wrapper).
    
    Llama a run_pipeline_enrichment y luego renderiza cada escena.
    Útil para tests y flujos sincrónicos; en producción el scheduler maneja
    el renderizado vía SSE.
    """
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            logger.warning("Job %s not found in approved pipeline", job_id)
            return

        if job.status not in ["segmented", "pending"]:
            logger.warning(
                "Job %s is in status '%s', expected 'segmented' or 'pending'",
                job_id, job.status,
            )
            return

        # Phase 2: Enrichment (reutiliza la función existente)
        run_pipeline_enrichment(
            job_id=job_id,
            user_id=user_id,
        )
        db.refresh(job)

        if job.status != "queued_render":
            return

        # Phase 3: Render sincrónico
        try:
            spec = job.result_spec
            if not spec or not spec.get("scenes"):
                job.status = "failed"
                job.error_message = "No scenes to render"
                db.commit()
                return

            timeline_scenes = spec["scenes"]
            aspect_ratio = spec.get("aspect_ratio", "9:16")

            # TODO(dead-code): This block calls render_single_scene with wrong arguments.
            # The function signature expects (job_id, scene_index, duration_seconds, scene_text,
            # component_name, ...) but here we pass (job_id, i, scene, aspect_ratio, user_id).
            # The enrichment pipeline now stores anima_composer in each scene and renders on-demand.
            # Kept for reference; remove once the on-demand render path is fully validated.
            # video_paths = []
            # for i, scene in enumerate(timeline_scenes):
            #     video_path = render_single_scene(
            #         job_id, i, scene, aspect_ratio, user_id
            #     )
            #     video_paths.append(video_path)
            #
            # output_path = concat_scenes(video_paths, job_id, user_id)
            # job.video_url = output_path
            # job.status = "completed"
            # db.commit()

        except Exception as e:
            logger.exception(
                "Approved pipeline render failed: %s", e,
                extra={"job_id": job_id},
            )
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


async def _process_chunks_async(
    job_id: str,
    timeline_scenes: list[dict],
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    llm_model: str = "gemini-2.0-flash",
    db: Session = None,
) -> list[dict]:
    # Fase 2: Ya no generamos TTS aquí, solo llamamos a decide_and_generate_component con los timestamps
    previous_scene_tsx = None
    for i, scene in enumerate(timeline_scenes):
        visual_spec = VisualSpecResult(
            media_query=scene.get("media_query", ""),
            backgroundColor=scene.get("remotion_props", {}).get("backgroundColor", "#0f172a"),
            textColor=scene.get("remotion_props", {}).get("textColor", "#38bdf8"),
        )
        
        logger.info("Deciding component strategy for scene %d...", i + 1, extra={"job_id": job_id})
        
        from app.modules.llm.resolver import resolve_llm_credentials
        
        try:
            creds = resolve_llm_credentials(user_id, provider_override="gemini")
            api_key = creds.api_key
            model_to_use = creds.model
        except Exception:
            gemini_api_key = _get_user_api_key(user_id, "gemini", SessionLocal())
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or ""
            model_to_use = llm_model
        
        composer_spec = generate_scene_composer(
            text=scene.get("text", ""),
            media_query=scene.get("media_query", ""),
            api_key=api_key,
            model=model_to_use,
            db=db,
            aspect_ratio=aspect_ratio,
        )
        
        scene["type"] = "custom"
        scene["quality_status"] = "passed"
        scene["anima_composer"] = composer_spec.model_dump(exclude_none=True)
        
        # Pausa para evitar límites de RPM (Requests Per Minute) del plan gratuito de Gemini
        if i < len(timeline_scenes) - 1:
            await asyncio.sleep(4)
            
    return timeline_scenes


async def _regenerate_components_for_reformat(
    job_id: str,
    timeline_scenes: list[dict],
    aspect_ratio: str,
    user_id: Optional[str] = None,
    scene_indices: Optional[list[int]] = None,
    llm_model: str = "gemini-2.0-flash",
    db: Session = None,
) -> list[dict]:
    """Regenerate Remotion components for specified scenes with a new aspect ratio.
    If scene_indices is None, regenerate all scenes.
    """
    indices = scene_indices if scene_indices is not None else range(len(timeline_scenes))
    for i in indices:
        if i < 0 or i >= len(timeline_scenes):
            continue
        scene = timeline_scenes[i]
        remotion_props = scene.get("remotion_props") or {}
        visual_spec = VisualSpecResult(
            media_query=scene.get("media_query", ""),
            backgroundColor=remotion_props.get("backgroundColor", "#0f172a"),
            textColor=remotion_props.get("textColor", "#38bdf8"),
        )
        from app.modules.llm.resolver import resolve_llm_credentials
        
        try:
            creds = resolve_llm_credentials(user_id, provider_override="gemini")
            api_key = creds.api_key
            model_to_use = creds.model
        except Exception:
            gemini_api_key = _get_user_api_key(user_id, "gemini", SessionLocal())
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or ""
            model_to_use = llm_model
        
        composer_spec = generate_scene_composer(
            text=scene.get("text", ""),
            media_query=scene.get("media_query", ""),
            api_key=api_key,
            model=model_to_use,
            db=db,
            aspect_ratio=aspect_ratio,
        )
        
        scene["type"] = "custom"
        scene["quality_status"] = "passed"
        scene["anima_composer"] = composer_spec.model_dump(exclude_none=True)
    return timeline_scenes


def run_pipeline(
    job_id: str,
    script_text: str,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    tts_provider: str = "local_piper",
    tts_voice_id: str = "es_ES-carlfm-x_low",
    tts_api_key: Optional[str] = None,
    reformatted_from: Optional[str] = None,
    scenes_to_reformat: Optional[dict] = None,
    scenes: Optional[list[dict]] = None,
    design_md: Optional[str] = None,
    system_prompt: Optional[str] = None,
    animation_only: bool = False,
):
    """Fase 1: TTS global, segmentación por timestamps, y prompts visuales."""
    from pydub import AudioSegment
    from app.modules.segmentation.timestamp_splitter import split_by_timestamps

    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            return

        job.aspect_ratio = aspect_ratio
        db.commit()

        # Handle reformatting: reuse existing spec but regenerate visuals for new ratio
        if reformatted_from:
            original = db.query(JobModel).filter(JobModel.id == reformatted_from).first()
            if original and original.result_spec:
                spec = copy.deepcopy(original.result_spec)
                spec["aspect_ratio"] = aspect_ratio
                timeline_scenes = spec.get("scenes", [])
                if timeline_scenes:
                    indices = scenes_to_reformat.get("indices") if scenes_to_reformat else None
                    asyncio.run(_regenerate_components_for_reformat(job_id, timeline_scenes, aspect_ratio, user_id, indices, job.llm_model or "gemini-2.0-flash", db=db))
                spec_obj = TimelineSpec(**spec)
                job.result_spec = spec_obj.model_dump()
                flag_modified(job, "result_spec")
                job.status = "completed"
                db.commit()
                return

        try:
            job.status = "segmenting"
            db.commit()

            groq_api_key = _get_user_api_key(user_id, "groq", db) if user_id else None
            tts_key = tts_api_key or (_get_user_api_key(user_id, tts_provider, db) if user_id else None)

            # 1. SPLIT TEXT FIRST, THEN GENERATE TTS PER SCENE
            if not animation_only and not scenes:
                chunks = split_text_into_chunks(script_text)
                GAP_MS = 300  # 300ms gap between scenes
                
                logger.info("Generating per-scene TTS for %d scenes (job %s)...", len(chunks), job_id)
                
                scene_audios = []
                all_word_timestamps = []
                current_offset = 0.0
                
                for i, chunk in enumerate(chunks):
                    logger.info("  Scene %d/%d: generating TTS...", i + 1, len(chunks))
                    try:
                        tts_result = asyncio.run(
                            generate_tts_with_timestamps(
                                text=chunk,
                                provider_name=tts_provider,
                                voice_id=tts_voice_id,
                                api_key=tts_key,
                                language="es",
                                groq_api_key=groq_api_key,
                            )
                        )
                        
                        # Offset timestamps by current position in combined timeline
                        scene_wts = []
                        for wt in tts_result.get("word_timestamps", []):
                            offset_wt = {
                                "word": wt["word"],
                                "start": round(wt["start"] + current_offset, 3),
                                "end": round(wt["end"] + current_offset, 3),
                            }
                            scene_wts.append(offset_wt)
                            all_word_timestamps.append(offset_wt)
                        
                        scene_audios.append({
                            "path": tts_result["audio_path"],
                            "duration": tts_result["duration_seconds"],
                            "word_timestamps": scene_wts,
                        })
                        
                        current_offset += tts_result["duration_seconds"] + (GAP_MS / 1000)
                    except Exception as e:
                        logger.warning("TTS failed for scene %d: %s. Using silent placeholder.", i + 1, e)
                        scene_audios.append({
                            "path": None,
                            "duration": max(3.0, len(chunk.split()) / 2.17),
                            "word_timestamps": [],
                        })
                        current_offset += scene_audios[-1]["duration"] + (GAP_MS / 1000)
                
                # 2. Build scenes_data with contiguous timing
                scenes_data = []
                current_start = 0.0
                
                for i, scene_audio in enumerate(scene_audios):
                    chunk = chunks[i]
                    scene_wts = scene_audio["word_timestamps"]
                    scene_duration = scene_audio["duration"]
                    
                    # Calculate end time: last word end + buffer, or full duration
                    last_word_end_relative = scene_wts[-1]["end"] - current_start if scene_wts else 0
                    core_end = current_start + last_word_end_relative
                    
                    if i == len(chunks) - 1:
                        # Last scene: generous buffer to end
                        end_time = core_end + 1.5
                    else:
                        # Not last: buffer but respect next scene start
                        next_scene_start = current_start + scene_duration + (GAP_MS / 1000)
                        end_time = core_end + 1.2
                        
                        if end_time > next_scene_start:
                            gap = next_scene_start - core_end
                            if gap < 0.3:
                                end_time = core_end + (gap / 2)
                            else:
                                end_time = core_end + 0.3
                    
                    scenes_data.append({
                        "text": chunk,
                        "start_time_seconds": round(current_start, 3),
                        "end_time_seconds": round(end_time, 3),
                        "duration_seconds": round(end_time - current_start, 3),
                        "word_timestamps": scene_wts,
                    })
                    
                    current_start = next_scene_start if i < len(chunks) - 1 else end_time
                
                # 3. Save per-scene audio files (copy from TTS output)
                os.makedirs(AUDIO_STORAGE, exist_ok=True)
                for i, scene_audio in enumerate(scene_audios):
                    src_path = scene_audio["path"]
                    if src_path and os.path.exists(src_path):
                        ext = os.path.splitext(src_path)[1] or ".mp3"
                        chunk_name = f"{job_id}_{i}{ext}"
                        chunk_path = os.path.join(AUDIO_STORAGE, chunk_name)
                        shutil.copy2(src_path, chunk_path)
                        scenes_data[i]["audio_url"] = f"/api/audio/{chunk_name}"
                    else:
                        scenes_data[i]["audio_url"] = f"/api/audio/mock_{job_id}_{i}.mp3"
                
                logger.info("Per-scene TTS complete: %d scenes, %d total words", len(scenes_data), len(all_word_timestamps))
            else:
                # Flujo animation_only o scenes provistas manualmente
                chunks = [s["text"] for s in scenes] if scenes else split_text_into_chunks(script_text)
                scenes_data = []
                current_start = 0.0
                for chunk in chunks:
                    duration = max(3.0, len(chunk.split()) / 2.17)
                    scenes_data.append({
                        "text": chunk,
                        "start_time_seconds": current_start,
                        "duration_seconds": duration,
                        "word_timestamps": [],
                        "audio_url": None
                    })
                    current_start += duration

            # 3. Generar visuales con LLM (Ya conocemos las duraciones exactas)
            logger.info("Generating batch visual prompts for %d scenes...", len(chunks))
            batch_visuals = generate_batch_visuals_with_llm(
                chunks, aspect_ratio, user_id, design_md=design_md, system_prompt=system_prompt, llm_model_override=job.llm_model
            )

            # 4. Armar spec preliminar
            preliminary_scenes = []
            for i, s_data in enumerate(scenes_data):
                visual = batch_visuals.scenes[i] if i < len(batch_visuals.scenes) else None
                preliminary_scenes.append({
                    "start_time_seconds": round(s_data["start_time_seconds"], 2),
                    "duration_seconds": round(s_data["duration_seconds"], 2),
                    "text": s_data["text"],
                    "type": "pending",
                    "media_query": visual.media_query if visual else "",
                    "remotion_props": {
                        "backgroundColor": visual.backgroundColor if visual else "#0f172a",
                        "textColor": visual.textColor if visual else "#38bdf8",
                    },
                    "sfx": [],
                    "audio_url": s_data["audio_url"],
                    "word_timestamps": s_data["word_timestamps"],
                    "ae_script_code": None,
                })

            # Save preliminary spec and pause for user approval
            preliminary_spec = {
                "scenes": preliminary_scenes,
                "aspect_ratio": aspect_ratio,
                "user_scenes": scenes,
                "design_md": design_md,
                "system_prompt": system_prompt,
                "animation_only": animation_only,
            }
            job.result_spec = preliminary_spec
            flag_modified(job, "result_spec")
            job.status = "segmented"
            db.commit()

            logger.info("Job %s paused at 'segmented' status awaiting user approval", job_id)

        except Exception as e:
            logger.exception("Pipeline segmentation failed: %s", e, extra={"job_id": job_id})
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


def run_pipeline_enrichment(
    job_id: str,
    user_id: Optional[str] = None,
    tts_provider: str = "local_piper",
    tts_voice_id: str = "es_ES-carlfm-x_low",
    tts_api_key: Optional[str] = None,
    design_md: Optional[str] = None,
    system_prompt: Optional[str] = None,
):
    """Fase 2: Genera visuals, TTS y componentes tras aprobación de escenas."""
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            return

        if job.status not in ["segmented", "visuals_generating", "pending"]:
            logger.warning(
                "Job %s is not in 'segmented' or 'visuals_generating' status (current: %s), skipping approval pipeline",
                job_id,
                job.status,
                extra={"job_id": job_id},
            )
            return

        aspect_ratio = job.aspect_ratio or "9:16"
        spec = job.result_spec or {}
        scenes = spec.get("scenes", [])
        if not scenes:
            logger.error("Job %s has no scenes to process", job_id, extra={"job_id": job_id})
            job.status = "failed"
            job.error_message = "No scenes found for approved pipeline"
            db.commit()
            return

        chunks = [scene["text"] for scene in scenes]
        user_scenes = spec.get("user_scenes")  # preserved from initial creation if provided
        design_md = design_md or spec.get("design_md")
        system_prompt = system_prompt or spec.get("system_prompt")
        animation_only = spec.get("animation_only", False)

        # Si no se proporcionó API key explícita, intentar buscarla en DB
        if tts_api_key is None and user_id is not None:
            tts_api_key = _get_user_api_key(user_id, tts_provider, db)
            
        groq_api_key = None
        if user_id is not None:
            groq_api_key = _get_user_api_key(user_id, "groq", db)

        try:
            # (Visuals were already generated in phase 1 and approved by the user)

            # Estado 3: Procesando escenas (TTS + TSX)
            job.status = "processing_scenes"
            db.commit()

            timeline_scenes = asyncio.run(
                _process_chunks_async(
                    job_id=job_id,
                    timeline_scenes=scenes,
                    aspect_ratio=aspect_ratio,
                    user_id=user_id,
                    llm_model=job.llm_model or "gemini-2.0-flash",
                    db=db,
                )
            )

            # Limpiar archivos TSX de jobs anteriores para evitar errores de compilación
            # No more TSX files to cleanup
            # Regenerar index.ts sin los archivos eliminados (ya no es necesario)

            # Fase 2 finalizada, se queda en el preview. El MP4 se renderiza a demanda.
            final_spec = {"scenes": timeline_scenes, "aspect_ratio": aspect_ratio}
            job.result_spec = final_spec
            flag_modified(job, "result_spec")
            job.status = "completed"
            db.commit()

        except Exception as e:
            # Fallback: mark job as failed on any unexpected pipeline error
            logger.exception(
                "Approved pipeline failed unexpectedly: %s", e, extra={"job_id": job_id}
            )
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


