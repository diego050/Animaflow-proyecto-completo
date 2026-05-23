from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.db.models import User, DesignTemplate
from app.core.security import get_current_active_user
from app.schemas.design_template import DesignTemplateCreate, DesignTemplateUpdate, DesignTemplateResponse

router = APIRouter()

@router.get("/", response_model=List[DesignTemplateResponse])
def read_design_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all design templates for the current user."""
    templates = db.query(DesignTemplate).filter(DesignTemplate.user_id == current_user.id).all()
    return templates

@router.post("/", response_model=DesignTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_design_template(
    template_in: DesignTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new design template."""
    new_template = DesignTemplate(
        user_id=current_user.id,
        name=template_in.name,
        content=template_in.content
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

@router.get("/{template_id}", response_model=DesignTemplateResponse)
def read_design_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific design template."""
    template = db.query(DesignTemplate).filter(
        DesignTemplate.id == template_id,
        DesignTemplate.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Design template not found")
    return template

@router.put("/{template_id}", response_model=DesignTemplateResponse)
def update_design_template(
    template_id: str,
    template_in: DesignTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a design template."""
    template = db.query(DesignTemplate).filter(
        DesignTemplate.id == template_id,
        DesignTemplate.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Design template not found")

    if template_in.name is not None:
        template.name = template_in.name
    if template_in.content is not None:
        template.content = template_in.content

    db.commit()
    db.refresh(template)
    return template

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_design_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a design template."""
    template = db.query(DesignTemplate).filter(
        DesignTemplate.id == template_id,
        DesignTemplate.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Design template not found")

    db.delete(template)
    db.commit()
    return None
