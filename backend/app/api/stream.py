import asyncio
import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import JobModel, User
from app.core.security import get_current_active_user_from_token

router = APIRouter()

@router.get("/{job_id}/stream")
async def job_stream(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user_from_token),
):
    """
    Server-Sent Events (SSE) endpoint to stream job progress.
    """
    async def event_generator_correct():
        heartbeat_counter = 0
        last_status = None
        try:
            while True:
                if await request.is_disconnected():
                    break

                db.commit() # Ensure we get fresh data by starting a new transaction
                job = db.query(JobModel).filter(
                    JobModel.id == job_id,
                    JobModel.user_id == current_user.id
                ).first()

                if not job:
                    data = {"error": "Job not found"}
                    yield f"event: error\ndata: {json.dumps(data)}\n\n"
                    break

                # Only send progress if status changed or it's the first time
                # Wait, the instructions didn't explicitly say "only when status changes" but it's good practice.
                # Actually, the instructions: "Yield event: progress ... when the status changes."
                if job.status != last_status:
                    data = {
                        "status": job.status,
                        "video_url": job.video_url,
                        "error_message": job.error_message
                    }
                    yield f"event: progress\ndata: {json.dumps(data)}\n\n"
                    last_status = job.status

                if job.status in ["completed", "failed"]:
                    break

                await asyncio.sleep(0.5)
                heartbeat_counter += 0.5

                if heartbeat_counter >= 15:
                    yield f"event: heartbeat\ndata: {{}}\n\n"
                    heartbeat_counter = 0
        except asyncio.CancelledError:
            # Client disconnected
            pass
        except Exception as e:
            data = {"error": str(e)}
            yield f"event: error\ndata: {json.dumps(data)}\n\n"

    return StreamingResponse(
        event_generator_correct(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
