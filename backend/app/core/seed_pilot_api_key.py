"""Seed script to configure pilot user with API key and LLM settings."""
from app.db.session import SessionLocal
from app.db.models import User, ApiKey
import json

def seed_pilot_api_key():
    db = SessionLocal()
    try:
        pilot = db.query(User).filter(User.email == "pilot@animaflow.io").first()
        if not pilot:
            print("[ERROR] Usuario piloto no encontrado")
            return
        
        # Check if API key already exists
        existing_key = db.query(ApiKey).filter(
            ApiKey.user_id == pilot.id,
            ApiKey.provider == "gemini",
            ApiKey.is_active == True
        ).first()
        
        if existing_key:
            print("[INFO] API key de Gemini ya existe para el usuario piloto")
        else:
            # Create API key
            api_key = ApiKey(
                user_id=pilot.id,
                provider="gemini",
                api_key="AIzaSyB6mGCwW7cwjj9HV972pdiJWr_ltARNBPY",
                is_active=True
            )
            db.add(api_key)
            print("[OK] API key de Gemini creada")
        
        # Update user LLM settings
        if not pilot.default_provider:
            pilot.default_provider = "gemini"
            print("[OK] default_provider configurado: gemini")
        
        if not pilot.default_model:
            pilot.default_model = "gemma-4-31b-it"
            print("[OK] default_model configurado: gemma-4-31b-it")
        
        if not pilot.available_models:
            pilot.available_models = ["gemma-4-31b-it", "gemma-4-26b-a4b-it"]
            print("[OK] available_models configurados")
        
        db.commit()
        print("\n[OK] Usuario piloto configurado correctamente")
        print(f"   Email: {pilot.email}")
        print(f"   Provider: {pilot.default_provider}")
        print(f"   Model: {pilot.default_model}")
        print(f"   Available models: {pilot.available_models}")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_pilot_api_key()
