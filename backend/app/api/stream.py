import asyncio
import json
import asyncpg
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import JobModel, User
from app.core.security import get_current_user_from_token
from app.core.config import settings

router = APIRouter()

@router.get("/{job_id}/stream")
async def job_stream(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """
    Server-Sent Events (SSE) endpoint to stream job progress.
    Uses PostgreSQL LISTEN/NOTIFY for real-time updates with fallback polling.
    """
    async def event_generator():
        heartbeat_counter = 0
        last_status = None

        # Set up asyncpg listener for real-time notifications
        notify_conn = None
        try:
            notify_conn = await asyncpg.connect(settings.DATABASE_URL)
            await notify_conn.add_listener('jobs', lambda *args: None)
        except Exception:
            pass

        try:
            while True:
                if await request.is_disconnected():
                    break

                # Refresh DB session to get fresh data
                db.commit()
                job = db.query(JobModel).filter(
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

                # Wait for notification or timeout (5s fallback poll)
                if notify_conn:
                    try:
                        await asyncio.wait_for(
                            notify_conn.run_in_transaction(lambda: None),
                            timeout=5.0,
                        )
                    except asyncio.TimeoutError:
                        pass
                else:
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
        finally:
            if notify_conn:
                await notify_conn.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
