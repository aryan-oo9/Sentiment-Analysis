from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from ..models import Comment, Project, ReplyDraft
from ..schemas import ReplyDraftRequestSchema, ReplyDraftUpdateSchema
from ..auth import require_auth
from ..llm import llm_service

llm_bp = Blueprint("llm", __name__)

@llm_bp.route("/api/comments/<int:comment_id>/reply-draft", methods=["POST"])
@require_auth
def create_reply_draft(current_user, db, comment_id):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        Project.user_id == current_user.id
    ).first()

    if not comment:
        return jsonify({"status": "error", "message": "Comment not found or forbidden", "data": None}), 404

    try:
        body_json = request.get_json(silent=True) or {}
        data = ReplyDraftRequestSchema(**body_json)
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400

    sentiment = comment.analysis.sentiment if comment.analysis else "Neutral"
    res = llm_service.generate_reply_draft(comment.text, sentiment=sentiment, tone=data.tone)

    draft = ReplyDraft(
        comment_id=comment.id,
        tone=data.tone,
        body=res["draft"],
        status="draft"
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return jsonify({
        "status": "success",
        "message": "Reply draft generated",
        "data": {
            "id": draft.id,
            "comment_id": draft.comment_id,
            "tone": draft.tone,
            "body": draft.body,
            "status": draft.status,
            "created_at": draft.created_at.isoformat()
        }
    }), 201

@llm_bp.route("/api/reply-drafts/<int:draft_id>", methods=["PATCH"])
@require_auth
def update_reply_draft(current_user, db, draft_id):
    draft = db.query(ReplyDraft).join(Comment).join(Project).filter(
        ReplyDraft.id == draft_id,
        Project.user_id == current_user.id
    ).first()

    if not draft:
        return jsonify({"status": "error", "message": "Reply draft not found or forbidden", "data": None}), 404

    try:
        data = ReplyDraftUpdateSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400

    draft.body = data.body
    draft.status = data.status
    db.commit()
    db.refresh(draft)

    return jsonify({
        "status": "success",
        "message": "Reply draft updated",
        "data": {
            "id": draft.id,
            "comment_id": draft.comment_id,
            "tone": draft.tone,
            "body": draft.body,
            "status": draft.status,
            "created_at": draft.created_at.isoformat()
        }
    }), 200
