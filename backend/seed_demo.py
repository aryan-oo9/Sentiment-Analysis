import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, init_db
from app.models import User, Project, Comment, Analysis, Correction, Theme, Ticket
from app.auth import hash_password
from app.ml import ml_engine
from app.llm import llm_service

DEMO_COMMENTS = [
    # Spike on Day 14 (Authentication and crash reports)
    ("App crashes upon tapping sign-in on iOS 18", "mobile_store", -14),
    ("Screen goes entirely black when typing password on mobile", "mobile_store", -14),
    ("Crash crash crash every single time I open the app!", "twitter_sample", -14),
    ("Cannot login after yesterday's v2.1 update. Fix this ASAP", "email_export", -14),
    ("Major regression in login flow. Freezes on 2FA prompt", "mobile_store", -14),
    ("Total failure to authenticate today. Customer support isn't responding", "twitter_sample", -14),
    ("App crashes immediately on startup after update", "mobile_store", -14),
    ("Cannot access my account. Error code 500 on login", "email_export", -14),
    ("Terrible bug in login screen, keeps looping", "mobile_store", -14),
    ("Broke my workflow completely this morning with constant crashes", "twitter_sample", -14),
    ("Crashing whenever biometric face ID triggers", "mobile_store", -14),
    ("Authentication timeout on every attempt", "email_export", -14),

    # Positive experiences
    ("The new dark mode aesthetic is absolutely stunning and clean!", "twitter_sample", -18),
    ("Super intuitive UI and lightning fast load times on desktop", "twitter_sample", -16),
    ("Customer support resolved my billing inquiry in under 10 minutes. Fantastic work!", "email_export", -12),
    ("Extremely smooth onboarding flow for our team. Love the simplicity", "email_export", -10),
    ("Exporting CSVs is seamless now. Great improvement over v1", "email_export", -8),
    ("Clean, restrained design with no bloated animations. Respect!", "twitter_sample", -6),
    ("Best feedback tool we have tested this year. Highly recommend", "twitter_sample", -4),
    ("Great responsiveness and clean layout on tablet screens", "mobile_store", -2),
    ("App feels much faster today. Thanks for the quick maintenance", "twitter_sample", -1),

    # Medium friction / feedback
    ("Search filters are slightly confusing when selecting date ranges", "email_export", -9),
    ("Would love an automated webhook integration for Discord alerts", "twitter_sample", -7),
    ("Pricing page renewal terms could be clearer regarding team seats", "email_export", -5),
    ("Sync latency takes about 3 seconds when uploading larger datasets", "mobile_store", -3),
    ("Good overall tool, but keyboard shortcut navigation needs polish", "twitter_sample", -1),

    # Neutral comments
    ("Received the standard release notification email today.", "email_export", -15),
    ("Updated the workspace name in project configuration.", "email_export", -11),
    ("Testing comment ingestion pipeline with sample payload.", "twitter_sample", -7),
    ("Exported summary report for weekly internal review meeting.", "email_export", -3),
]

def seed_demo_workspace():
    print("[*] Initializing database...")
    init_db()
    db = SessionLocal()

    try:
        # Create Demo User if not exists
        demo_user = db.query(User).filter(User.email == "demo@tweetsense.io").first()
        if not demo_user:
            demo_user = User(
                email="demo@tweetsense.io",
                password_hash=hash_password("DemoGuest1234!")
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print(f"[+] Created demo user: {demo_user.email}")

        # Create Demo Project if not exists
        demo_project = db.query(Project).filter(Project.is_demo == True).first()
        if demo_project:
            print(f"[*] Demo project already exists (ID: {demo_project.id}). Skipping seed.")
            return

        demo_project = Project(
            user_id=demo_user.id,
            name="Sample: Product Launch Feedback",
            description="Synthetic demonstration project with 30+ sample customer inquiries across 3 sources and a verified negative crash spike.",
            neutral_band=0.10,
            share_token="sample_launch_demo",
            is_demo=True
        )
        db.add(demo_project)
        db.commit()
        db.refresh(demo_project)
        print(f"[+] Created demo project: {demo_project.name} (ID: {demo_project.id})")

        now = datetime.now(timezone.utc)

        # Ingest sample comments
        print(f"[*] Ingesting {len(DEMO_COMMENTS)} synthetic comments...")
        for text, source, days_ago in DEMO_COMMENTS:
            created_time = now + timedelta(days=days_ago)

            analysis_res = ml_engine.predict_sentiment(text, neutral_band=0.10)
            priority_res = llm_service.classify_priority(text, sentiment=analysis_res["sentiment"])

            c = Comment(
                project_id=demo_project.id,
                source=source,
                text=text,
                created_at=created_time,
                posted_at=created_time
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
                model_version="v2.0-linear"
            )
            a.top_words = analysis_res["top_words"]
            db.add(a)

            t = Ticket(comment_id=c.id, status="New")
            db.add(t)

        # Seed two human corrections to demonstrate agreement rate
        first_comment = db.query(Comment).filter(Comment.project_id == demo_project.id).first()
        if first_comment:
            corr = Correction(
                comment_id=first_comment.id,
                user_id=demo_user.id,
                corrected_sentiment="Negative"
            )
            db.add(corr)

        # Seed two clustered themes
        t1 = Theme(
            project_id=demo_project.id,
            label="Mobile Authentication & Login Crashes",
            size=12,
            keywords_json='["crash", "login", "freeze", "black screen", "ios 18"]',
            representative_comments_json='["App crashes upon tapping sign-in on iOS 18", "Screen goes entirely black when typing password on mobile"]'
        )
        t2 = Theme(
            project_id=demo_project.id,
            label="Design Aesthetics & Responsive Speed",
            size=9,
            keywords_json='["dark mode", "aesthetic", "fast", "clean", "onboarding"]',
            representative_comments_json='["The new dark mode aesthetic is absolutely stunning and clean!", "Super intuitive UI and lightning fast load times on desktop"]'
        )
        db.add(t1)
        db.add(t2)

        db.commit()
        print("[+] Demo project successfully seeded!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_workspace()
