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

@public_router.get("/")
def root():
    return {
        "name": "TweetSense API",
        "version": "2.0.0",
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health"
    }

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

from ..models import Project, Comment, Analysis, Theme
from collections import defaultdict, Counter
from sqlalchemy.orm import joinedload

@public_router.get("/api/share/{token}")
def get_shared_report(token: str, db: Session = Depends(get_db)):
    if not token or token == "null":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared report not found"
        )

    project = db.query(Project).filter(Project.share_token == token).first()
    if not project or not project.share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared report not found"
        )

    comments = (
        db.query(Comment)
        .options(joinedload(Comment.analysis))
        .filter(Comment.project_id == project.id)
        .order_by(Comment.created_at.desc())
        .all()
    )
    total_comments = len(comments)

    pos = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Positive")
    neu = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Neutral")
    neg = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Negative")

    confidences = [c.analysis.confidence for c in comments if c.analysis]
    avg_conf = round(sum(confidences) / len(confidences), 3) if confidences else 0.0

    # Daily aggregation & trends for chart
    day_map = {}
    for c in comments:
        day_str = c.created_at.strftime("%Y-%m-%d")
        if day_str not in day_map:
            day_map[day_str] = {"date": day_str, "positive": 0, "neutral": 0, "negative": 0, "total": 0}
        sent = c.analysis.sentiment.lower() if c.analysis else "neutral"
        if sent in day_map[day_str]:
            day_map[day_str][sent] += 1
        day_map[day_str]["total"] += 1

    sorted_days = sorted(day_map.values(), key=lambda d: d["date"])
    if len(sorted_days) >= 3:
        avg_neg = sum(d["negative"] for d in sorted_days) / len(sorted_days)
        for d in sorted_days:
            d["is_spike"] = bool(d["negative"] > 2 * avg_neg and d["negative"] >= 4)
    else:
        for d in sorted_days:
            d["is_spike"] = False

    # Top driving keywords
    keywords_counter = Counter()
    for c in comments:
        if c.analysis and c.analysis.top_words:
            for word, weight in c.analysis.top_words.get("negative", []):
                keywords_counter[word] += 1
            for word, weight in c.analysis.top_words.get("positive", []):
                keywords_counter[word] += 1
    top_keywords = [{"word": w, "count": cnt} for w, cnt in keywords_counter.most_common(12)]

    stats_data = {
        "total_comments": total_comments,
        "sentiment_breakdown": {
            "positive": pos,
            "neutral": neu,
            "negative": neg,
            "positive_pct": round((pos / total_comments * 100), 1) if total_comments > 0 else 0.0,
            "neutral_pct": round((neu / total_comments * 100), 1) if total_comments > 0 else 0.0,
            "negative_pct": round((neg / total_comments * 100), 1) if total_comments > 0 else 0.0
        },
        "average_confidence": avg_conf,
        "daily_trends": sorted_days,
        "top_keywords": top_keywords
    }

    # Themes: comment text hidden by default
    themes_query = db.query(Theme).filter(Theme.project_id == project.id).all()
    themes_data = []
    for t in themes_query:
        themes_data.append({
            "id": t.id,
            "label": t.label,
            "keywords": t.keywords,
            "size": t.size,
            "representative_comments": []  # comment text hidden by default
        })

    # Briefing
    neg_comments = [c for c in comments if c.analysis and c.analysis.sentiment == "Negative"]
    sample = [c.text for c in (neg_comments[:8] + comments[:4])]
    neg_count = len(neg_comments)
    neg_pct = round((neg_count / total_comments) * 100, 1) if total_comments > 0 else 0.0

    briefing_data = llm_service.generate_briefing(
        stats={"total_comments": total_comments, "negative_pct": neg_pct},
        top_comments=sample
    )
    briefing_data.pop("sampled_comment_ids", None)

    return {
        "status": "success",
        "message": "Shared report retrieved",
        "data": {
            "name": project.name,
            "project_name": project.name,
            "project_description": project.description,
            "created_at": project.created_at.isoformat(),
            "stats": stats_data,
            "themes": themes_data,
            "briefing": briefing_data
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
