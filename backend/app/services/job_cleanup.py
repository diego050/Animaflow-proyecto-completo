"""
Job file cleanup service.

Provides utilities for deleting all files associated with a job
(video, scenes, audio, TSX components, AE exports).
"""
import os
import shutil

from app.core.storage_paths import get_storage_dir
from app.core.config import settings


def delete_job_files(job_id: str, user_id: str) -> None:
    """Delete all files associated with a job from disk.

    Removes:
    1. Final video files (storage/videos/{job_id}.mp4/.webm)
    2. Scene MP4s directory (storage/scenes/{job_id}/)
    3. Audio files (storage/audio/{job_id}_*)
    4. Generated TSX components (frontend/src/remotion/generated/user_{user_id}/Scene_{job_id}_*.tsx)
    5. AE export files (storage/ae_exports/{job_id}*)

    Silently ignores files that don't exist or can't be deleted.
    """
    # 1. Delete final video file
    videos_dir = get_storage_dir("videos")
    for ext in (".mp4", ".webm"):
        video_path = os.path.join(videos_dir, f"{job_id}{ext}")
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
            except OSError:
                pass

    # 2. Delete scene MP4s directory
    scenes_dir = os.path.join(get_storage_dir("scenes"), job_id)
    if os.path.isdir(scenes_dir):
        shutil.rmtree(scenes_dir, ignore_errors=True)

    # 3. Delete audio files
    audio_dir = get_storage_dir("audio")
    if os.path.isdir(audio_dir):
        for fname in os.listdir(audio_dir):
            if fname.startswith(f"{job_id}_"):
                try:
                    os.remove(os.path.join(audio_dir, fname))
                except OSError:
                    pass

    # 4. Delete generated TSX components
    try:
        frontend_path = settings.frontend_path
        generated_dir = os.path.join(frontend_path, "src", "remotion", "generated")
        user_dir = os.path.join(generated_dir, f"user_{user_id}")
        if os.path.isdir(user_dir):
            for fname in os.listdir(user_dir):
                if fname.startswith(f"Scene_{job_id}_") and fname.endswith(".tsx"):
                    try:
                        os.remove(os.path.join(user_dir, fname))
                    except OSError:
                        pass
    except (RuntimeError, AttributeError):
        # frontend_path not configured — skip TSX cleanup
        pass

    # 5. Delete AE export files
    ae_dir = get_storage_dir("ae_exports")
    if os.path.isdir(ae_dir):
        for fname in os.listdir(ae_dir):
            if job_id in fname:
                fpath = os.path.join(ae_dir, fname)
                try:
                    if os.path.isdir(fpath):
                        shutil.rmtree(fpath, ignore_errors=True)
                    else:
                        os.remove(fpath)
                except OSError:
                    pass
