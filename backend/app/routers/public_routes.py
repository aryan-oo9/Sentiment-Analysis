import time
from collections import defaultdict
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from sqlalchemy import text
from ..database import SessionLocal
from ..models import Project, Comment, Analysis
from ..schemas import DemoAnalyzeSchema
from ..ml import ml_engine
from ..llm import llm_service

public_bp = Blueprint("public", __name__)

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

@public_bp.route("/api/demo/analyze", methods=["POST"])
def demo_analyze():
    ip = request.remote_addr or "127.0.0.1"
    if not check_rate_limit(ip):
        return jsonify({
            "status": "error",
            "message": "Rate limit exceeded. Please wait a moment before trying another sentence.",
            "data": None
        }), 429

    try:
        data = DemoAnalyzeSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400
    except Exception:
        return jsonify({"status": "error", "message": "Invalid JSON body", "data": None}), 400

    raw_text = data.text.strip()
    analysis_res = ml_engine.predict_sentiment(raw_text, neutral_band=0.10)
    priority_res = llm_service.classify_priority(raw_text, sentiment=analysis_res["sentiment"])

    return jsonify({
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
    }), 200

@public_bp.route("/api/share/<token>", methods=["GET"])
def get_shared_report(token):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.share_token == token).first()
        if not project:
            return jsonify({"status": "error", "message": "Shared report not found", "data": None}), 404

        comments = db.query(Comment).join(Analysis).filter(Comment.project_id == project.id).all()
        total_comments = len(comments)

        pos = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Positive")
        neu = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Neutral")
        neg = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Negative")

        return jsonify({
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
        }), 200
    finally:
        db.close()

@public_bp.route("/api/health", methods=["GET"])
def health_check():
    db_status = "disconnected"
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"
    finally:
        db.close()

    models_ready = ml_engine.model is not None and ml_engine.vectorizer is not None

    return jsonify({
        "status": "healthy" if db_status == "connected" and models_ready else "degraded",
        "models_loaded": models_ready,
        "database": db_status,
        "version": "2.0.0"
    }), 200
