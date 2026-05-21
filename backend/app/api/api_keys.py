from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import ApiKey, User
from app.schemas.api_keys import ApiKeyCreate, ApiKeyResponse, UserSettingsUpdate
from app.core.security import get_current_active_user
from app.modules.llm.model_fetcher import fetch_available_models

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])


@router.get("/", response_model=list[ApiKeyResponse])
def list_keys(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List all active API keys for the current user."""
    return (
        db.query(ApiKey)
        .filter(
            ApiKey.user_id == current_user.id,
            ApiKey.is_active == True,
        )
        .order_by(ApiKey.created_at.desc())
        .all()
    )


@router.post("/", response_model=ApiKeyResponse, status_code=201)
def create_key(
    data: ApiKeyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create or update an API key for a provider. One active key per provider per user."""
    existing = (
        db.query(ApiKey)
        .filter(
            ApiKey.user_id == current_user.id,
            ApiKey.provider == data.provider,
            ApiKey.is_active == True,
        )
        .first()
    )

    if existing:
        existing.api_key = data.api_key
        db.commit()
        db.refresh(existing)
        return existing

    key = ApiKey(
        user_id=current_user.id,
        provider=data.provider,
        api_key=data.api_key,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return key


@router.delete("/{key_id}", status_code=204)
def delete_key(
    key_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Soft-delete an API key (set is_active=False)."""
    key = (
        db.query(ApiKey)
        .filter(
            ApiKey.id == key_id,
            ApiKey.user_id == current_user.id,
        )
        .first()
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    key.is_active = False
    db.commit()
    return None


@router.get("/me/settings", response_model=dict)
def get_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get the current user's LLM provider settings."""
    db.refresh(current_user)
    return {
        "default_provider": current_user.default_provider,
        "default_model": current_user.default_model,
        "available_models": current_user.available_models or [],
    }


@router.put("/me/settings", response_model=dict)
def update_settings(
    data: UserSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update the current user's LLM provider settings."""
    if data.default_provider is not None:
        current_user.default_provider = data.default_provider
    if data.default_model is not None:
        current_user.default_model = data.default_model
    if data.available_models is not None:
        current_user.available_models = data.available_models

    db.commit()
    db.refresh(current_user)
    return {
        "default_provider": current_user.default_provider,
        "default_model": current_user.default_model,
        "available_models": current_user.available_models or [],
    }


@router.get("/models", response_model=list[str])
def list_models(
    provider: str = Query(..., description="LLM provider: gemini, openai, anthropic"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Return available models for a provider.
    For OpenAI, dynamically fetches from the API using the user's stored key.
    For Gemini and Anthropic, returns a static curated list.
    """
    api_key = None
    if provider.lower() == "openai":
        key_record = (
            db.query(ApiKey)
            .filter(
                ApiKey.user_id == current_user.id,
                ApiKey.provider == provider,
                ApiKey.is_active == True,
            )
            .first()
        )
        if key_record:
            api_key = key_record.api_key

    models = fetch_available_models(provider, api_key)
    return models
