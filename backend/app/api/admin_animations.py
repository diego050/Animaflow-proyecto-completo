"""Endpoint admin: generar animaciones con IA (prototipo code-gen).

Solo admin/founder. Escribe un prompt → la IA devuelve un componente Remotion (TSX)
que el frontend previsualiza en un <Player>. No toca el pipeline de video ni el audio.
"""
from typing import Optional
import os
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, GeneratedAnimation
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
    edit_mode: Optional[str] = None          # surgical | full | create
    changes: list[dict] = []                 # [{before, after}] de la edición quirúrgica


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

    from app.services.animation_store import save_generated_animation
    save_generated_animation(
        code=result.get("code", ""),
        source="edit" if req.edit_instruction else "prototype",
        user_id=current_user.id,
        prompt_text=req.edit_instruction or req.prompt,
        model=result.get("model"),
        valid=result.get("valid", False),
        status="edited" if req.edit_instruction else "passed",
        tokens=result.get("tokens"),
        duration_frames=result.get("duration_frames"),
        aspect_ratio=req.aspect_ratio,
    )
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


# ── Editor MANUAL de valores (sin LLM, instantáneo) ──

class ValuesExtractRequest(BaseModel):
    code: str


class ValuesApplyRequest(BaseModel):
    code: str
    changes: dict


@router.post("/values/extract")
def values_extract(req: ValuesExtractRequest, current_user: User = Depends(require_admin)):
    """Extrae las constantes editables (colores/números/textos/arrays) del código."""
    from app.modules.llm.value_editor import extract_editable_values
    return {"values": extract_editable_values(req.code)}


@router.post("/values/apply")
def values_apply(req: ValuesApplyRequest, current_user: User = Depends(require_admin)):
    """Aplica cambios de valores (find-replace, SIN LLM). Devuelve el código nuevo + valores."""
    from app.modules.llm.value_editor import apply_value_changes, extract_editable_values
    new_code = apply_value_changes(req.code, req.changes or {})
    return {"code": new_code, "values": extract_editable_values(new_code)}


# ── Export a After Effects EDITABLE (beta) — Etapas 2+3 del traductor AE ──

class AeExportRequest(BaseModel):
    code: str           # código TSX YA ETIQUETADO (data-ae-id) por el frontend
    width: int = 1080
    height: int = 1920
    fps: int = 30
    duration_frames: int = 180


@router.post("/ae-export")
def ae_export(req: AeExportRequest, current_user: User = Depends(require_admin)):
    """Muestrea la animación (render-server) → arma el aeScene → emite el .jsx para AE. BETA."""
    import httpx
    from app.core.config import settings
    from app.modules.ae_export.jsx_builder import build_jsx

    try:
        with httpx.Client(timeout=300.0) as client:
            r = client.post(
                f"{settings.RENDER_SERVER_URL}/ae-sample",
                json={
                    "code": req.code, "width": req.width, "height": req.height,
                    "fps": req.fps, "durationInFrames": req.duration_frames,
                },
            )
            r.raise_for_status()
            scene = r.json()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Muestreo AE falló: {e}")

    jsx = build_jsx(scene)
    return {"jsx": jsx, "elements": len(scene.get("elements", []))}


# ── Config tuneable desde la DB (sin redeploy) ──

# (default, descripción). Solo NO-secretos; los secretos siguen en env.
_CODEGEN_SETTINGS = {
    "codegen.model_override": (None, "Modelo forzado para code-gen (vacío = el del usuario)"),
    "codegen.temperature": (0.4, "Temperatura de generación (0–1)"),
    "codegen.max_attempts": (3, "Intentos de auto-reparación por generación"),
    "codegen.max_output_tokens": (12000, "Tope de tamaño del componente (tokens de salida)"),
    "flywheel.enabled": (True, "Activar el few-shot del flywheel (ejemplos aprobados)"),
}


@router.get("/settings")
def get_codegen_settings(current_user: User = Depends(require_admin)):
    """Lee la config tuneable de code-gen (DB con fallback a default de código)."""
    from app.services.settings_store import get_setting
    return {
        k: {"value": get_setting(k, d), "default": d, "description": desc}
        for k, (d, desc) in _CODEGEN_SETTINGS.items()
    }


