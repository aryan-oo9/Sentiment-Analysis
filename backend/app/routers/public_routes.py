import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..models import Project, Comment, Analysis
from ..schemas import DemoAnalyzeSchema
from ..ml import ml_engine
from ..llm import llm_service

public_router = APIRouter(tags=["public"])

# In-memory IP rate limiter: max 30 requests per 60 seconds
_RATE_LIMIT = defaultdict(list)
MAX_PER_MINUTE = 30

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    _RATE_LIMIT[ip] = [t for t in _RATE_LIMIT[ip] if now - t < 60]
    if len(_RATE_LIMIT[ip]) >= MAX_PER_MINUTE:
        return False
    _RATE_LIMIT[ip].append(now)
    return True

@public_router.post("/api/demo/analyze")
def demo_analyze(data: DemoAnalyzeSchema, request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment before trying another sentence."
        )

    raw_text = data.text.strip()
    analysis_res = ml_engine.predict_sentiment(raw_text, neutral_band=0.10)
    priority_res = llm_service.classify_priority(raw_text, sentiment=analysis_res["sentiment"])

    return {
        "status": "success",
        "message": "Analysis computed",
        "data": {
            "sentiment": analysis_res["sentiment"],
            "confidence": analysis_res["confidence"],
            "polarity": analysis_res["polarity"],
            "priority": priority_res["priority"],
            "priority_reason": priority_res["priority_reason"],
            "priority_source": priority_res["priority_source"],
            "top_words": analysis_res["top_words"],
            "neutral_band_active": analysis_res["neutral_band_active"],
            "latency_ms": analysis_res["latency_ms"]
        }
    }

@public_router.get("/api/share/{token}")
def get_shared_report(token: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.share_token == token).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared report not found"
        )

    comments = db.query(Comment).join(Analysis).filter(Comment.project_id == project.id).all()
    total_comments = len(comments)

    pos = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Positive")
    neu = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Neutral")
    neg = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Negative")

    return {
        "status": "success",
        "message": "Shared report retrieved",
        "data": {
            "project_name": project.name,
            "project_description": project.description,
            "created_at": project.created_at.isoformat(),
            "total_comments": total_comments,
            "sentiment_breakdown": {
                "positive": pos,
                "neutral": neu,
                "negative": neg,
                "positive_pct": round((pos / total_comments * 100), 1) if total_comments > 0 else 0,
                "neutral_pct": round((neu / total_comments * 100), 1) if total_comments > 0 else 0,
                "negative_pct": round((neg / total_comments * 100), 1) if total_comments > 0 else 0
            }
        }
    }

@public_router.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"

    models_ready = ml_engine.model is not None and ml_engine.vectorizer is not None

    return {
        "status": "healthy" if db_status == "connected" and models_ready else "degraded",
        "models_loaded": models_ready,
        "database": db_status,
        "version": "2.0.0"
    }
