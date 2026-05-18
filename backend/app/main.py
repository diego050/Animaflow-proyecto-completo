from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import jobs, exports, audio, auth, voices

app = FastAPI(title="AnimaFlow API", description="API for AnimaFlow Video Pipeline", version="1.0.0")

# Configuración de CORS para permitir peticiones desde el frontend (React/Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], # Vite suele usar 5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(exports.router, tags=["Exports"])
app.include_router(audio.router, tags=["Audio"])
app.include_router(voices.router)  # Voice management endpoints

@app.get("/health")
async def health_check():
    return {"status": "ok"}
