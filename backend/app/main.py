import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import jobs, exports, audio, auth, voices, api_keys, assets, admin
from app.core.config import settings

app = FastAPI(title="AnimaFlow API", description="API for AnimaFlow Video Pipeline", version="1.0.0")

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

# Serve video files from storage/videos directory
VIDEO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../storage/videos"))
os.makedirs(VIDEO_DIR, exist_ok=True)
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
