import json
import os
import subprocess
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, get_db_context
from app.db.models import JobModel
from app.core.logging import get_logger

logger = get_logger("remotion")


def render_video_pipeline(job_id: str):
    """Ejecuta el renderizado de video con Remotion CLI."""
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job or not job.result_spec:
            return

        try:
            job.status = "rendering"
            db.commit()

            # Remotion necesita un JSON string como --props
            spec_json = json.dumps({"spec": job.result_spec})

            # Directorios
            backend_dir = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../..")
            )
            frontend_dir = os.path.join(backend_dir, "frontend")
            output_dir = os.path.join(backend_dir, "storage", "videos")
            os.makedirs(output_dir, exist_ok=True)

            output_file = os.path.join(output_dir, f"{job_id}.mp4")

            # Comando para Remotion CLI
            logger.info("Iniciando Renderizado MP4 con Remotion CLI...", extra={"job_id": job_id})
            npx_cmd = "npx.cmd" if os.name == "nt" else "npx"
            cmd = [
                npx_cmd,
                "remotion",
                "render",
                "src/remotion/Root.tsx",
                "AnimaFlow-Main",
                output_file,
                f"--props={spec_json}",
            ]

            result = subprocess.run(
                cmd,
                cwd=frontend_dir,
                capture_output=True,
                text=True,
                encoding="utf-8",
                env=os.environ.copy(),
            )

            if result.returncode != 0:
                logger.error("Error en Render: %s", result.stderr, extra={"job_id": job_id})
                raise subprocess.SubprocessError(f"Remotion CLI falló: {result.stderr}")

            logger.info("Render exitoso -> %s", output_file, extra={"job_id": job_id})

            job.status = "completed_video"
            # Video served via FastAPI StaticFiles mount at /videos/
            job.video_url = f"/videos/{job_id}.mp4"
            db.commit()
        except (subprocess.SubprocessError, OSError) as e:
            logger.error("Excepción renderizando: %s", e, extra={"job_id": job_id})
            job.status = f"failed_render: {str(e)}"
            db.commit()
        except Exception as e:
            # Fallback: mark render as failed on any unexpected error
            logger.exception("Excepción renderizando: %s", e, extra={"job_id": job_id})
            job.status = f"failed_render: {str(e)}"
            db.commit()
