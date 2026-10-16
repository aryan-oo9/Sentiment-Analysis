# TweetSense

> **AI Feedback Intelligence & Sentiment Triage Platform**  
> Built with React 19, TypeScript, Flask, and Scikit-Learn.

TweetSense classifies customer feedback, explains the exact words driving the verdict via linear model coefficients, and triages operational priority in real time.

---

## Architecture Overview

- **Frontend (`/frontend`)**: React 19 + TypeScript + Vite Single Page Application styled with custom DTCG design tokens and Tailwind CSS.
- **Backend (`/backend`)**: Modular Flask application serving REST APIs with SQLAlchemy ORM, JWT authentication, and gunicorn production server.
- **ML Engine**: Scikit-Learn Logistic Regression model trained on 1.6M Sentiment140 tweets with a 500,000 n-gram TF-IDF vectorizer, spaCy tokenization, and TextBlob polarity calibration.
- **Database**: PostgreSQL (Supabase) in production / SQLite for local development.

---

## Quickstart (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Start backend (runs on http://localhost:5000)
python run.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Seed Demo Data
To populate the database with a demonstration workspace of ~150 synthetic customer inquiries across 3 weeks with a verified incident spike:
```bash
python backend/seed_demo.py
```
Demo login:
- **Email:** `demo@tweetsense.io`
- **Password:** `DemoGuest1234!`

---

## Production Deployment

- **Backend:** Deploy to Render via Dockerfile (`backend/Dockerfile` using `render.yaml`).
- **Frontend:** Deploy to Vercel (Root Directory: `frontend`). Configure `VITE_API_URL` pointing to the Render backend URL.
