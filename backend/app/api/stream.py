import asyncio
import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from app.db.session import SessionLocal
from app.db.models import JobModel, User
from app.core.security import get_current_user_from_token

router = APIRouter()

@router.get("/{job_id}/stream")
async def job_stream(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user_from_token),
):
    """
    Server-Sent Events (SSE) endpoint to stream job progress.
    Uses polling with 5-second intervals for real-time updates.
    """
    async def event_generator():
        heartbeat_counter = 0
        last_status = None

        try:
            while True:
                if await request.is_disconnected():
                    break

                # Create a fresh DB session for each poll iteration
                with SessionLocal() as session:
                    job = session.query(JobModel).filter(
                        JobModel.id == job_id,
                        JobModel.user_id == current_user.id,
                    ).first()

                    if not job:
                        data = {"error": "Job not found"}
                        yield f"event: error\ndata: {json.dumps(data)}\n\n"
                        break

                    # Only send progress when status changes
                    if job.status != last_status:
                        data = {
                            "status": job.status,
                            "video_url": job.video_url,
                            "error_message": job.error_message,
                        }
                        yield f"event: progress\ndata: {json.dumps(data)}\n\n"
                        last_status = job.status

                    if job.status in ("completed", "failed"):
                        break

                # Poll every 5 seconds
                await asyncio.sleep(5.0)

                heartbeat_counter += 5
                if heartbeat_counter >= 15:
                    yield "event: heartbeat\ndata: {}\n\n"
                    heartbeat_counter = 0

        except asyncio.CancelledError:
            pass
        except Exception as e:
            data = {"error": str(e)}
            yield f"event: error\ndata: {json.dumps(data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
