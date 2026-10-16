# TweetSense v2 — Deployment Guide

This guide details the production deployment process for TweetSense v2 across **Supabase (PostgreSQL)**, **Render (Flask / ML Backend via Docker)**, and **Vercel (React 19 / Vite SPA)**.

---

## 1. Architectural Topology

```
                  ┌────────────────────────┐
                  │    User / Browser      │
                  └───────────┬────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │ HTTPS                                 │ HTTPS
          ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│  Vercel (SPA)    │ ──── API Calls ───>│  Render (Flask)  │
│  React 19 + Vite │                    │  Docker Container│
└──────────────────┘                    └─────────┬────────┘
                                                  │
                                                  │ PostgreSQL (SSL)
                                                  ▼
                                        ┌──────────────────┐
                                        │     Supabase     │
                                        │   (PostgreSQL)   │
                                        └──────────────────┘
```

---

## 2. Environment Variables Specification

> **Security Mandate**: Never commit `.env` files or secret keys into version control. Set these directly in the Render and Vercel dashboards.

### A. Render (Backend Service)
Configure these in **Render Dashboard → Your Web Service → Environment**:

| Variable Name | Required | Default / Value | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | *(From Supabase)* | Supabase PostgreSQL URI (e.g. `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require`) |
| `JWT_SECRET` | **Yes** | *(Generate random 32+ char)* | High-entropy secret used to sign HS256 auth tokens |
| `LLM_API_KEY` | Optional | *(From Gemini / OpenAI)* | API key for zero-shot priority triage reasoning and support reply generation |
| `LLM_PROVIDER` | Optional | `gemini` | `gemini` or `openai` (fallback to rule-based triage if omitted) |
| `LLM_MODEL` | Optional | `gemini-1.5-flash` | Model identifier |
| `ALLOWED_ORIGINS` | **Yes** | `https://your-app.vercel.app` | Comma-separated allowed frontend origins for CORS |
| `FLASK_ENV` | **Yes** | `production` | Set to `production` |
| `FLASK_DEBUG` | **Yes** | `false` | Disable debug reloader in production |
| `PORT` | Auto | *(Set by Render)* | Render automatically assigns this (typically `10000`) |

---

### B. Vercel (Frontend SPA)
Configure these in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

| Variable Name | Required | Value | Description |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | `https://your-backend.onrender.com` | Base public URL of your deployed Render backend (no trailing slash) |

---

## 3. Deployment Steps

### Step 1: Provision Supabase Database
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Under **Project Settings → Database → Connection string**, select **URI**.
3. Copy the URI. It will look like:
   `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
4. Note: If it uses `postgres://`, our backend automatically normalizes it to `postgresql://`.

---

### Step 2: Deploy Backend to Render

#### Option A: Automatic via `render.yaml` Blueprint
1. In Render, click **New +** → **Blueprint**.
2. Connect your GitHub repository.
3. Render detects `render.yaml` automatically.
4. Fill in the non-synced environment variables (`DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`).

#### Option B: Manual Web Service
1. In Render, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Select **Docker** as the Runtime environment.
4. **Dockerfile Path**: `./backend/Dockerfile`
5. **Docker Context**: `./backend`
6. **Plan**: Free or Starter.
7. Under **Environment Variables**, add the variables listed in Section 2A.
8. **Health Check Path**: `/api/health`.

---

### Step 3: Deploy Frontend to Vercel
1. In Vercel, click **Add New...** → **Project**.
2. Import your GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Framework Preset: **Vite** (Build command: `npm run build`, Output directory: `dist`).
5. Under **Environment Variables**, set:
   `VITE_API_URL` = `https://<your-render-subdomain>.onrender.com`
6. Click **Deploy**.
7. Once deployed, copy your production Vercel URL (e.g., `https://tweetsense.vercel.app`) and update `ALLOWED_ORIGINS` in Render!

---

## 4. Git Push Instructions

Run the following commands in your local repository to push to GitHub:

```bash
# 1. Check your status
git status

# 2. Add remote if not already set (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/tweetsense.git
# Or if origin already exists:
# git remote set-url origin https://github.com/YOUR_USERNAME/tweetsense.git

# 3. Stage and commit all changes
git add .
git commit -m "feat(v2): complete tweet sense v2 production release with docker and vite spa"

# 4. Push to main branch
git branch -M main
git push -u origin main
```

---

## 5. Post-Deployment Verification & Smoke Test

Once the services are deployed and environment variables are confirmed, run the smoke test script against your production backend:

```bash
python backend/smoke_test.py https://your-backend.onrender.com
```

The smoke test validates:
- [x] `/api/health` returns `200 OK` with models loaded
- [x] User registration & authentication with JWT issue
- [x] Workspace creation
- [x] Real-time comment ingestion & TF-IDF linear inference
- [x] Driving words explanation output
