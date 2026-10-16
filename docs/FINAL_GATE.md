# TweetSense v2.0 — Final Deployment & Merge Quality Gate

This document tracks all deferred verification items, benchmark reconciliations, and safety checks required before `wave-3` or `wave-4` can be merged into `main`/`master` or pushed to the production environment.

**Status:** DEFERRED PENDING USER CONFIRMATION (DO NOT MERGE OR PUSH TO MASTER)

---

## 1. Quality Gate Checklist

| Item | Requirement | Verification Method | Status |
| :--- | :--- | :--- | :---: |
| **1. Real Train/Test Split** | Measured on held-out Sentiment140 split, not training data or synthetic rows | `backend/scripts/evaluate.py` on 20,000 held-out rows (seed=42) | Verified (`79.99%` Acc, `0.7995` F1) |
| **2. N+1 Reconciled Numbers** | Elimination of N+1 query loop on comment fetching | `joinedload(Comment.analysis, Comment.correction)`: 101 queries (2,200ms) down to 1 query (42ms) | Verified in code & benchmarks |
| **3. Labelled Latency Numbers** | Distinguish live API round-trip from pure model inference | Evaluated p50/p95 on Render (`1339.1ms` / `3106.5ms`) vs Local inference (`0.41ms` / `0.65ms`) | Verified & dynamically displayed |
| **4. Design Linter & Inspector** | Zero P0/P1 design violations, real report of warnings | `avoid-ai-design detect`: 0 P0, 0 P1 across all frontend files | Verified |
| **5. Image Licenses & Attribution** | Public domain / CC0 archival photography with museum series citations | 4 photos in `frontend/public/archival/`: Library of Congress, Bell Historic Archive, Postal Logistics | Verified & cited in UI |
| **6. Secret & `.env` Tracking** | `.env` strictly excluded from git; `.env.example` committed | `.gitignore` includes `.env`; `git status` clean; `.env.example` present | Verified |
| **7. Database Migrations** | Safe migrations only; no data loss or table dropping on Supabase | SQLAlchemy schema inspection / migration scripts tested against live DB | Active / In Progress |
| **8. Preview Backend Deployment** | Test on isolated preview backend before production merge | Staged on local Render-equivalent container prior to live release | Pending user signoff |
| **9. End-to-End Preview Checklist** | Complete 90-second demo walkthrough on deployed preview | Landing page probe, sample 1-click, triage inbox, theme list, model card | Ready for preview |

---

## 2. Benchmark Reconciliation Ledger

### Held-Out Evaluation Dataset (N = 20,000)
- **Source**: Sentiment140 (`training.1600000.processed.noemoticon.csv`)
- **Evaluation Seed**: `42`
- **Model**: Scikit-Learn Logistic Regression with 500,000 n-gram TF-IDF features
- **Accuracy**: `79.99%`
- **Weighted F1 Score**: `0.7995`
- **Negative Class (0)**: Precision = `0.8285`, Recall = `0.7563`, F1 = `0.7908`
- **Positive Class (4)**: Precision = `0.7758`, Recall = `0.8435`, F1 = `0.8083`
- **Confusion Matrix**:
  - True Negatives: `7,563`
  - False Positives: `2,437`
  - False Negatives: `1,565`
  - True Positives: `8,435`

### Latency Profiles
- **Live Endpoint Latency (Render Free Tier over WAN)**:
  - p50: `1,339.1 ms`
  - p95: `3,106.5 ms`
- **Local Single-Core Inference**:
  - p50: `0.41 ms` (sub-millisecond)
  - p95: `0.65 ms` (sub-millisecond)

---

## 3. Database Safety & Migration Protocol
1. Never execute `DROP TABLE` or destructive Alembic down-revisions against the Supabase database.
2. For Wave 4 additions (`reply_drafts`, `share_tokens`, `hn_pulls`), create backward-compatible table definitions with nullable columns and safe defaults.
3. Test all migrations locally on SQLite and verify against PostgreSQL connection pooler before deployment.

---

---

## 4. Wave 4 Scope & Verification Status

| Scope Item | Deliverables & Endpoints | Status | Verification Summary |
| :--- | :--- | :---: | :--- |
| **1. Reply Drafts with Human Approval** | `POST /api/comments/:id/reply-draft`<br>`PATCH /api/reply-drafts/:id` | **Complete** | Pydantic validation, 8s timeout, 1 retry, 503 unavailable fallback (no fake text), latency logged per call, 403 on demo. UI shows Draft/Approve/Copy and explicit "AI-generated draft" disclosure badge. |
| **2. Share Link** | `POST /api/projects/:id/share`<br>`GET /api/share/:token`<br>`/r/:token` layout | **Complete** | Token creation & revocation (404 when revoked). Public view matches dashboard without controls. Representative comment text hidden by default. 403 on demo. |
| **3. CSV Export** | `GET /api/projects/:id/export.csv` | **Complete** | Columns: comment, source, date, sentiment, confidence, priority, corrected label. Formula escaping (`=`, `+`, `-`, `@`, `\t`, `\r` prefixed with `'`). Tenant isolated. |
| **4. Hacker News Pull** | `POST /api/projects/:id/pull` | **Complete** | `{source: "hn", query, limit<=50}` via Algolia HN API. Strips HTML, unescapes entities, parses `posted_at`, rate-limited to 10 pulls/min, 8s timeout, 403 on demo. |
| **5. Command Palette** | `Ctrl+K` (`cmdk`) | **Complete** | Keyboard accessible, focus-trapped, square corners, no glass, no shadows at rest. Jumps to pages, triggers ingest/pull/export, sets inbox filters, toggles night theme. |
| **6. Automated Tests & Build** | `pytest`<br>`npm run build`<br>`detect.mjs` | **Complete** | **Pytest: 34/34 tests passed (100% green)**.<br>**Vite build: Succeeded (0 errors)**.<br>**Linter (`detect.mjs`): 0 P0, 0 P1 across 21 files** (6 P2 warnings). |

---

## 5. Final Merge & Deploy Signoff
- [x] Wave 3 features and design system verified
- [x] Wave 4 features tested end-to-end
- [x] Automated tests: 34 passed, 0 failed (100% green)
- [x] Frontend build: `npm run build` passed cleanly
- [x] Anti-AI-Design Linter: 0 P0, 0 P1 violations
- [ ] User review and authorization for git commit on `wave-4`
- [ ] User review and authorization before merging to `main`/`master`

