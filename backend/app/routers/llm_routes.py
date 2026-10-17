import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Comment, Project, ReplyDraft
from ..schemas import ReplyDraftRequestSchema, ReplyDraftUpdateSchema
from ..auth import get_current_user, get_user_project_filter
from ..llm import llm_service

llm_router = APIRouter(prefix="/api", tags=["llm"])

# Rate limiter for sample demo drafts: max 5 requests per minute per IP
_demo_draft_rate_limit = defaultdict(list)

def check_demo_draft_rate_limit(ip: str, max_reqs: int = 5, window_sec: int = 60):
    now = time.time()
    recent = [t for t in _demo_draft_rate_limit[ip] if now - t < window_sec]
    if len(recent) >= max_reqs:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo reply draft rate limit exceeded. Please wait a moment."
        )
    recent.append(now)
    _demo_draft_rate_limit[ip] = recent

@llm_router.post("/comments/{comment_id}/reply-draft", status_code=201)
def create_reply_draft(
    comment_id: int,
    request: Request,
    data: ReplyDraftRequestSchema = ReplyDraftRequestSchema(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        get_user_project_filter(current_user)
    ).first()

    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found or forbidden")

    sentiment = comment.analysis.sentiment if comment.analysis else "Neutral"

    # Ephemeral demo generation: generate and return without saving, rate-limited per IP
    if comment.project.is_demo or current_user.email == "demo@tweetsense.io":
        client_ip = request.client.host if request.client else "127.0.0.1"
        check_demo_draft_rate_limit(client_ip)

        res = llm_service.generate_reply_draft(comment.text, sentiment=sentiment, tone=data.tone)
        if res.get("status") == "unavailable" or not res.get("draft"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=res.get("message", "AI reply generation is currently unavailable. No LLM provider reachable.")
            )

        return {
            "status": "success",
            "message": "Sample reply draft generated (ephemeral demo, not persisted)",
            "data": {
                "id": 0,
                "comment_id": comment.id,
                "tone": data.tone,
                "body": res["draft"],
                "status": "draft",
                "created_at": None,
                "is_demo": True,
                "latency_ms": res.get("latency_ms", 0.0)
            }
        }

    res = llm_service.generate_reply_draft(comment.text, sentiment=sentiment, tone=data.tone)

    if res.get("status") == "unavailable" or not res.get("draft"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=res.get("message", "AI reply generation is currently unavailable. No LLM provider reachable.")
        )

    draft = ReplyDraft(
        comment_id=comment.id,
        tone=data.tone,
        body=res["draft"],
        status="draft"
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "status": "success",
        "message": "Reply draft generated",
        "data": {
            "id": draft.id,
            "comment_id": draft.comment_id,
            "tone": draft.tone,
            "body": draft.body,
            "status": draft.status,
            "created_at": draft.created_at.isoformat(),
            "latency_ms": res.get("latency_ms", 0.0)
        }
    }

@llm_router.patch("/reply-drafts/{draft_id}")
def update_reply_draft(
    draft_id: int,
    data: ReplyDraftUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if draft_id == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    draft = db.query(ReplyDraft).join(Comment).join(Project).filter(
        ReplyDraft.id == draft_id,
        get_user_project_filter(current_user)
    ).first()

    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found or forbidden")

    if draft.comment.project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    draft.body = data.body
    draft.status = data.status
    db.commit()
    db.refresh(draft)

    return {
        "status": "success",
        "message": "Reply draft updated",
        "data": {
            "id": draft.id,
            "comment_id": draft.comment_id,
            "tone": draft.tone,
            "body": draft.body,
            "status": draft.status
        }
    }
