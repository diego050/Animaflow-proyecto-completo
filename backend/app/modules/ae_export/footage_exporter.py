"""Export de FOOTAGE para After Effects.

Renderiza CADA escena code-gen a ProRes (.mov) vía el render-server y las empaqueta
en un zip (una escena por archivo → cada una es una capa editable en AE). Reemplaza el
.jsx por-componente del orquestador (que no aplica a escenas code-gen).

Reusa los campos `_ae_export_*` del spec para que el frontend (trigger/status/download)
funcione SIN cambios.
"""
import os
import zipfile
from datetime import timedelta
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import create_access_token
from app.core.storage_paths import get_storage_dir
from app.db.session import get_db_context
from app.db.models import JobModel
from app.modules.ae_export.job_utils import _persist_job_spec, get_resolution

logger = get_logger("ae_footage")

_FPS = 30

_README = """FOOTAGE PARA AFTER EFFECTS - AnimaFlow
=========================================

Tienes una escena por archivo (ProRes .mov, una capa por escena). Para usarlas en AE:

1. Importa los .mov (Archivo > Importar > Varios archivos).
2. Arrastralos a una composicion EN ORDEN (scene_01, scene_02, ...), uno tras otro en
   la timeline. Cada escena es una capa que puedes recortar, retimear o reemplazar.
3. Cada .mov YA INCLUYE la voz de esa escena (pista de audio). Si no la quieres, silencia
   o borra el audio de la capa en AE.

Nota: el footage es un render fiel del preview (no editable por elemento, es video).
Puedes componer, recolorear y poner capas encima. ~80% hecho; el resto lo ajustas tu.
"""


def generate_footage_export_async(job_id: str, force: bool = False):
    """Renderiza cada escena a ProRes y arma el zip. Pensado para correr en background
    (asyncio.to_thread) — actualiza `_ae_export_*` para el polling del frontend."""
    with get_db_context() as db:
        try:
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if not job or not job.result_spec:
                logger.warning("Job %s no encontrado o sin spec", job_id)
                return

            scenes = job.result_spec.get("scenes", [])
            aspect_ratio = job.result_spec.get("aspect_ratio", job.aspect_ratio or "9:16")
            w, h = get_resolution(aspect_ratio)

            job.result_spec["_ae_export_status"] = "generating"
            job.result_spec["_ae_export_progress"] = {"current": 0, "total": len(scenes)}
            _persist_job_spec(job_id, job.result_spec)

            # Token de servicio efímero para que el render-server baje el audio de /api/audio.
            render_token = create_access_token(
                {"sub": str(job.user_id)}, expires_delta=timedelta(minutes=60)
            )
            api_base = os.getenv("API_BASE_URL", "http://api:8000")

            videos_dir = get_storage_dir("videos")
            mov_paths: list[tuple[int, str]] = []
            with httpx.Client(timeout=600.0) as client:
                for i, scene in enumerate(scenes):
                    code = scene.get("custom_code")
                    if not code:
                        logger.warning("Escena %d sin custom_code; se omite del footage", i + 1)
                    else:
                        duration_frames = max(1, round(scene.get("duration_seconds", 3.0) * _FPS))
                        out_name = f"{job_id}_footage_{i:02d}"
                        # URL absoluta del audio de la escena, con token (para incluir la voz).
                        audio_src = ""
                        audio_url = scene.get("audio_url")
                        if audio_url and audio_url.startswith("/"):
                            audio_src = f"{api_base}{audio_url}?token={quote(render_token)}"
                        resp = client.post(
                            f"{settings.RENDER_SERVER_URL}/render",
                            json={
                                "jobId": out_name,
                                "compositionId": "CustomCodeAudio",
                                "codec": "prores",
                                "outputName": out_name,
                                "inputProps": {
                                    "code": code,
                                    "audioSrc": audio_src,
                                    "durationInFrames": duration_frames,
                                    "width": w,
                                    "height": h,
                                },
                            },
                        )
                        resp.raise_for_status()
                        data = resp.json()
                        mov = data.get("file") or os.path.join(videos_dir, f"{out_name}.mov")
                        mov_paths.append((i, mov))

                    job.result_spec["_ae_export_progress"] = {"current": i + 1, "total": len(scenes)}
                    _persist_job_spec(job_id, job.result_spec)

            if not mov_paths:
                raise RuntimeError("Ninguna escena tenia custom_code para renderizar a footage.")

            export_dir = get_storage_dir("exports")
            os.makedirs(export_dir, exist_ok=True)
            zip_filename = f"{job_id}_footage_ae.zip"
            zip_path = os.path.join(export_dir, zip_filename)
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("LEEME.txt", _README)
                for idx, mov in mov_paths:
                    if mov and os.path.exists(mov):
                        zf.write(mov, f"scene_{idx + 1:02d}.mov")
                    else:
                        logger.warning("Footage escena %d no encontrado en disco: %s", idx + 1, mov)

            job.result_spec["_ae_export_status"] = "completed"
            job.result_spec["_ae_export_zip_path"] = zip_path
            job.result_spec["_ae_export_filename"] = zip_filename
            _persist_job_spec(job_id, job.result_spec)
            logger.info("Footage AE listo (job %s): %s (%d escenas)", job_id, zip_path, len(mov_paths))

        except Exception as e:  # noqa: BLE001
            logger.exception("Footage AE export fallo para job %s", job_id)
            try:
                job2 = db.query(JobModel).filter(JobModel.id == job_id).first()
                if job2 and job2.result_spec:
                    job2.result_spec["_ae_export_status"] = f"failed: {e}"
                    _persist_job_spec(job_id, job2.result_spec)
            except Exception:  # noqa: BLE001
                pass
