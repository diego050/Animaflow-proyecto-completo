"""Endpoint admin: generar animaciones con IA (prototipo code-gen).

Solo admin/founder. Escribe un prompt → la IA devuelve un componente Remotion (TSX)
que el frontend previsualiza en un <Player>. No toca el pipeline de video ni el audio.
"""
from typing import Optional
import os
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.db.models import User
from app.core.security import require_admin
from app.core.config import settings
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir
from app.modules.llm.animation_generator import generate_animation
from app.modules.llm.animation_validator import validate_animation_code

logger = get_logger("admin_animations")
router = APIRouter()


class AnimationGenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    model: Optional[str] = Field(default=None, description="Override de modelo (configurable).")
    aspect_ratio: str = Field(default="9:16")
    duration_seconds: int = Field(default=6, ge=2, le=30)
    previous_code: Optional[str] = Field(default=None, description="Para edición: el código actual.")
    edit_instruction: Optional[str] = Field(default=None, description="Para edición: qué cambiar.")


class AnimationGenerateResponse(BaseModel):
    code: str
    valid: bool
    errors: list[str]
    model: str
    width: int
    height: int
    duration_frames: int


@router.post("/generate", response_model=AnimationGenerateResponse)
def generate(
    req: AnimationGenerateRequest,
    current_user: User = Depends(require_admin),
):
    try:
        result = generate_animation(
            prompt=req.prompt,
            user_id=current_user.id,
            model=req.model,
            aspect_ratio=req.aspect_ratio,
            duration_seconds=req.duration_seconds,
            previous_code=req.previous_code,
            edit_instruction=req.edit_instruction,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # noqa: BLE001
        logger.exception("Error generando animación")
        raise HTTPException(status_code=500, detail=f"Error generando animación: {e}")

    return AnimationGenerateResponse(**result)


# ── Fase 2: render a mp4 (vía render-server con la composición "CustomCode") ──

class AnimationRenderRequest(BaseModel):
    code: str = Field(min_length=30)
    width: int = Field(default=1080)
    height: int = Field(default=1920)
    duration_frames: int = Field(default=180, ge=30, le=1800)


class AnimationRenderResponse(BaseModel):
    video_url: str
    anim_id: str


@router.post("/render", response_model=AnimationRenderResponse)
async def render(
    req: AnimationRenderRequest,
    current_user: User = Depends(require_admin),
):
    # Re-validar el código ANTES de renderizar (no renderizar nada inseguro/no-determinista).
    valid, errors = validate_animation_code(req.code)
    if not valid:
        raise HTTPException(status_code=400, detail=f"Código inválido: {errors}")

    anim_id = f"anim-{uuid.uuid4().hex[:12]}"
    payload = {
        "jobId": anim_id,
        "compositionId": "CustomCode",
        "inputProps": {
            "code": req.code,
            "durationInFrames": req.duration_frames,
            "width": req.width,
            "height": req.height,
        },
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.RENDER_SERVER_URL}/render", json=payload, timeout=600.0
            )
            resp.raise_for_status()
    except Exception as e:  # noqa: BLE001
        logger.exception("Error renderizando animación")
        raise HTTPException(status_code=502, detail=f"El render falló: {e}")

    return AnimationRenderResponse(
        video_url=f"/api/admin/animations/video/{anim_id}", anim_id=anim_id
    )


@router.get("/video/{anim_id}")
def get_video(anim_id: str, current_user: User = Depends(require_admin)):
    safe = "".join(c for c in anim_id if c.isalnum() or c in "-_")
    path = os.path.join(get_storage_dir("videos"), f"{safe}.mp4")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video no encontrado.")
    return FileResponse(path, media_type="video/mp4")
