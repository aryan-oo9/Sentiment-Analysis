import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Auto-load .env from TweetSense root or backend dir if present
for env_path in [BASE_DIR / ".env", BASE_DIR.parent / ".env"]:
    if env_path.is_file():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

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
    _raw_db_url = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'tweetsense.db'}")
    if _raw_db_url.startswith("postgres://"):
        _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL = _raw_db_url
    
    # Authentication
    JWT_SECRET = os.getenv("JWT_SECRET", "tweetsense-v2-dev-secret-key-change-in-prod")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq" if LLM_API_KEY.startswith("gsk_") else "gemini")
    _default_model = "openai/gpt-oss-20b" if LLM_PROVIDER.lower() == "groq" else "gemini-3-flash-preview"
    LLM_MODEL = os.getenv("LLM_MODEL", _default_model)
    
    # Models Paths
    MODEL_PATH = BASE_DIR / "trained_model.sav"
    VECTORIZER_PATH = BASE_DIR / "vectorizer.sav"
