from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import RegisterSchema, LoginSchema
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
