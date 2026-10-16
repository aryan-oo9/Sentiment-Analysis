import os
import sys
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, init_db
from app.models import User, Project, Comment, Analysis, Correction, Theme, Ticket
from app.auth import hash_password
from app.ml import ml_engine
from app.llm import llm_service

# Pre-curated pool of synthetic comments across categories (Sample Data)
BASELINE_POSITIVE = [
    "[Sample Data] The new dark mode aesthetic is clean and very easy on the eyes.",
    "[Sample Data] Super intuitive UI and lightning fast load times on desktop.",
    "[Sample Data] Customer support resolved my billing inquiry in under 10 minutes. Fantastic work!",
    "[Sample Data] Extremely smooth onboarding flow for our team. Love the simplicity.",
    "[Sample Data] Exporting CSVs is seamless now. Great improvement over previous versions.",
    "[Sample Data] Clean, restrained design with no bloated animations. Respect!",
    "[Sample Data] Best feedback tool we have tested this year. Highly recommend.",
    "[Sample Data] Great responsiveness and clean layout on tablet screens.",
    "[Sample Data] App feels noticeably faster today. Thanks for the quick update.",
    "[Sample Data] Loving the minimal typography and high-contrast tables.",
    "[Sample Data] Simple, dependable, and gets straight to the point.",
    "[Sample Data] Checkout flow was effortless. No hiccups at all.",
    "[Sample Data] Very responsive customer service team on live chat.",
    "[Sample Data] The new search filtering makes finding older entries a breeze.",
    "[Sample Data] Impressive data processing speed even on larger files.",
    "[Sample Data] Clear documentation and easy setup for our department.",
    "[Sample Data] A pleasure to use daily. Clean design language.",
    "[Sample Data] The reporting layout is well structured and presentation ready.",
    "[Sample Data] Solid update with zero performance degradation.",
    "[Sample Data] Reliable uptime and fast navigation between views."
]

BASELINE_NEUTRAL = [
    "[Sample Data] Received the standard release notification email today.",
    "[Sample Data] Updated the workspace name in project configuration.",
    "[Sample Data] Testing comment ingestion pipeline with sample payload.",
    "[Sample Data] Exported summary report for weekly internal review meeting.",
    "[Sample Data] Logged in from a secondary laptop browser session.",
    "[Sample Data] Account settings reviewed and notification preferences saved.",
    "[Sample Data] Browsed through the documentation regarding API rate limits.",
    "[Sample Data] Weekly metrics digest arrived in inbox this morning.",
    "[Sample Data] Checked the version release notes for recent patch notes.",
    "[Sample Data] Standard confirmation email received after password update."
]

BASELINE_NEGATIVE = [
    "[Sample Data] Search filters are slightly confusing when selecting date ranges.",
    "[Sample Data] Would love an automated webhook integration for Discord alerts.",
    "[Sample Data] Pricing renewal terms could be clearer regarding team seats.",
    "[Sample Data] Sync latency takes about 3 seconds when uploading larger datasets.",
    "[Sample Data] Keyboard shortcut navigation needs a little more polish.",
    "[Sample Data] Table column ordering cannot be customized in the current build.",
    "[Sample Data] Wish there was an option to export charts directly as SVG."
]

# Specifically curated with negative valence terms to guarantee negative classification & low polarity
SPIKE_NEGATIVE_COMMENTS = [
    "[Sample Data] Awful update, worst experience ever, totally unusable!",
    "[Sample Data] This app is terrible and completely broken, I hate it.",
    "[Sample Data] Horrible bug ruined my day, so frustrating and bad.",
    "[Sample Data] Extremely disappointed, constantly failing and utterly terrible.",
    "[Sample Data] Another horrible crash, worst app ever made, so annoying and broken.",
    "[Sample Data] Terrible service and broken login, absolute nightmare.",
    "[Sample Data] Hate this terrible update, completely ruined my workflow and buggy.",
    "[Sample Data] Bad experience, app is useless and crashes non stop, very bad.",
    "[Sample Data] Worst customer support ever, utterly awful and unhelpful.",
    "[Sample Data] Broken, buggy, and completely terrible since the update.",
    "[Sample Data] Disastrous update, so frustrating and horrible to use.",
    "[Sample Data] Awful performance, constant freeze and terrible lag."
]

