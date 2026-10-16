import io
import time
import re
import html
import json
import socket
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from ..database import get_db
from ..models import User, Project, Comment, Analysis, Correction, Ticket
from ..schemas import IngestCommentsSchema, CorrectionSchema, TicketUpdateSchema, PullRequestSchema
from ..auth import get_current_user
from ..ml import ml_engine
from ..llm import llm_service

comment_router = APIRouter(prefix="/api", tags=["comments"])

_pull_rate_limit: dict = {}

def check_pull_rate_limit(user_id: int, max_requests: int = 10, window_sec: int = 60):
    now = time.time()
    user_timestamps = _pull_rate_limit.get(user_id, [])
    recent = [t for t in user_timestamps if now - t < window_sec]
    if len(recent) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Max 10 pulls per minute."
        )
    recent.append(now)
    _pull_rate_limit[user_id] = recent

def clean_hn_html(raw_html: str) -> str:
    """Clean Hacker News comment HTML tags and entities."""
    if not raw_html:
        return ""
    text = re.sub(r'<br\s*/?>', '\n', raw_html, flags=re.I)
    text = re.sub(r'</?p>', '\n', text, flags=re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text).strip()
    return text

@comment_router.post("/projects/{project_id}/comments", status_code=201)
def ingest_pasted_comments(
    project_id: int,
    data: IngestCommentsSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    saved_items = []
    for item in data.comments:
        raw_text = item.text.strip()
        if len(raw_text) < 2:
            continue

        analysis_res = ml_engine.predict_sentiment(raw_text, neutral_band=project.neutral_band)
        priority_res = llm_service.classify_priority(raw_text, sentiment=analysis_res["sentiment"])

        c = Comment(
            project_id=project.id,
            source=item.source or "paste",
            text=raw_text
        )
        db.add(c)
        db.flush()

        a = Analysis(
            comment_id=c.id,
            sentiment=analysis_res["sentiment"],
            confidence=analysis_res["confidence"],
            polarity=analysis_res["polarity"],
            priority=priority_res["priority"],
            priority_reason=priority_res["priority_reason"],
            priority_source=priority_res["priority_source"],
            latency_ms=analysis_res["latency_ms"],
            model_version=analysis_res["model_version"]
        )
        a.top_words = analysis_res["top_words"]
        db.add(a)

        t = Ticket(comment_id=c.id, status="New")
        db.add(t)

        saved_items.append({
            "id": c.id,
            "text": c.text,
            "source": c.source,
            "created_at": c.created_at.isoformat(),
            "analysis": {
                "sentiment": a.sentiment,
                "confidence": a.confidence,
                "polarity": a.polarity,
                "priority": a.priority,
                "priority_reason": a.priority_reason,
                "priority_source": a.priority_source,
                "top_words": a.top_words,
                "latency_ms": a.latency_ms
            }
        })

    db.commit()

    return {
        "status": "success",
        "message": f"{len(saved_items)} comments analyzed and saved",
        "data": {
            "ingested_count": len(saved_items),
            "comments": saved_items
        }
    }

@comment_router.post("/projects/{project_id}/import", status_code=201)
def import_csv_comments(
    project_id: int,
    file: UploadFile = File(...),
    text_column: Optional[str] = Form(None),
    source_column: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .csv files are supported")

    content = file.file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unable to parse CSV: {str(e)}")

    text_col = (text_column or "").strip()
    source_col = (source_column or "").strip()

    if not text_col:
        candidates = ["text", "comment", "tweet", "feedback", "body", "message"]
        for col in df.columns:
            if str(col).lower() in candidates:
                text_col = col
                break
        if not text_col:
            text_col = df.columns[0]

    if text_col not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Column '{text_col}' not found in CSV. Available columns: {list(df.columns)}"
        )

    MAX_CSV_ROWS = 500
    if len(df) > MAX_CSV_ROWS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"CSV exceeds maximum batch limit of {MAX_CSV_ROWS} rows (uploaded {len(df)} rows)."
        )

    processed = 0
    skipped = 0

    for _, row in df.iterrows():
        raw_val = row.get(text_col)
        if pd.isna(raw_val) or not str(raw_val).strip() or len(str(raw_val).strip()) < 2:
            skipped += 1
            continue

        raw_text = str(raw_val).strip()
        source_val = "csv"
        if source_col and source_col in df.columns and not pd.isna(row.get(source_col)):
            source_val = str(row[source_col]).strip()[:50]

        analysis_res = ml_engine.predict_sentiment(raw_text, neutral_band=project.neutral_band)
        priority_res = llm_service.classify_priority(raw_text, sentiment=analysis_res["sentiment"])

        c = Comment(
            project_id=project.id,
            source=source_val,
            text=raw_text
        )
        db.add(c)
        db.flush()

        a = Analysis(
            comment_id=c.id,
            sentiment=analysis_res["sentiment"],
            confidence=analysis_res["confidence"],
            polarity=analysis_res["polarity"],
            priority=priority_res["priority"],
            priority_reason=priority_res["priority_reason"],
            priority_source=priority_res["priority_source"],
            latency_ms=analysis_res["latency_ms"],
            model_version=analysis_res["model_version"]
        )
        a.top_words = analysis_res["top_words"]
        db.add(a)

        t = Ticket(comment_id=c.id, status="New")
        db.add(t)

        processed += 1

    db.commit()

    return {
        "status": "success",
        "message": f"CSV import finished. {processed} rows analyzed, {skipped} rows skipped.",
        "data": {
            "total_processed": processed,
            "skipped_rows": skipped
        }
    }

