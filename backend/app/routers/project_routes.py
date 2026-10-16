import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import User, Project, Comment, Analysis
from ..schemas import ProjectCreateSchema, ProjectUpdateSchema
from ..auth import get_current_user

project_router = APIRouter(prefix="/api/projects", tags=["projects"])

class ShareToggleSchema(BaseModel):
    enabled: Optional[bool] = True

@project_router.get("")
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).order_by(Project.created_at.desc()).all()

    out = []
    for p in projects:
        total = db.query(func.count(Comment.id)).filter(Comment.project_id == p.id).scalar() or 0
        neg = db.query(func.count(Analysis.comment_id)).join(Comment).filter(
            Comment.project_id == p.id, Analysis.sentiment == "Negative"
        ).scalar() or 0
        neg_pct = round((neg / total * 100), 1) if total > 0 else 0.0

        out.append({
            "id": p.id,
            "name": p.name,
            "description": p.description or "",
            "neutral_band": p.neutral_band,
            "share_token": p.share_token,
            "is_demo": p.is_demo,
            "created_at": p.created_at.isoformat(),
            "total_comments": total,
            "negative_percentage": neg_pct
        })

    return {
        "status": "success",
        "message": "Projects fetched",
        "data": out
    }

@project_router.post("", status_code=201)
def create_project(data: ProjectCreateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(
        user_id=current_user.id,
        name=data.name,
        description=data.description or "",
        neutral_band=data.neutral_band if data.neutral_band is not None else 0.10,
        is_demo=False
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return {
        "status": "success",
        "message": "Project created",
        "data": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "neutral_band": project.neutral_band,
            "share_token": project.share_token,
            "is_demo": project.is_demo,
            "created_at": project.created_at.isoformat()
        }
    }

@project_router.get("/{project_id}")
def get_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    return {
        "status": "success",
        "message": "Project retrieved",
        "data": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "neutral_band": project.neutral_band,
            "share_token": project.share_token,
            "is_demo": project.is_demo,
            "created_at": project.created_at.isoformat()
        }
    }

@project_router.patch("/{project_id}")
def update_project(project_id: int, data: ProjectUpdateSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or forbidden"
        )

    if project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.neutral_band is not None:
        project.neutral_band = data.neutral_band

    db.commit()
    db.refresh(project)

    return {
        "status": "success",
        "message": "Project updated",
        "data": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "neutral_band": project.neutral_band,
            "share_token": project.share_token,
            "is_demo": project.is_demo,
            "created_at": project.created_at.isoformat()
        }
    }

@project_router.delete("/{project_id}")
def delete_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or forbidden"
        )

    if project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    db.delete(project)
    db.commit()
    return {"status": "success", "message": "Project deleted", "data": None}

@project_router.post("/{project_id}/share")
def toggle_share_token(project_id: int, body: ShareToggleSchema = ShareToggleSchema(), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    if body.enabled:
        if not project.share_token:
            project.share_token = f"sh_{secrets.token_hex(8)}"
    else:
        project.share_token = None

    db.commit()
    db.refresh(project)

    return {
        "status": "success",
        "message": "Share link updated",
        "data": {
            "share_token": project.share_token,
            "share_url": f"/r/{project.share_token}" if project.share_token else None
        }
    }
