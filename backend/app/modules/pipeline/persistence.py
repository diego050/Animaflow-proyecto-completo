from app.schemas.spec import TimelineSpec


def persist_job_spec(job, timeline_scenes: list[dict], aspect_ratio: str):
    """Valida y persiste el spec generado en el job."""
    final_spec = {"scenes": timeline_scenes, "aspect_ratio": aspect_ratio}
    spec_obj = TimelineSpec(**final_spec)
    job.result_spec = spec_obj.model_dump()
