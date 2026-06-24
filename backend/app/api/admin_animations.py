"""Endpoint admin: generar animaciones con IA (prototipo code-gen).

Solo admin/founder. Escribe un prompt → la IA devuelve un componente Remotion (TSX)
que el frontend previsualiza en un <Player>. No toca el pipeline de video ni el audio.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.models import User
from app.core.security import require_admin
from app.core.logging import get_logger
from app.modules.llm.animation_generator import generate_animation

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
