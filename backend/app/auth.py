import time
from functools import wraps
import bcrypt
import jwt
from flask import request, jsonify
from .config import Config
from .database import SessionLocal
from .models import User

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: int, email: str) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": now + (Config.JWT_EXPIRATION_HOURS * 3600)
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({
                "status": "error",
                "message": "Authorization token required",
                "data": None
            }), 401

        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = decode_access_token(token)
            user_id = int(payload["sub"])
        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "message": "Token has expired",
                "data": None
            }), 401
        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid token",
                "data": None
            }), 401

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return jsonify({
                    "status": "error",
                    "message": "User not found",
                    "data": None
                }), 401
            # Pass user object or user_id into decorated function
            return f(current_user=user, db=db, *args, **kwargs)
        finally:
            db.close()

    return decorated
