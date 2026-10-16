# TweetSense Architecture Guide

> A plain-English, ten-minute guide to how TweetSense v2 works under the hood. Written for students, engineers, and curious reviewers.

---

## 1. The Journey of a Comment (Paste to Dashboard)

```
[User Pastes Text]
       │
       ▼
1. FASTAPI INGESTION (`POST /api/projects/:id/comments/batch`)
   - Validates JSON payload using Pydantic schemas.
   - Escapes malformed strings and rejects empty rows.
       │
       ▼
2. NLP & FEATURE EXTRACTION (`ml_service.py`)
   - Cleans text: lowercases, strips whitespace, standardizes punctuation.
   - Vectorizes text against a pre-fitted 500,000-feature TF-IDF matrix (unigrams + bigrams).
       │
       ▼
3. DUAL-STAGE SENTIMENT CLASSIFICATION
   - **Primary Model**: Logistic Regression (`trained_model.sav`) computes binary probabilities:
     Class 0 (Negative) vs. Class 4 (Positive).
   - **Neutral Heuristic**: TextBlob measures polarity on a scale from -1.0 to +1.0. If polarity falls inside the project's neutral deadband (default `±0.10`), the verdict is set to `Neutral` (confidence: `1.0 - abs(polarity)`).
       │
       ▼
4. TIERED TRIAGE PRIORITY
   - **Tier 1 (External LLM)**: Fast structured JSON call (Groq / Gemini) with 4.0s timeout:
     Returns `High Priority`, `Medium Priority`, or `Low Priority`.
   - **Tier 2 (Deterministic Fallback)**: If LLM fails or times out, regex scans for urgent terms:
     - High: `crash`, `chargeback`, `billing`, `unauthorized`, `broken`, `urgent`.
     - Medium: `slow`, `confusing`, `feature`, `request`.
     - Low: default.
       │
       ▼
5. PERSISTENCE IN POSTGRESQL (Supabase)
   - Inserts row into `comments` (`project_id`, `text`, `source`, `created_at`).
   - Inserts row into `analysis` (`sentiment`, `confidence`, `priority`, `driving_words`).
       │
       ▼
6. DASHBOARD AGGREGATION & RENDERING
   - Client requests `GET /api/projects/:id/stats`.
   - Server runs a single joined query:
     `db.query(Comment).options(joinedload(Comment.analysis), joinedload(Comment.correction))`
   - React 19 dashboard renders sentiment percentage, daily volume spikes, theme clusters, and the triage inbox.
```

---

## 2. The JWT Authentication Flow

TweetSense enforces multi-tenant isolation so workspace data never leaks between users.

1. **Registration / Login**:
   - User submits email and password to `POST /api/auth/login`.
   - Backend queries `users` table and verifies password hash using `bcrypt` (`passlib`).
2. **Token Generation**:
   - Server creates a JSON Web Token signed with HMAC-SHA256 using `JWT_SECRET`.
   - Claims: `sub: user_id`, `email: user_email`, `exp: now + 24 hours`.
3. **Client Storage & Header**:
   - The React frontend stores the token in browser `localStorage`.
   - The API client automatically attaches the header to every authenticated request:
     `Authorization: Bearer <token>`
4. **Tenant Verification on Every Route**:
   - FastAPI dependency `get_current_user` decodes the token.
   - When fetching `/api/projects/:id`, the query filters:
     `Project.id == project_id AND (Project.user_id == current_user.id OR Project.is_demo == True)`
   - Attempting to access another user's project returns **HTTP 404 Not Found** (preventing project ID enumeration).

---

## 3. How Driving Words Are Computed (Linear Explainability)

Unlike deep neural networks that behave like black boxes, a Logistic Regression model is mathematically transparent.

1. **Model Weights**:
   - During training on 1,600,000 Sentiment140 tweets, the model learned a single numerical coefficient $w_i$ for every word $i$ in its 500,000-term vocabulary.
   - **Positive weights ($w_i > 0$)**: Words like `"love"`, `"great"`, `"smooth"` push the decision boundary toward Positive.
   - **Negative weights ($w_i < 0$)**: Words like `"worst"`, `"broken"`, `"crash"` push the decision boundary toward Negative.
