from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from ..database import SessionLocal
from ..models import User
from ..schemas import RegisterSchema, LoginSchema
from ..auth import hash_password, verify_password, create_access_token, require_auth

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = RegisterSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({
            "status": "error",
            "message": e.errors()[0]["msg"],
            "data": None
        }), 400
    except Exception:
        return jsonify({"status": "error", "message": "Invalid JSON payload", "data": None}), 400

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == data.email.lower()).first()
        if existing:
            return jsonify({
                "status": "error",
                "message": "An account with this email already exists",
                "data": None
            }), 409

        hashed = hash_password(data.password)
        user = User(email=data.email.lower(), password_hash=hashed)
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.id, user.email)
        return jsonify({
            "status": "success",
            "message": "User registered successfully",
            "data": {
                "token": token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "created_at": user.created_at.isoformat()
                }
            }
        }), 201
    finally:
        db.close()

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = LoginSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({
            "status": "error",
            "message": e.errors()[0]["msg"],
            "data": None
        }), 400
    except Exception:
        return jsonify({"status": "error", "message": "Invalid JSON payload", "data": None}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == data.email.lower()).first()
        if not user or not verify_password(data.password, user.password_hash):
            return jsonify({
                "status": "error",
                "message": "Invalid email or password",
                "data": None
            }), 401

        token = create_access_token(user.id, user.email)
        return jsonify({
            "status": "success",
            "message": "Login successful",
            "data": {
                "token": token,
                "user": {
                    "id": user.id,
                    "email": user.email
                }
            }
        }), 200
    finally:
        db.close()

@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_me(current_user, db):
    return jsonify({
        "status": "success",
        "message": "Session valid",
        "data": {
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "created_at": current_user.created_at.isoformat()
            }
        }
    }), 200
