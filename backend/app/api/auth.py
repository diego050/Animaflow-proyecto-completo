"""
Auth API router for AnimaFlow - register, login, profile management, password reset.
"""
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, Voice
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    UserUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.core.limiter import limiter
from app.core.logging import get_logger
from app.core.email import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = get_logger("auth")

PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 60


@router.post("/register", response_model=Token, status_code=201)
@limiter.limit("3/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user and return an access token.

    TODO: Future - add email verification flow before activating account.
    """
    existing = db.query(User).filter(User.email == user_data.email, User.is_deleted.is_(False)).first()
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

    # Create default voice for the new user
    default_voice = Voice(
        user_id=user.id,
        name="Carl (Default)",
        gender="neutral",
        language="es",
        is_default=True,
        voicebox_profile_id="es_ES-carlfm-x_low",
    )
    db.add(default_voice)
    db.commit()

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
    user = db.query(User).filter(User.email == credentials.email, User.is_deleted.is_(False)).first()
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
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
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


@router.post("/forgot-password", response_model=dict)
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Initiate a password reset flow.
    Generates a short-lived token stored in the user's DB record.
    NOTE: In MVP, no SMTP email is sent. The admin can retrieve the token from logs.
    """
    user = db.query(User).filter(User.email == data.email, User.is_deleted.is_(False)).first()

    # Always return the same generic message to prevent email enumeration
    if not user:
        return {"message": "Si el email existe, recibirás instrucciones."}

    token = create_access_token(
        data={"sub": user.id, "type": "password_reset"},
        expires_delta=timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    )

    # Store hashed token in the user's DB record instead of Redis
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    user.reset_token_hash = token_hash
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    )
    db.commit()

    # Send password reset email
    email_sent = send_password_reset_email(user.email, token)

    if email_sent:
        logger.info(
            "Password reset email sent to %s (token prefix: %s...)",
            user.email,
            token[:20],
        )
    else:
        logger.warning(
            "Password reset token generated for user %s but email could not be sent (token prefix: %s...)",
            user.email,
            token[:20],
        )

    return {"message": "Si el email existe, recibirás instrucciones."}


@router.post("/reset-password", response_model=dict)
@limiter.limit("3/minute")
def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset a user's password using a valid token stored in the user's DB record.
    """
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    user = db.query(User).filter(
        User.reset_token_hash == token_hash,
        User.reset_token_expires_at > now,
        User.is_deleted.is_(False),
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    user.hashed_password = get_password_hash(data.new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.commit()

    logger.info("Password reset successful for user %s", user.id)
    return {"message": "Contraseña actualizada correctamente."}
