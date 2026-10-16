import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    PORT = int(os.getenv("PORT", 5000))
    
    # CORS
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'tweetsense.db'}")
    
    # Authentication
    JWT_SECRET = os.getenv("JWT_SECRET", "tweetsense-v2-dev-secret-key-change-in-prod")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    
    # LLM Settings
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
    LLM_MODEL = os.getenv("LLM_MODEL", "gemini-1.5-flash")
    
    # Models Paths
    MODEL_PATH = BASE_DIR / "trained_model.sav"
    VECTORIZER_PATH = BASE_DIR / "vectorizer.sav"
