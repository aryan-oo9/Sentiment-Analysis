import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Project, PasswordResetToken
from ..schemas import RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema
from ..auth import hash_password, verify_password, create_access_token, get_current_user

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])

@auth_router.post("/register", status_code=201)
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    hashed = hash_password(data.password)
    user = User(email=data.email.lower(), password_hash=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return {
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
    }

@auth_router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id, user.email)
    return {
        "status": "success",
        "message": "Login successful",
        "data": {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email
            }
        }
    }

@auth_router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "status": "success",
        "message": "Session valid",
        "data": {
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "created_at": current_user.created_at.isoformat()
            }
        }
    }

@auth_router.post("/demo-session")
def demo_session(db: Session = Depends(get_db)):
    demo_user = db.query(User).filter(User.email == "demo@tweetsense.io").first()
    if not demo_user:
        demo_user = User(email="demo@tweetsense.io", password_hash=hash_password("DemoGuest1234!"))
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    demo_project = db.query(Project).filter(Project.is_demo == True).first()
    token = create_access_token(demo_user.id, demo_user.email)
    return {
        "status": "success",
        "message": "Demo session initialized",
        "data": {
            "token": token,
            "user": {
                "id": demo_user.id,
                "email": demo_user.email
            },
            "demo_project_id": demo_project.id if demo_project else None
        }
    }

@auth_router.post("/forgot-password")
def forgot_password(data: ForgotPasswordSchema, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    generic_msg = "If an account with that email exists, password reset instructions have been dispatched."

    if email == "demo@tweetsense.io":
        return {
            "status": "success",
            "message": generic_msg,
            "data": None
        }

    user = db.query(User).filter(User.email == email).first()
    dev_token = None
    if user:
        # Invalidate any prior unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).update({"used": True})

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )
        db.add(reset_record)
        db.commit()

        dev_token = raw_token

    return {
        "status": "success",
        "message": generic_msg,
        "data": {
            "dev_reset_token": dev_token,
            "dev_reset_url": f"/reset-password?token={dev_token}" if dev_token else None
        }
    }

@auth_router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    raw_token = data.token.strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is required."
        )

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    reset_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).first()

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unrecognized password reset token."
        )

    if reset_record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset token has already been redeemed."
        )

    now_utc = datetime.now(timezone.utc)
    expires = reset_record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if now_utc > expires:
        reset_record.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset token has expired. Please request a new one."
        )

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters in length."
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated account could not be found."
        )

    if user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The sample demo guest password cannot be modified."
        )

    user.password_hash = hash_password(data.new_password)
    reset_record.used = True
    db.commit()

    return {
        "status": "success",
        "message": "Password updated successfully. You may now sign in with your new password.",
        "data": {
            "email": user.email
        }
    }
