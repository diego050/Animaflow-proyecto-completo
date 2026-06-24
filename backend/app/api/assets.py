import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.db.session import get_db
from app.db.models import Asset, User
from app.core.security import get_current_user
from app.core.storage_paths import get_storage_dir

router = APIRouter()

ASSETS_DIR = get_storage_dir("assets")

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class AssetResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    file_type: str
    file_size: int
    created_at: str

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=list[AssetResponse])
def list_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all assets for the current user."""
    assets = db.query(Asset).filter(Asset.user_id == current_user.id).order_by(Asset.created_at.desc()).all()
    return assets


@router.post("/upload", response_model=AssetResponse, status_code=201)
async def upload_asset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a new image asset."""
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type not allowed. Allowed: {', '.join(ALLOWED_TYPES)}")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Maximum: {MAX_FILE_SIZE // (1024*1024)}MB")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    if not ext:
        ext = ".png"
    stored_filename = f"{uuid.uuid4()}{ext}"

    # Save to disk
    user_dir = os.path.join(ASSETS_DIR, current_user.id)
    os.makedirs(user_dir, exist_ok=True)
    file_path = os.path.join(user_dir, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    asset = Asset(
        user_id=current_user.id,
        filename=stored_filename,
        original_name=file.filename or "unnamed",
        file_type=file.content_type,
        file_size=len(content),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == current_user.id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    # Delete file from disk
    file_path = os.path.join(ASSETS_DIR, current_user.id, asset.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    # Delete DB record
    db.delete(asset)
    db.commit()


@router.get("/{asset_id}/file")
def get_asset_file(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve an asset file."""
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == current_user.id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    file_path = os.path.join(ASSETS_DIR, current_user.id, asset.filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found on disk")

    return FileResponse(file_path, media_type=asset.file_type)
