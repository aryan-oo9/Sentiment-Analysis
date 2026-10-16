from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Comment, Project, ReplyDraft
from ..schemas import ReplyDraftRequestSchema, ReplyDraftUpdateSchema
from ..auth import get_current_user
from ..llm import llm_service

llm_router = APIRouter(prefix="/api", tags=["llm"])

@llm_router.post("/comments/{comment_id}/reply-draft", status_code=201)
def create_reply_draft(
    comment_id: int,
    data: ReplyDraftRequestSchema = ReplyDraftRequestSchema(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found or forbidden")

    if comment.project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

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

    return {
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
    }

@llm_router.patch("/reply-drafts/{draft_id}")
def update_reply_draft(
    draft_id: int,
    data: ReplyDraftUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    draft = db.query(ReplyDraft).join(Comment).join(Project).filter(
        ReplyDraft.id == draft_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
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
