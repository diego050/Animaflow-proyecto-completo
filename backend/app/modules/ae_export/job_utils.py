"""Helpers compartidos del export (resolución + persistencia del spec).

Extraídos del antiguo `worker.py` (export AE por .jsx, archivado) porque el
`footage_exporter` y `exports.py` los siguen necesitando.
"""
from typing import Tuple

from sqlalchemy.orm.attributes import flag_modified

from app.db.models import JobModel
from app.db.session import get_db_context
from app.core.logging import get_logger

logger = get_logger("ae_export")

ASPECT_RATIOS = {
    "9:16": (1080, 1920),
    "4:5": (1080, 1350),
    "3:4": (1080, 1440),
    "1:1": (1080, 1080),
    "16:9": (1920, 1080),
}
DEFAULT_ASPECT_RATIO = "9:16"


def get_resolution(aspect_ratio: str) -> Tuple[int, int]:
    return ASPECT_RATIOS.get(aspect_ratio, ASPECT_RATIOS[DEFAULT_ASPECT_RATIO])


def _persist_job_spec(job_id: str, spec_dict: dict):
    """Persiste job.result_spec con flag_modified (notifica a SQLAlchemy el cambio JSON)."""
    try:
        with get_db_context() as db:
            job = db.query(JobModel).filter(JobModel.id == job_id).first()
            if not job:
                logger.error("Job %s not found for result_spec persistence", job_id)
                raise ValueError(f"Job {job_id} not found")
            job.result_spec = spec_dict
            flag_modified(job, "result_spec")
            db.commit()
            logger.info("result_spec persisted for job %s", job_id)
    except Exception as e:
        logger.exception("Failed to persist result_spec for job %s: %s", job_id, e)
        raise
