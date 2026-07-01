"""
Auth schemas for AnimaFlow - Pydantic v2 models mirroring frontend TS interfaces.
"""
import re

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Literal
from datetime import datetime

UserRole = Literal["founder", "agency", "user", "admin"]
UserPlan = Literal["free", "paid", "business"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: str
    role: UserRole = "user"

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    plan: UserPlan = "free"
    is_active: bool
    created_at: datetime
    # Perfil opcional + estado de onboarding.
    persona: Optional[str] = None
    referral_source: Optional[str] = None
    use_case: Optional[str] = None
    onboarding_completed: bool = False

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=72)
    # Perfil opcional (onboarding).
    persona: Optional[str] = Field(default=None, max_length=50)
    referral_source: Optional[str] = Field(default=None, max_length=100)
    use_case: Optional[str] = Field(default=None, max_length=2000)
    mark_onboarding_completed: Optional[bool] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)