@comment_router.get("/projects/{project_id}/comments")
def list_comments(
    project_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    sentiment: str = Query("all"),
    priority: str = Query("all"),
    source: str = Query("all"),
    search: str = Query(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    q = db.query(Comment).join(Analysis).filter(Comment.project_id == project.id)

    if sentiment != "all":
        q = q.filter(Analysis.sentiment == sentiment)
    if priority != "all":
        q = q.filter(Analysis.priority == priority)
    if source != "all":
        q = q.filter(Comment.source == source)
    if search.strip():
        q = q.filter(Comment.text.ilike(f"%{search.strip()}%"))

    total_items = q.count()
    comments = (
        q.options(
            joinedload(Comment.analysis),
            joinedload(Comment.correction),
            joinedload(Comment.ticket)
        )
        .order_by(Comment.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for c in comments:
        a = c.analysis
        corr = c.correction
        t = c.ticket
        items.append({
            "id": c.id,
            "text": c.text,
            "source": c.source,
            "created_at": c.created_at.isoformat(),
            "analysis": {
                "sentiment": a.sentiment if a else "Neutral",
                "confidence": a.confidence if a else 0.5,
                "polarity": a.polarity if a else 0.0,
                "priority": a.priority if a else "Medium Priority",
                "priority_reason": a.priority_reason if a else None,
                "priority_source": a.priority_source if a else "rules",
                "top_words": a.top_words if a else {"negative": [], "positive": []},
                "latency_ms": a.latency_ms if a else 0.0
            },
            "correction": {
                "corrected_sentiment": corr.corrected_sentiment,
                "created_at": corr.created_at.isoformat()
            } if corr else None,
            "ticket": {
                "status": t.status if t else "New",
                "note": t.note if t else None
            } if t else None
        })

    total_pages = (total_items + limit - 1) // limit

    return {
        "status": "success",
        "message": "Comments retrieved",
        "data": {
            "comments": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_items": total_items,
                "total_pages": total_pages
            }
        }
    }

@comment_router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
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

    db.delete(comment)
    db.commit()
    return {"status": "success", "message": "Comment deleted", "data": None}

@comment_router.post("/comments/{comment_id}/correct")
def submit_correction(
    comment_id: int,
    data: CorrectionSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    existing = db.query(Correction).filter(Correction.comment_id == comment_id).first()
    if existing:
        existing.corrected_sentiment = data.corrected_sentiment
        existing.created_at = datetime.now(timezone.utc)
    else:
        new_corr = Correction(
            comment_id=comment.id,
            user_id=current_user.id,
            corrected_sentiment=data.corrected_sentiment
        )
        db.add(new_corr)

    db.commit()

    return {
        "status": "success",
        "message": "Correction recorded",
        "data": {
            "comment_id": comment.id,
            "original_sentiment": comment.analysis.sentiment if comment.analysis else "Unknown",
            "corrected_sentiment": data.corrected_sentiment
        }
    }

@comment_router.patch("/comments/{comment_id}/ticket")
def update_ticket(
    comment_id: int,
    data: TicketUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    ticket = db.query(Ticket).filter(Ticket.comment_id == comment_id).first()
    if not ticket:
        ticket = Ticket(comment_id=comment_id, status=data.status, note=data.note)
        db.add(ticket)
    else:
        ticket.status = data.status
        if data.note is not None:
            ticket.note = data.note

    db.commit()

    return {
        "status": "success",
        "message": "Ticket updated",
        "data": {
            "comment_id": comment.id,
            "status": ticket.status,
            "note": ticket.note
        }
    }

@comment_router.post("/projects/{project_id}/pull", status_code=200)
def pull_comments_from_source(
    project_id: int,
    data: PullRequestSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.is_demo or current_user.email == "demo@tweetsense.io":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sample data, read-only. Create your own project to edit."
        )

    # Server-side rate limit (10 pulls / min)
    check_pull_rate_limit(current_user.id)

    # Query Algolia HN API
    url = f"https://hn.algolia.com/api/v1/search?query={urllib.parse.quote_plus(data.query)}&tags=comment&hitsPerPage={data.limit}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "TweetSense/2.0 (Sentiment Analysis Platform)",
            "Accept": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=8.0) as resp:
            body = resp.read().decode("utf-8")
            res_json = json.loads(body)
    except urllib.error.HTTPError as he:
        if he.code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Hacker News Algolia rate limit exceeded. Please wait a moment."
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hacker News API returned error {he.code}."
        )
    except (urllib.error.URLError, TimeoutError, socket.timeout):
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Hacker News API timed out. Please try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to query Hacker News: {str(e)}"
        )

    hits = res_json.get("hits", [])
    if not hits:
        return {
            "status": "success",
            "message": "No matching Hacker News comments found for query",
            "data": {
                "ingested_count": 0,
                "items": []
            }
        }

    saved_items = []
    for hit in hits:
        raw_html = hit.get("comment_text") or hit.get("story_text") or hit.get("title") or ""
        text = clean_hn_html(raw_html)
        if len(text) < 2:
            continue

        posted_at = None
        if hit.get("created_at"):
            try:
                iso_str = hit["created_at"].replace("Z", "+00:00")
                posted_at = datetime.fromisoformat(iso_str)
            except Exception:
                posted_at = None
        if not posted_at and hit.get("created_at_i"):
            try:
                posted_at = datetime.fromtimestamp(hit["created_at_i"], tz=timezone.utc)
            except Exception:
                posted_at = None
        if not posted_at:
            posted_at = datetime.now(timezone.utc)

        analysis_res = ml_engine.predict_sentiment(text, neutral_band=project.neutral_band)
        priority_res = llm_service.classify_priority(text, sentiment=analysis_res["sentiment"])

        c = Comment(
            project_id=project.id,
            source="hn",
            text=text,
            posted_at=posted_at
        )
        db.add(c)
        db.flush()

        a = Analysis(
            comment_id=c.id,
            sentiment=analysis_res["sentiment"],
            confidence=analysis_res["confidence"],
            polarity=analysis_res["polarity"],
            priority=priority_res["priority"],
            priority_reason=priority_res["priority_reason"],
            priority_source=priority_res["priority_source"],
            latency_ms=analysis_res["latency_ms"],
            model_version=analysis_res["model_version"]
        )
        a.top_words = analysis_res["top_words"]
        db.add(a)

        t = Ticket(comment_id=c.id, status="New")
        db.add(t)

        saved_items.append({
            "id": c.id,
            "text": c.text,
            "source": c.source,
            "posted_at": c.posted_at.isoformat(),
            "created_at": c.created_at.isoformat(),
            "analysis": {
                "sentiment": a.sentiment,
                "confidence": a.confidence,
                "polarity": a.polarity,
                "priority": a.priority,
                "priority_reason": a.priority_reason,
                "priority_source": a.priority_source,
                "top_words": a.top_words,
                "latency_ms": a.latency_ms
            }
        })

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully pulled and analyzed {len(saved_items)} comments from Hacker News",
        "data": {
            "ingested_count": len(saved_items),
            "items": saved_items
        }
    }

