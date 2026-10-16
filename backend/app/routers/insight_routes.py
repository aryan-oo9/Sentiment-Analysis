import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from ..database import get_db
from ..models import User, Project, Comment, Analysis, Correction, Theme
from ..auth import get_current_user
from ..ml import ml_engine
from ..llm import llm_service

insight_router = APIRouter(prefix="/api/projects", tags=["insights"])

@insight_router.get("/{project_id}/stats")
def get_project_stats(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    comments = (
        db.query(Comment)
        .options(joinedload(Comment.analysis))
        .filter(Comment.project_id == project.id)
        .all()
    )
    total_comments = len(comments)

    if total_comments == 0:
        return {
            "status": "success",
            "message": "No comments yet",
            "data": {
                "total_comments": 0,
                "sentiment_breakdown": {
                    "positive": 0, "neutral": 0, "negative": 0,
                    "positive_pct": 0.0, "neutral_pct": 0.0, "negative_pct": 0.0
                },
                "average_confidence": 0.0,
                "latency_p50_ms": 0.0,
                "latency_p95_ms": 0.0,
                "priority_counts": {"high": 0, "medium": 0, "low": 0},
                "reviewed_count": 0,
                "agreement_rate": 1.0,
                "daily_trends": [],
                "top_keywords": [],
                "wordcloud": ""
            }
        }

    pos = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Positive")
    neu = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Neutral")
    neg = sum(1 for c in comments if c.analysis and c.analysis.sentiment == "Negative")

    confidences = [c.analysis.confidence for c in comments if c.analysis]
    avg_conf = round(sum(confidences) / len(confidences), 3) if confidences else 0.0

    latencies = sorted([c.analysis.latency_ms for c in comments if c.analysis and c.analysis.latency_ms > 0])
    p50_lat = 0.0
    p95_lat = 0.0
    if latencies:
        p50_idx = int(0.50 * len(latencies))
        p95_idx = int(0.95 * len(latencies))
        p50_lat = round(latencies[min(p50_idx, len(latencies) - 1)], 1)
        p95_lat = round(latencies[min(p95_idx, len(latencies) - 1)], 1)

    high_pri = sum(1 for c in comments if c.analysis and c.analysis.priority == "High Priority")
    med_pri = sum(1 for c in comments if c.analysis and c.analysis.priority == "Medium Priority")
    low_pri = sum(1 for c in comments if c.analysis and c.analysis.priority == "Low Priority")

    # Agreement rate on reviewed comments
    corrections = (
        db.query(Correction)
        .options(joinedload(Correction.comment).joinedload(Comment.analysis))
        .join(Comment)
        .filter(Comment.project_id == project.id)
        .all()
    )
    reviewed_count = len(corrections)
    agreements = 0
    for corr in corrections:
        if corr.comment and corr.comment.analysis:
            if corr.corrected_sentiment == corr.comment.analysis.sentiment:
                agreements += 1
    agreement_rate = round(agreements / reviewed_count, 3) if reviewed_count > 0 else 1.0

    # Daily aggregation & Spike Detection (last 30 days)
    day_map = {}
    for c in comments:
        day_str = c.created_at.strftime("%Y-%m-%d")
        if day_str not in day_map:
            day_map[day_str] = {"date": day_str, "total": 0, "positive": 0, "neutral": 0, "negative": 0}
        day_map[day_str]["total"] += 1
        if c.analysis:
            sent = c.analysis.sentiment.lower()
            if sent in day_map[day_str]:
                day_map[day_str][sent] += 1

    sorted_days = sorted(day_map.values(), key=lambda d: d["date"])
    
    # Calculate spikes
    for idx, d in enumerate(sorted_days):
        d["is_spike"] = False
        if d["total"] >= 10:
            past_window = [
                (x["negative"] / x["total"]) for x in sorted_days[max(0, idx - 7):idx] if x["total"] > 0
            ]
            if len(past_window) >= 3:
                mean_neg = sum(past_window) / len(past_window)
                variance = sum((p - mean_neg) ** 2 for p in past_window) / len(past_window)
                std_dev = math.sqrt(variance)
                current_neg_ratio = d["negative"] / d["total"]
                if current_neg_ratio > (mean_neg + 2 * std_dev) and current_neg_ratio > 0.4:
                    d["is_spike"] = True

    # Top keywords extracted from driving words
    word_counter = Counter()
    for c in comments:
        if c.analysis:
            tw = c.analysis.top_words
            for w, sc in tw.get("negative", []):
                word_counter[w] += 1
            for w, sc in tw.get("positive", []):
                word_counter[w] += 1

    top_keywords = [{"word": w, "count": cnt} for w, cnt in word_counter.most_common(15)]

    # Generate wordcloud
    combined_text = " ".join([c.text for c in comments[:100]])
    wordcloud_b64 = ml_engine.generate_wordcloud(combined_text)

    return {
        "status": "success",
        "message": "Statistics calculated",
        "data": {
            "total_comments": total_comments,
            "sentiment_breakdown": {
                "positive": pos,
                "neutral": neu,
                "negative": neg,
                "positive_pct": round((pos / total_comments) * 100, 1),
                "neutral_pct": round((neu / total_comments) * 100, 1),
                "negative_pct": round((neg / total_comments) * 100, 1)
            },
            "average_confidence": avg_conf,
            "latency_p50_ms": p50_lat,
            "latency_p95_ms": p95_lat,
            "priority_counts": {
                "high": high_pri,
                "medium": med_pri,
                "low": low_pri
            },
            "reviewed_count": reviewed_count,
            "agreement_rate": agreement_rate,
            "daily_trends": sorted_days,
            "top_keywords": top_keywords,
            "wordcloud": wordcloud_b64
        }
    }

@insight_router.post("/{project_id}/briefing")
def get_executive_briefing(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    comments = (
        db.query(Comment)
        .options(joinedload(Comment.analysis))
        .filter(Comment.project_id == project.id)
        .order_by(Comment.created_at.desc())
        .all()
    )
    total = len(comments)
    if total == 0:
        return {
            "status": "success",
            "message": "No comments to analyze",
            "data": {
                "headline": "No feedback collected yet in this workspace.",
                "top_issues": [],
                "suggested_actions": ["Add or import comments to generate an executive briefing."],
                "sampled_comment_ids": []
            }
        }

    neg_comments = [c for c in comments if c.analysis and c.analysis.sentiment == "Negative"]
    sample = [c.text for c in (neg_comments[:8] + comments[:4])]
    sample_ids = [c.id for c in (neg_comments[:8] + comments[:4])]

    neg_count = len(neg_comments)
    neg_pct = round((neg_count / total) * 100, 1)

    briefing_data = llm_service.generate_briefing(
        stats={"total_comments": total, "negative_pct": neg_pct},
        top_comments=sample
    )
    briefing_data["sampled_comment_ids"] = sample_ids[:10]

    return {
        "status": "success",
        "message": "Briefing generated",
        "data": briefing_data
    }

@insight_router.get("/{project_id}/themes")
def get_project_themes(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    themes = db.query(Theme).filter(Theme.project_id == project.id).all()
    out = []
    for t in themes:
        out.append({
            "id": t.id,
            "label": t.label,
            "keywords": t.keywords,
            "size": t.size,
            "representative_comments": t.representative_comments
        })

    return {
        "status": "success",
        "message": "Themes retrieved",
        "data": out
    }
