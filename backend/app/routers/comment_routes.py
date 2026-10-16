import io
from datetime import datetime, timezone
import pandas as pd
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from sqlalchemy import or_
from ..models import Project, Comment, Analysis, Correction, Ticket
from ..schemas import IngestCommentsSchema, CorrectionSchema, TicketUpdateSchema
from ..auth import require_auth
from ..ml import ml_engine
from ..llm import llm_service

comment_bp = Blueprint("comments", __name__)

@comment_bp.route("/api/projects/<int:project_id>/comments", methods=["POST"])
@require_auth
def ingest_pasted_comments(current_user, db, project_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        return jsonify({"status": "error", "message": "Project not found", "data": None}), 404

    try:
        data = IngestCommentsSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400
    except Exception:
        return jsonify({"status": "error", "message": "Invalid JSON body", "data": None}), 400

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

    return jsonify({
        "status": "success",
        "message": f"{len(saved_items)} comments analyzed and saved",
        "data": {
            "ingested_count": len(saved_items),
            "comments": saved_items
        }
    }), 201

@comment_bp.route("/api/projects/<int:project_id>/import", methods=["POST"])
@require_auth
def import_csv_comments(current_user, db, project_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        return jsonify({"status": "error", "message": "Project not found", "data": None}), 404

    if "file" not in request.files:
        return jsonify({"status": "error", "message": "CSV file is required (multipart 'file')", "data": None}), 400

    file = request.files["file"]
    text_col = request.form.get("text_column", "").strip()
    source_col = request.form.get("source_column", "").strip()

    if not file.filename.lower().endswith(".csv"):
        return jsonify({"status": "error", "message": "Only .csv files are supported", "data": None}), 400

    try:
        df = pd.read_csv(file)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Unable to parse CSV: {str(e)}", "data": None}), 400

    # Auto-detect text column if not specified
    if not text_col:
        candidates = ["text", "comment", "tweet", "feedback", "body", "message"]
        for col in df.columns:
            if str(col).lower() in candidates:
                text_col = col
                break
        if not text_col:
            text_col = df.columns[0]

    if text_col not in df.columns:
        return jsonify({
            "status": "error",
            "message": f"Column '{text_col}' not found in CSV. Available columns: {list(df.columns)}",
            "data": None
        }), 400

    # Enforce batch size limit of 500 rows
    MAX_CSV_ROWS = 500
    if len(df) > MAX_CSV_ROWS:
        return jsonify({
            "status": "error",
            "message": f"CSV exceeds maximum batch limit of {MAX_CSV_ROWS} rows (uploaded {len(df)} rows).",
            "data": None
        }), 413

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

    return jsonify({
        "status": "success",
        "message": f"CSV import finished. {processed} rows analyzed, {skipped} rows skipped.",
        "data": {
            "total_processed": processed,
            "skipped_rows": skipped
        }
    }), 201

@comment_bp.route("/api/projects/<int:project_id>/comments", methods=["GET"])
@require_auth
def list_comments(current_user, db, project_id):
    project = db.query(Project).filter(
        Project.id == project_id,
        (Project.user_id == current_user.id) | (Project.is_demo == True)
    ).first()

    if not project:
        return jsonify({"status": "error", "message": "Project not found", "data": None}), 404

    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 25))))
    sentiment = request.args.get("sentiment", "all").strip()
    priority = request.args.get("priority", "all").strip()
    source = request.args.get("source", "all").strip()
    search = request.args.get("search", "").strip()

    q = db.query(Comment).join(Analysis).filter(Comment.project_id == project.id)

    if sentiment != "all":
        q = q.filter(Analysis.sentiment == sentiment)
    if priority != "all":
        q = q.filter(Analysis.priority == priority)
    if source != "all":
        q = q.filter(Comment.source == source)
    if search:
        q = q.filter(Comment.text.ilike(f"%{search}%"))

    total_items = q.count()
    comments = q.order_by(Comment.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

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

    return jsonify({
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
    }), 200

@comment_bp.route("/api/comments/<int:comment_id>", methods=["DELETE"])
@require_auth
def delete_comment(current_user, db, comment_id):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        Project.user_id == current_user.id
    ).first()

    if not comment:
        return jsonify({"status": "error", "message": "Comment not found or forbidden", "data": None}), 404

    db.delete(comment)
    db.commit()
    return jsonify({"status": "success", "message": "Comment deleted", "data": None}), 200

@comment_bp.route("/api/comments/<int:comment_id>/correct", methods=["POST"])
@require_auth
def submit_correction(current_user, db, comment_id):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        Project.user_id == current_user.id
    ).first()

    if not comment:
        return jsonify({"status": "error", "message": "Comment not found", "data": None}), 404

    try:
        data = CorrectionSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400

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

    return jsonify({
        "status": "success",
        "message": "Correction recorded",
        "data": {
            "comment_id": comment.id,
            "original_sentiment": comment.analysis.sentiment if comment.analysis else "Unknown",
            "corrected_sentiment": data.corrected_sentiment
        }
    }), 200

@comment_bp.route("/api/comments/<int:comment_id>/ticket", methods=["PATCH"])
@require_auth
def update_ticket(current_user, db, comment_id):
    comment = db.query(Comment).join(Project).filter(
        Comment.id == comment_id,
        Project.user_id == current_user.id
    ).first()

    if not comment:
        return jsonify({"status": "error", "message": "Comment not found", "data": None}), 404

    try:
        data = TicketUpdateSchema(**request.get_json(force=True))
    except ValidationError as e:
        return jsonify({"status": "error", "message": e.errors()[0]["msg"], "data": None}), 400

    ticket = db.query(Ticket).filter(Ticket.comment_id == comment_id).first()
    if not ticket:
        ticket = Ticket(comment_id=comment_id, status=data.status, note=data.note)
        db.add(ticket)
    else:
        ticket.status = data.status
        if data.note is not None:
            ticket.note = data.note

    db.commit()

    return jsonify({
        "status": "success",
        "message": "Ticket updated",
        "data": {
            "comment_id": comment.id,
            "status": ticket.status,
            "note": ticket.note
        }
    }), 200
