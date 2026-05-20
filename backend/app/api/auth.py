"""
Auth API router for AnimaFlow - register, login, profile management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse, UserUpdate
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user,
)
from app.core.limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=201)
@limiter.limit("3/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user and return an access token.

    TODO: Future - add email verification flow before activating account.
    """
    existing = db.query(User).filter(User.email == user_data.email, User.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        name=user_data.name,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user and return an access token.

    Note: Error message is intentionally generic to avoid email enumeration.
    """
    user = db.query(User).filter(User.email == credentials.email, User.is_deleted == False).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(data={"sub": user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update the authenticated user's profile.

    TODO: Future - add audit log for password changes and email updates.
    """
    if update_data.name:
        current_user.name = update_data.name

    if update_data.email and update_data.email != current_user.email:
        raise HTTPException(status_code=400, detail="Email changes are not supported in MVP")

    if update_data.new_password:
        if not update_data.current_password or not verify_password(
            update_data.current_password, current_user.hashed_password
        ):
            raise HTTPException(status_code=400, detail="Invalid current password")
        current_user.hashed_password = get_password_hash(update_data.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user
