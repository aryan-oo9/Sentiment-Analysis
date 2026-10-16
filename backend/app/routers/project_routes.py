import secrets
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from sqlalchemy import func
from ..models import Project, Comment, Analysis
from ..schemas import ProjectCreateSchema, ProjectUpdateSchema
from ..auth import require_auth

project_bp = Blueprint("projects", __name__, url_prefix="/api/projects")

@project_bp.route("", methods=["GET"])
@require_auth
def list_projects(current_user, db):
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

    return jsonify({
        "status": "success",
        "message": "Projects fetched",
        "data": out
    }), 200

@project_bp.route("", methods=["POST"])
@require_auth
def create_project(current_user, db):
    try:
        data = ProjectCreateSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400
    except Exception:
        return jsonify({"status": "error", "message": "Invalid JSON body", "data": None}), 400

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

    return jsonify({
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
    }), 201

@project_bp.route("/<int:project_id>", methods=["GET"])
@require_auth
def get_project(current_user, db, project_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        return jsonify({"status": "error", "message": "Project not found", "data": None}), 404

    return jsonify({
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
    }), 200

@project_bp.route("/<int:project_id>", methods=["PATCH"])
@require_auth
def update_project(current_user, db, project_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        return jsonify({"status": "error", "message": "Project not found or forbidden", "data": None}), 404

    try:
        data = ProjectUpdateSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.neutral_band is not None:
        project.neutral_band = data.neutral_band

    db.commit()
    db.refresh(project)

    return jsonify({
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
    }), 200

@project_bp.route("/<int:project_id>", methods=["DELETE"])
@require_auth
def delete_project(current_user, db, project_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        return jsonify({"status": "error", "message": "Project not found or forbidden", "data": None}), 404

    db.delete(project)
    db.commit()
    return jsonify({"status": "success", "message": "Project deleted", "data": None}), 200

@project_bp.route("/<int:project_id>/share", methods=["POST"])
@require_auth
def toggle_share_token(current_user, db, project_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        return jsonify({"status": "error", "message": "Project not found", "data": None}), 404

    body = request.get_json(silent=True) or {}
    enabled = body.get("enabled", True)

    if enabled:
        if not project.share_token:
            project.share_token = f"sh_{secrets.token_hex(8)}"
    else:
        project.share_token = None

    db.commit()
    db.refresh(project)

    return jsonify({
        "status": "success",
        "message": "Share link updated",
        "data": {
            "share_token": project.share_token,
            "share_url": f"/r/{project.share_token}" if project.share_token else None
        }
    }), 200