2. **Attribution for a Specific Comment**:
   - When a comment is analyzed, TweetSense extracts all n-grams present in the comment that exist in the model's vocabulary.
   - For each word, it looks up the exact learned weight $w_i$.
   - It sorts words by weight magnitude:
     - **Top 3 Positive Influences**: highest positive coefficients.
     - **Top 3 Negative Influences**: lowest negative coefficients.
3. **Operator Inspection**:
   - When an operator clicks a comment in the Triage Inbox, the drawer displays these exact words as pill badges, showing why the machine made its decision.

---

## 4. What Is Real ML, What Is Heuristic, What Is LLM?

TweetSense is designed around pragmatic engineering boundaries. We explicitly separate machine learning from heuristics:

| Component | Technology | Category | Why This Choice? |
| :--- | :--- | :--- | :--- |
| **Sentiment Polarity** | Scikit-Learn Logistic Regression (liblinear) | **Real ML** | Sub-millisecond CPU inference (0.39 ms), zero GPU requirements, and exact mathematical feature attribution. |
| **Feature Representation** | TF-IDF Sparse Matrix (500k unigrams + bigrams) | **Real ML** | Captures word frequencies and two-word pairings (`"not working"`) without memory-heavy dense embeddings. |
| **Neutral Classification** | TextBlob polarity deadband threshold (`±0.10`) | **Heuristic** | Sentiment140 has only binary labels (0 and 4). Rather than faking a 3-class model, we use an honest, tunable heuristic band. |
| **Triage Priority (Tier 1)** | Groq / Gemini (Structured Pydantic JSON) | **LLM** | High-level contextual reasoning to detect churn, chargeback threats, and severe outages in natural language. |
| **Triage Priority (Tier 2)** | Regex domain keyword patterns | **Heuristic** | Failsafe fallback ensuring 100% uptime when external LLM APIs are offline or rate-limited. |
| **Reply Drafting** | Google Gemini / Groq with tone prompt | **LLM** | Generates contextual, empathetic responses for human approval. |
| **Executive Briefing** | Google Gemini / Groq | **LLM** | Synthesizes cluster themes and spikes into human-readable executive anomaly reports. |
| **CSV Export Sanitization** | Formula escaping (`=`, `@`, `+`, `-`) | **Heuristic** | Prevents formula injection attacks in Microsoft Excel and Google Sheets. |

---

## 5. What I Would Change at Scale (100k+ Comments/Day)

If TweetSense grew from a production showcase to enterprise scale, here are the three architectural changes I would make:

### 1. Asynchronous Job Queue (Celery / Redis Queue)
- **Current**: Comments are ingested and analyzed synchronously in batches of up to 500 rows inside the FastAPI request cycle.
- **At Scale**: Ingest endpoints would immediately push raw comment batches into a **Redis Queue (RQ) or AWS SQS**. Dedicated worker pools would pull jobs, vectorize in batched matrix operations, and stream results back via WebSockets or Server-Sent Events (SSE).

### 2. Multi-Tiered Cache (Redis)
- **Current**: Dashboard statistics and keyword clusters are calculated directly in PostgreSQL queries via SQLAlchemy joined queries.
- **At Scale**: Aggregated metrics (`positive_pct`, `negative_pct`, keyword histograms) would be cached in Redis with a 5-minute TTL. Ingestion of new comments would mark the project cache dirty and trigger an incremental background recalculation.

### 3. Secure Token Storage (HTTP-Only Cookies)
- **Current**: JWTs are stored in browser `localStorage` for simplicity in single-page applications.
- **At Scale**: Migrate auth tokens to **HTTP-Only, SameSite=Strict, Secure cookies** paired with a CSRF token header and short-lived access tokens (15 minutes) backed by rotating refresh tokens stored in Redis. This eliminates any vulnerability to Cross-Site Scripting (XSS) token exfiltration.
