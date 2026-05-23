import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import JSONResponse
from app.api import jobs, exports, audio, auth, voices, api_keys, assets, admin, contact, scenes, design_templates, components
from app.core.config import settings
from app.core.limiter import limiter, RateLimitExceeded
from app.core.storage_paths import get_storage_dir

app = FastAPI(title="AnimaFlow API", description="API for AnimaFlow Video Pipeline", version="1.0.0")
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"}
    )

# Configuración de CORS para permitir peticiones desde el frontend (React/Vite)
origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(exports.router, tags=["Exports"])
app.include_router(audio.router, tags=["Audio"])
app.include_router(voices.router)  # Voice management endpoints
app.include_router(api_keys.router)  # API key management endpoints
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(contact.router)
app.include_router(scenes.router, tags=["scenes"])
app.include_router(design_templates.router, prefix="/api/design-templates", tags=["Design Templates"])
app.include_router(components.router, tags=["Components"])

# Serve video files from storage/videos directory
VIDEO_DIR = get_storage_dir("videos")
app.mount("/videos", StaticFiles(directory=VIDEO_DIR), name="videos")

@app.on_event("startup")
async def startup_event():
    if settings.ENV == "production":
        assert settings.SECRET_KEY != "dev-secret-key-change-in-production", \
            "FATAL: SECRET_KEY not configured for production"
        assert settings.ENCRYPTION_KEY, \
            "FATAL: ENCRYPTION_KEY not configured for production"

@app.get("/health")
async def health_check():
    return {"status": "ok"}
