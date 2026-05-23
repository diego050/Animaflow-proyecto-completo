"""
API endpoints para el Marketplace de Componentes.
"""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import CommunityComponent, User
from app.core.security import get_current_user, require_admin
from app.core.logging import get_logger

logger = get_logger("api.components")

router = APIRouter(prefix="/api/components", tags=["components"])


# ─── Pydantic Schemas ───

class ComponentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    format: str = "json"  # "json" | "tsx"
    content: str
    category: Optional[str] = "uncategorized"
    tags: Optional[list[str]] = None
    preview_url: Optional[str] = None


class ComponentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    preview_url: Optional[str] = None


class ComponentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    format: str
    category: Optional[str]
    tags: Optional[list[str]]
    preview_url: Optional[str]
    status: str
    author_name: Optional[str] = None
    downloads: int
    likes: int
    created_at: str
    approved_at: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Endpoints Publicos ───

@router.get("/marketplace", response_model=list[ComponentResponse])
def list_approved_components(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lista componentes aprobados (publico)."""
    query = db.query(CommunityComponent).filter(CommunityComponent.status == "approved")

    if category:
        query = query.filter(CommunityComponent.category == category)
    if search:
        query = query.filter(
            CommunityComponent.name.ilike(f"%{search}%") |
            CommunityComponent.description.ilike(f"%{search}%")
        )

    components = query.order_by(CommunityComponent.downloads.desc()).offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for c in components:
        tags_list = json.loads(c.tags) if c.tags else []
        result.append(ComponentResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            format=c.format,
            category=c.category,
            tags=tags_list,
            preview_url=c.preview_url,
            status=c.status,
            author_name=c.author.name if c.author else None,
            downloads=c.downloads,
            likes=c.likes,
            created_at=c.created_at.isoformat() if c.created_at else "",
            approved_at=c.approved_at.isoformat() if c.approved_at else None,
        ))

    return result


@router.get("/marketplace/{component_id}", response_model=ComponentResponse)
def get_component_detail(component_id: str, db: Session = Depends(get_db)):
    """Detalle de un componente aprobado."""
    comp = db.query(CommunityComponent).filter(
        CommunityComponent.id == component_id,
        CommunityComponent.status == "approved"
    ).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    tags_list = json.loads(comp.tags) if comp.tags else []
    return ComponentResponse(
        id=comp.id,
        name=comp.name,
        description=comp.description,
        format=comp.format,
        category=comp.category,
        tags=tags_list,
        preview_url=comp.preview_url,
        status=comp.status,
        author_name=comp.author.username if comp.author and hasattr(comp.author, 'username') else (comp.author.name if comp.author else None),
        downloads=comp.downloads,
        likes=comp.likes,
        created_at=comp.created_at.isoformat() if comp.created_at else "",
        approved_at=comp.approved_at.isoformat() if comp.approved_at else None,
    )


@router.get("/marketplace/{component_id}/content")
def get_component_content(component_id: str, db: Session = Depends(get_db)):
    """Obtiene el contenido JSON/TSX del componente."""
    comp = db.query(CommunityComponent).filter(
        CommunityComponent.id == component_id,
        CommunityComponent.status == "approved"
    ).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    comp.downloads += 1
    db.commit()

    content = json.loads(comp.content) if comp.format == "json" else comp.content
    return {"format": comp.format, "content": content}


# ─── Endpoints de Usuario (requieren auth) ───

@router.post("/generate")
def generate_component(
    prompt: str,
    current_user: User = Depends(get_current_user),
):
    """
    ENDPOINT PLACEHOLDER: La IA genera un componente.
    En MVP, este endpoint recibe un prompt y devuelve un AnimaComposer JSON
    generado por el LLM. Por ahora, devuelve un template basico.

    En futura iteracion, esto llamara al LLM para generar el JSON.
    """
    # TODO: Integrar con LLM para generar el AnimaComposer JSON
    template = {
        "version": "1.0",
        "background": {
            "type": "radial-gradient",
            "colors": ["#1a1a2e", "#0f3460"],
        },
        "layers": [
            {
                "type": "text",
                "text": prompt,
                "x": 540, "y": 960,
                "fontSize": 64, "fontWeight": 900,
                "fill": "#ffffff",
                "entry": "fade-in",
            }
        ],
    }
    return {"format": "json", "content": template}


@router.post("/publish")
def publish_component(
    data: ComponentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Publica un componente (queda en estado 'pending' hasta que admin apruebe)."""
    existing = db.query(CommunityComponent).filter(CommunityComponent.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Component '{data.name}' already exists")

    comp = CommunityComponent(
        name=data.name,
        description=data.description,
        author_id=current_user.id,
        format=data.format,
        content=data.content if isinstance(data.content, str) else json.dumps(data.content),
        category=data.category or "uncategorized",
        tags=json.dumps(data.tags) if data.tags else None,
        preview_url=data.preview_url,
        status="pending",
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)

    logger.info("Component '%s' published by user %s (pending approval)", data.name, current_user.id)
    return {"id": comp.id, "name": comp.name, "status": "pending", "message": "Component submitted for approval"}


@router.post("/{component_id}/like")
def like_component(component_id: str, db: Session = Depends(get_db)):
    """Incrementa el contador de likes."""
    comp = db.query(CommunityComponent).filter(CommunityComponent.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")
    comp.likes += 1
    db.commit()
    return {"likes": comp.likes}


# ─── Endpoints de Admin ───

@router.get("/admin/all")
def list_all_components(
    status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Lista TODOS los componentes (incluye pending). Solo admin."""
    query = db.query(CommunityComponent)
    if status_filter:
        query = query.filter(CommunityComponent.status == status_filter)

    total = query.count()
    components = query.order_by(
        CommunityComponent.created_at.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for c in components:
        tags_list = json.loads(c.tags) if c.tags else []
        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "format": c.format,
            "category": c.category,
            "status": c.status,
            "author": c.author.name if c.author else "unknown",
            "downloads": c.downloads,
            "likes": c.likes,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        })

    return {"total": total, "page": page, "components": result}


@router.post("/admin/{component_id}/approve")
def approve_component(
    component_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Aprueba un componente. Solo admin."""
    comp = db.query(CommunityComponent).filter(CommunityComponent.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    now = datetime.now(timezone.utc)
    comp.status = "approved"
    comp.reviewer_id = current_user.id
    comp.reviewed_at = now
    comp.approved_at = now
    db.commit()

    logger.info("Component '%s' approved by admin %s", comp.name, current_user.id)
    return {"id": comp.id, "name": comp.name, "status": "approved"}


@router.post("/admin/{component_id}/reject")
def reject_component(
    component_id: str,
    reason: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Rechaza un componente. Solo admin."""
    comp = db.query(CommunityComponent).filter(CommunityComponent.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    comp.status = "rejected"
    comp.reviewer_id = current_user.id
    comp.reviewed_at = datetime.now(timezone.utc)
    comp.rejection_reason = reason
    db.commit()

    logger.info("Component '%s' rejected by admin %s. Reason: %s", comp.name, current_user.id, reason)
    return {"id": comp.id, "name": comp.name, "status": "rejected"}


@router.delete("/admin/{component_id}")
def delete_component(
    component_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Elimina un componente. Solo admin."""
    comp = db.query(CommunityComponent).filter(CommunityComponent.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    comp_name = comp.name
    db.delete(comp)
    db.commit()

    logger.info("Component '%s' deleted by admin %s", comp_name, current_user.id)
    return {"message": "Component deleted"}