@router.put("/settings")
def update_codegen_settings(
    payload: dict = Body(...), current_user: User = Depends(require_admin)
):
    """Actualiza la config tuneable de code-gen (solo keys conocidas)."""
    from app.services.settings_store import set_setting
    updated = {}
    for k, v in payload.items():
        if k in _CODEGEN_SETTINGS:
            set_setting(k, v, _CODEGEN_SETTINGS[k][1])
            updated[k] = v
    return {"updated": updated, "ignored": [k for k in payload if k not in _CODEGEN_SETTINGS]}


# ── Observabilidad: métricas de las animaciones code-gen generadas ──

@router.get("/metrics")
def metrics(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Resumen global: generaciones, % fallback, tokens, por estado/fuente/modelo."""
    GA = GeneratedAnimation
    total = db.query(func.count(GA.id)).scalar() or 0
    by_status = dict(db.query(GA.status, func.count(GA.id)).group_by(GA.status).all())
    by_source = dict(db.query(GA.source, func.count(GA.id)).group_by(GA.source).all())
    by_model = dict(db.query(GA.model, func.count(GA.id)).group_by(GA.model).all())
    tok_in = int(db.query(func.coalesce(func.sum(GA.tokens_in), 0)).scalar() or 0)
    tok_out = int(db.query(func.coalesce(func.sum(GA.tokens_out), 0)).scalar() or 0)
    tok_total = int(db.query(func.coalesce(func.sum(GA.tokens_total), 0)).scalar() or 0)
    valid_count = db.query(func.count(GA.id)).filter(GA.valid.is_(True)).scalar() or 0
    fallback_count = int(by_status.get("fallback", 0) or 0)

    # Costo estimado en USD (tokens × precio por modelo).
    from app.services.model_catalog import estimate_cost_usd
    per_model_tokens = (
        db.query(
            GA.model,
            func.coalesce(func.sum(GA.tokens_in), 0),
            func.coalesce(func.sum(GA.tokens_out), 0),
        )
        .group_by(GA.model)
        .all()
    )
    cost_by_model = {
        (m or "?"): estimate_cost_usd(m, int(ti or 0), int(to or 0))
        for m, ti, to in per_model_tokens
    }
    cost_total = round(sum(cost_by_model.values()), 4)
    return {
        "total_generations": total,
        "valid": valid_count,
        "fallback": fallback_count,
        "fallback_rate": round(fallback_count / total, 3) if total else 0,
        "by_status": by_status,
        "by_source": by_source,
        "by_model": by_model,
        "tokens": {
            "in": tok_in, "out": tok_out, "total": tok_total,
            "avg_total_per_gen": round(tok_total / total) if total else 0,
        },
        "cost_usd": {
            "total": cost_total,
            "by_model": cost_by_model,
            "avg_per_gen": round(cost_total / total, 6) if total else 0,
        },
    }


@router.get("/metrics/job/{job_id}")
def job_metrics(
    job_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)
):
    """Tokens y escenas de UN video (observabilidad por video)."""
    from app.services.model_catalog import estimate_cost_usd
    GA = GeneratedAnimation
    rows = db.query(GA).filter(GA.job_id == job_id).all()
    cost_total = round(
        sum(estimate_cost_usd(r.model, r.tokens_in or 0, r.tokens_out or 0) for r in rows), 6
    )
    return {
        "job_id": job_id,
        "scenes": len(rows),
        "tokens_total": sum(r.tokens_total or 0 for r in rows),
        "cost_usd": cost_total,
        "fallbacks": sum(1 for r in rows if r.status == "fallback"),
        "items": [
            {
                "scene_index": r.scene_index, "model": r.model, "status": r.status,
                "tokens_total": r.tokens_total, "valid": r.valid, "source": r.source,
                "cost_usd": estimate_cost_usd(r.model, r.tokens_in or 0, r.tokens_out or 0),
            }
            for r in sorted(rows, key=lambda x: (x.scene_index if x.scene_index is not None else 0))
        ],
    }


@router.get("/video/{anim_id}")
def get_video(anim_id: str, current_user: User = Depends(require_admin)):
    safe = "".join(c for c in anim_id if c.isalnum() or c in "-_")
    path = os.path.join(get_storage_dir("videos"), f"{safe}.mp4")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video no encontrado.")
    return FileResponse(path, media_type="video/mp4")
