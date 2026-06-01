"""Voice management API endpoints."""

import hashlib
import os
import shutil
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Voice, User
from app.schemas.voice import VoiceCreate, VoiceUpdate, VoiceResponse, VoicePreviewRequest
from app.core.security import get_current_user
from app.core.config import settings
from app.core.storage_paths import get_storage_dir
from app.modules.tts.service import generate_tts_audio_only
from app.modules.tts.whisper_timestamps import get_audio_duration
from app.core.logging import get_logger

router = APIRouter(prefix="/api/voices", tags=["voices"])
logger = get_logger("voices")


@router.get("/", response_model=list[VoiceResponse])
def list_voices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all voices for the current user."""
    voices = (
        db.query(Voice)
        .filter(
            Voice.user_id == current_user.id,
            Voice.is_active.is_(True),  # noqa: E712
        )
        .order_by(Voice.is_default.desc(), Voice.created_at.desc())
        .all()
    )

    return voices


@router.post("/initialize-default", response_model=VoiceResponse, status_code=201)
def initialize_default_voice(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a default voice for the current user if none exists."""
    existing = (
        db.query(Voice)
        .filter(
            Voice.user_id == current_user.id,
            Voice.is_active.is_(True),  # noqa: E712
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already has voices")

    default_voice = Voice(
        user_id=current_user.id,
        name="Carl (Default)",
        gender="neutral",
        language="es",
        is_default=True,
        voicebox_profile_id="es_ES-carlfm-x_low",
    )
    db.add(default_voice)
    db.commit()
    db.refresh(default_voice)
    return default_voice


@router.post("/", response_model=VoiceResponse, status_code=201)
async def create_voice(
    voice_data: VoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new voice for the current user."""
    # If setting as default, unset other defaults for this user
    if voice_data.is_default:
        db.query(Voice).filter(
            Voice.user_id == current_user.id,
            Voice.is_default.is_(True),  # noqa: E712
        ).update({"is_default": False})

    voice = Voice(
        user_id=current_user.id,
        name=voice_data.name,
        gender=voice_data.gender,
        language=voice_data.language,
        is_default=voice_data.is_default,
    )
    db.add(voice)
    db.commit()
    db.refresh(voice)
    return voice


@router.post("/{voice_id}/upload-sample", response_model=VoiceResponse)
async def upload_voice_sample(
    voice_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an audio sample for voice cloning."""
    voice = db.query(Voice).filter(
        Voice.id == voice_id,
        Voice.user_id == current_user.id,
    ).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    # Save audio file to user-specific directory
    storage_dir = os.path.join(
        settings.STORAGE_PATH, "voice_samples", str(current_user.id)
    )
    os.makedirs(storage_dir, exist_ok=True)

    file_ext = file.filename.split(".")[-1] if "." in file.filename else "mp3"
    filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(storage_dir, filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    voice.audio_sample_path = file_path
    db.commit()
    db.refresh(voice)
    return voice


@router.post("/{voice_id}/preview", response_model=dict)
async def preview_voice(
    voice_id: str,
    preview_data: VoicePreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a preview audio for a voice using Piper TTS."""
    voice = db.query(Voice).filter(
        Voice.id == voice_id,
        Voice.user_id == current_user.id,
    ).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    # Check cache first for this text + voice profile
    profile_id = voice.voicebox_profile_id or "es_ES-carlfm-x_low"
    text_hash = hashlib.md5(f"{profile_id}_{preview_data.text}".encode()).hexdigest()
    cache_filename = f"preview_{text_hash}.wav"
    audio_storage = get_storage_dir("audio")
    cache_path = os.path.join(audio_storage, cache_filename)
    
    if os.path.exists(cache_path):
        duration = get_audio_duration(cache_path)
        return {"audio_url": f"/api/audio/{cache_filename}", "duration": duration}

    # Generate TTS preview using the voice's profile ID
    # NOTE: Uses generate_tts_audio_only to avoid loading Whisper (~1GB RAM)
    # which causes OOM crashes on shared VPS instances.
    try:
        result = await generate_tts_audio_only(
            text=preview_data.text,
            provider_name="local_piper",  # default for preview
            voice_id=profile_id
        )
        
        # Save to cache path
        shutil.move(result["audio_path"], cache_path)
        
        audio_url = f"/api/audio/{cache_filename}"
        return {"audio_url": audio_url, "duration": result["duration_seconds"]}
    except (RuntimeError, OSError, ConnectionError) as e:
        logger.warning("TTS preview failed for voice %s: %s", voice_id, e)
        raise HTTPException(status_code=500, detail=f"TTS preview failed: {e}")
    except Exception as e:
        logger.exception("Unexpected error in TTS preview for voice %s: %s", voice_id, e)
        raise HTTPException(status_code=500, detail="Internal server error during TTS preview")


@router.put("/{voice_id}", response_model=VoiceResponse)
def update_voice(
    voice_id: str,
    update_data: VoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a voice's properties."""
    voice = db.query(Voice).filter(
        Voice.id == voice_id,
        Voice.user_id == current_user.id,
    ).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    if update_data.name is not None:
        voice.name = update_data.name
    if update_data.gender is not None:
        voice.gender = update_data.gender
    if update_data.language is not None:
        voice.language = update_data.language
    if update_data.is_default is not None:
        if update_data.is_default:
            # Unset other defaults for this user
            db.query(Voice).filter(
                Voice.user_id == current_user.id,
                Voice.is_default.is_(True),  # noqa: E712
                Voice.id != voice_id,
            ).update({"is_default": False})
        voice.is_default = update_data.is_default

    db.commit()
    db.refresh(voice)
    return voice


@router.delete("/{voice_id}", status_code=204)
def delete_voice(
    voice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete voice permanently including audio file."""
    voice = db.query(Voice).filter(Voice.id == voice_id, Voice.user_id == current_user.id).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")

    # Delete physical audio file
    if voice.audio_sample_path and os.path.exists(voice.audio_sample_path):
        try:
            os.remove(voice.audio_sample_path)
        except OSError:
            pass

    # Hard delete from DB
    db.delete(voice)
    db.commit()
    return None