RECOVERY_COMMENTS = [
    "[Sample Data] The hotfix this morning resolved the login crashes. Thank you!",
    "[Sample Data] Authentication is working smoothly again after updating.",
    "[Sample Data] Back into the account without any crashes. Appreciate the swift patch.",
    "[Sample Data] Login issue seems fully fixed now on iOS 18.",
    "[Sample Data] Smooth sign-in restored today. Great turnaround time from support.",
    "[Sample Data] No more black screen on login. Everything back to normal."
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

        # Delete existing demo project if already present to guarantee fresh 150 comments
        existing_demo = db.query(Project).filter(Project.is_demo == True).first()
        if existing_demo:
            print(f"[*] Removing existing demo project (ID: {existing_demo.id}) for clean re-seed...")
            db.delete(existing_demo)
            db.commit()

        demo_project = Project(
            user_id=demo_user.id,
            name="Sample: FinTech Mobile App (Sample Data)",
            description="Synthetic demonstration project with ~150 sample inquiries over 3 weeks, featuring a verified incident spike on Day -7. All data labeled as sample data.",
            neutral_band=0.10,
            share_token="sample_launch_demo",
            is_demo=True
        )
        db.add(demo_project)
        db.commit()
        db.refresh(demo_project)
        print(f"[+] Created demo project: {demo_project.name} (ID: {demo_project.id})")

        now = datetime.now(timezone.utc)
        sources = ["sample_appstore", "sample_support_ticket", "sample_social"]
        
        # Build 150 comments distributed strictly across 21 days
        comment_plan = []
        random.seed(42)  # Deterministic generation

        # Days -20 to -8: Baseline (13 days, 6 comments/day = 78 comments)
        # Low negative baseline (mostly positive & neutral)
        for day_offset in range(20, 7, -1):
            for i in range(6):
                if i < 4:
                    text = random.choice(BASELINE_POSITIVE)
                elif i == 4:
                    text = random.choice(BASELINE_NEUTRAL)
                else:
                    text = random.choice(BASELINE_NEGATIVE)
                source = random.choice(sources)
                comment_plan.append((text, source, -day_offset))

        # Day -7: THE INCIDENT SPIKE (14 comments total: 12 critical negative, 2 neutral)
        # Spike Rule: >= 10 comments that day, > 2 SD above trailing 7-day mean
        for text in SPIKE_NEGATIVE_COMMENTS:
            source = random.choice(["sample_appstore", "sample_social"])
            comment_plan.append((text, source, -7))
        comment_plan.append(("[Sample Data] Checking status dashboard to verify if outage is global.", "sample_support_ticket", -7))
        comment_plan.append(("[Sample Data] Standard system notification received regarding incident report.", "sample_support_ticket", -7))

        # Days -6 to -1: Recovery Period (6 days, 8 comments/day = 48 comments)
        for day_offset in range(6, 0, -1):
            for i in range(8):
                if i < 3:
                    text = random.choice(RECOVERY_COMMENTS)
                elif i < 6:
                    text = random.choice(BASELINE_POSITIVE)
                elif i == 6:
                    text = random.choice(BASELINE_NEUTRAL)
                else:
                    text = random.choice(BASELINE_NEGATIVE)
                source = random.choice(sources)
                comment_plan.append((text, source, -day_offset))

        # Day 0: Today (10 comments: 7 positive, 2 neutral, 1 recovery)
        for i in range(10):
            if i < 7:
                text = random.choice(BASELINE_POSITIVE)
            elif i < 9:
                text = random.choice(BASELINE_NEUTRAL)
            else:
                text = random.choice(RECOVERY_COMMENTS)
            source = random.choice(sources)
            comment_plan.append((text, source, 0))

        # Total comments: 78 + 14 + 48 + 10 = 150 comments!
        print(f"[*] Ingesting and analyzing {len(comment_plan)} synthetic comments across 3 weeks...")

        for idx, (text, source, days_ago) in enumerate(comment_plan):
            # Anchor to noon UTC on that specific date with +/- 2 hours jitter to avoid crossing midnight
            base_date = (now + timedelta(days=days_ago)).replace(hour=12, minute=0, second=0, microsecond=0)
            jitter_minutes = random.randint(-120, 120)
            created_time = base_date + timedelta(minutes=jitter_minutes)

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

        # Seed human review corrections (6 reviews: 5 agreed, 1 corrected -> ~83.3% agreement rate)
        comments = db.query(Comment).filter(Comment.project_id == demo_project.id).limit(6).all()
        for i, c in enumerate(comments):
            corr_sentiment = c.analysis.sentiment if i < 5 else ("Neutral" if c.analysis.sentiment == "Negative" else "Negative")
            corr = Correction(
                comment_id=c.id,
                user_id=demo_user.id,
                corrected_sentiment=corr_sentiment
            )
            db.add(corr)

        # Seed clustered themes
        t1 = Theme(
            project_id=demo_project.id,
            label="Mobile Authentication Timeout & Login Crashes (Sample)",
            size=42,
            keywords_json='["crash", "login", "freeze", "horrible", "terrible", "timeout", "regression"]',
            representative_comments_json='["[Sample Data] Awful update, worst experience ever, totally unusable!", "[Sample Data] This app is terrible and completely broken, I hate it.", "[Sample Data] Horrible bug ruined my day, so frustrating and bad."]'
        )
        t2 = Theme(
            project_id=demo_project.id,
            label="Visual Aesthetics, Dark Mode & Desktop Speed (Sample)",
            size=36,
            keywords_json='["dark mode", "aesthetic", "fast", "clean", "onboarding", "responsive", "typography"]',
            representative_comments_json='["[Sample Data] The new dark mode aesthetic is clean and very easy on the eyes.", "[Sample Data] Super intuitive UI and lightning fast load times on desktop.", "[Sample Data] Extremely smooth onboarding flow for our team. Love the simplicity."]'
        )
        db.add(t1)
        db.add(t2)

        db.commit()
        print(f"[+] Successfully seeded {len(comment_plan)} sample comments into demo workspace!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_workspace()

