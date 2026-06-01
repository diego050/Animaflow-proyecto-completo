"""Convenience exports for all Pydantic schemas."""
from .auth import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    UserUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from .job import (
    JobCreate,
    JobResponse,
    JobListResponse,
    JobDraftRequest,
    SceneData,
    SceneApprovalRequest,
    SceneInput,
    SceneRegenerateRequest,
    SceneEditRequest,
    JobReformatRequest,
    ScriptGenerateRequest,
    ScriptGenerateResponse,
)
from .voice import (
    VoiceCreate,
    VoiceUpdate,
    VoiceResponse,
    VoicePreviewRequest,
)
from .api_keys import (
    ApiKeyCreate,
    ApiKeyResponse,
)
from .design_template import (
    DesignTemplateCreate,
    DesignTemplateResponse,
    DesignTemplateUpdate,
)
from .admin import (
    AdminUserResponse,
    AdminJobResponse,
    AdminStatsResponse,
    PaginatedUsersResponse,
    PaginatedJobsResponse,
)
