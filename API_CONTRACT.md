# TweetSense v2: Formal API Contract

**Specification Version:** 2.0.0  
**Base URL:** `/api`  
**Standard Response Envelope:**
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

**Standard Error Envelope (HTTP 4xx / 5xx):**
```json
{
  "status": "error",
  "message": "Descriptive error message",
  "data": null
}
```

---

## 1. Authentication Endpoints

### 1.1 Register User
- **Method:** `POST`
- **Route:** `/api/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "User registered successfully",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "email": "user@example.com",
        "created_at": "2026-10-16T12:00:00Z"
      }
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: Validation failure (invalid email, password < 8 chars)
  - `409 Conflict`: Email already exists

---

### 1.2 Login User
- **Method:** `POST`
- **Route:** `/api/auth/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "email": "user@example.com"
      }
    }
  }
  ```
- **Errors:**
  - `401 Unauthorized`: Invalid email or password

---

### 1.3 Get Current User Session
- **Method:** `GET`
- **Route:** `/api/auth/me`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Session valid",
    "data": {
      "user": {
        "id": 1,
        "email": "user@example.com",
        "created_at": "2026-10-16T12:00:00Z"
      }
    }
  }
  ```
- **Errors:**
  - `401 Unauthorized`: Token missing, malformed, or expired

---

## 2. Project Endpoints

### 2.1 List Projects
- **Method:** `GET`
- **Route:** `/api/projects`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Projects fetched",
    "data": [
      {
        "id": 1,
        "name": "Product Launch Feedback",
        "description": "Customer comments from v2.0 release",
        "neutral_band": 0.10,
        "share_token": null,
        "is_demo": false,
        "created_at": "2026-10-16T12:00:00Z",
        "total_comments": 142,
        "negative_percentage": 61.2
      }
    ]
  }
  ```

---

### 2.2 Create Project
- **Method:** `POST`
- **Route:** `/api/projects`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "Beta Inquiries",
    "description": "User feedback from beta rollout",
    "neutral_band": 0.10
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Project created",
    "data": {
      "id": 2,
      "name": "Beta Inquiries",
      "description": "User feedback from beta rollout",
      "neutral_band": 0.10,
      "share_token": null,
      "is_demo": false,
      "created_at": "2026-10-16T12:05:00Z"
    }
  }
  ```

---

### 2.3 Get Project Details
- **Method:** `GET`
- **Route:** `/api/projects/:id`
- **Auth:** `Bearer <JWT_TOKEN>` (or public if demo project)
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Project retrieved",
    "data": {
      "id": 1,
      "name": "Product Launch Feedback",
      "description": "Customer comments from v2.0 release",
      "neutral_band": 0.10,
      "share_token": "sh_982bfb19",
      "is_demo": false,
      "created_at": "2026-10-16T12:00:00Z"
    }
  }
  ```

---

### 2.4 Update Project Settings
- **Method:** `PATCH`
- **Route:** `/api/projects/:id`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "Updated Name",
    "neutral_band": 0.15
  }
  ```
- **Response (200 OK):** Returns updated project object.

---

### 2.5 Generate / Revoke Share Token
- **Method:** `POST`
- **Route:** `/api/projects/:id/share`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "enabled": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Share link updated",
    "data": {
      "share_token": "sh_982bfb19",
      "share_url": "/r/sh_982bfb19"
    }
  }
  ```

---

## 3. Comments & Ingestion Endpoints

### 3.1 Ingest Pasted Comments
- **Method:** `POST`
- **Route:** `/api/projects/:id/comments`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "comments": [
      {
        "text": "The latest app update crashes on login every single time.",
        "source": "paste"
      },
      {
        "text": "Smooth onboarding flow and fast delivery, excellent work!",
        "source": "paste"
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "2 comments analyzed and stored",
    "data": {
      "ingested_count": 2,
      "comments": [
        {
          "id": 101,
          "text": "The latest app update crashes on login every single time.",
          "source": "paste",
          "created_at": "2026-10-16T12:10:00Z",
          "analysis": {
            "sentiment": "Negative",
            "confidence": 0.88,
            "polarity": -0.45,
            "priority": "High Priority",
            "priority_reason": "Urgent technical failure blocking core user access.",
            "priority_source": "llm",
            "top_words": {
              "negative": [["crash", -0.42], ["bad", -0.21]],
              "positive": []
            },
            "latency_ms": 14
          }
        }
      ]
    }
  }
  ```

---

### 3.2 Ingest CSV with Column Mapping
- **Method:** `POST`
- **Route:** `/api/projects/:id/import`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Form Data:**
  - `file`: `.csv` file attachment (max 500 rows)
  - `text_column`: name of the text column (e.g. `"comment_text"`)
  - `source_column` (optional): name of the source column (e.g. `"channel"`)
  - `date_column` (optional): name of the date column
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "CSV imported and analyzed successfully",
    "data": {
      "total_processed": 150,
      "skipped_rows": 2
    }
  }
  ```
- **Errors:**
  - `400 Bad Request`: Column not found in CSV or invalid file
  - `413 Payload Too Large`: CSV exceeds 500 rows

---

### 3.3 List Comments (Paginated & Filtered Inbox)
- **Method:** `GET`
- **Route:** `/api/projects/:id/comments`
- **Auth:** `Bearer <JWT_TOKEN>` (or valid share token)
- **Query Parameters:**
  - `page`: default `1`
  - `limit`: default `25` (max `100`)
  - `sentiment`: `Positive` | `Negative` | `Neutral` | `all`
  - `priority`: `High Priority` | `Medium Priority` | `Low Priority` | `all`
  - `source`: filter by origin source
  - `search`: substring search inside comment text
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Comments retrieved",
    "data": {
      "comments": [
        {
          "id": 101,
          "text": "The latest app update crashes on login every single time.",
          "source": "paste",
          "created_at": "2026-10-16T12:10:00Z",
          "analysis": {
            "sentiment": "Negative",
            "confidence": 0.88,
            "polarity": -0.45,
            "priority": "High Priority",
            "priority_reason": "Urgent technical failure blocking core user access.",
            "priority_source": "llm",
            "top_words": {
              "negative": [["crash", -0.42]],
              "positive": []
            }
          },
          "correction": null,
          "ticket": {
            "status": "New",
            "note": null
          }
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 25,
        "total_items": 142,
        "total_pages": 6
      }
    }
  }
  ```

---

### 3.4 Submit Human Sentiment Correction
- **Method:** `POST`
- **Route:** `/api/comments/:id/correct`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "corrected_sentiment": "Neutral"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Correction recorded",
    "data": {
      "comment_id": 101,
      "original_sentiment": "Negative",
      "corrected_sentiment": "Neutral",
      "updated_at": "2026-10-16T12:15:00Z"
    }
  }
  ```

---

### 3.5 Update Ticket Status
- **Method:** `PATCH`
- **Route:** `/api/comments/:id/ticket`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "status": "In progress",
    "note": "Assigned to mobile triage team"
  }
  ```
- **Response (200 OK):** Returns updated ticket object.

---

## 4. Analytics & Insights Endpoints

### 4.1 Project Aggregated Statistics
- **Method:** `GET`
- **Route:** `/api/projects/:id/stats`
- **Auth:** `Bearer <JWT_TOKEN>` (or share token)
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Statistics calculated",
    "data": {
      "total_comments": 142,
      "sentiment_breakdown": {
        "positive": 38,
        "neutral": 17,
        "negative": 87,
        "positive_pct": 26.8,
        "neutral_pct": 12.0,
        "negative_pct": 61.2
      },
      "average_confidence": 0.824,
      "latency_p50_ms": 12.4,
      "latency_p95_ms": 28.1,
      "priority_counts": {
        "high": 42,
        "medium": 78,
        "low": 22
      },
      "reviewed_count": 18,
      "agreement_rate": 0.833,
      "daily_trends": [
        {
          "date": "2026-10-14",
          "total": 35,
          "positive": 5,
          "neutral": 3,
          "negative": 27,
          "is_spike": true
        }
      ],
      "top_keywords": [
        { "word": "crash", "count": 42, "polarity": -0.65 },
        { "word": "login", "count": 38, "polarity": -0.32 },
        { "word": "clean", "count": 21, "polarity": 0.74 }
      ]
    }
  }
  ```

---

### 4.2 AI Executive Briefing
- **Method:** `POST`
- **Route:** `/api/projects/:id/briefing`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Briefing generated",
    "data": {
      "headline": "Post-release sentiment is dominated by auth crash reports.",
      "top_issues": [
        "Authentication timeout preventing login on iOS v2.1",
        "Confusion regarding updated annual pricing tier",
        "Slow sync when connecting external accounts"
      ],
      "suggested_actions": [
        "Deploy hotfix for authentication session token invalidation",
        "Pin FAQ link addressing pricing renewal terms",
        "Acknowledge sync latency on status page"
      ],
      "sampled_comment_ids": [101, 104, 118],
      "is_cached": true,
      "generated_at": "2026-10-16T12:00:00Z"
    }
  }
  ```

---

### 4.3 Clustered Themes
- **Method:** `GET`
- **Route:** `/api/projects/:id/themes`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Themes retrieved",
    "data": [
      {
        "id": 1,
        "label": "Mobile Login Crashes",
        "keywords": ["crash", "login", "freeze", "blank", "app"],
        "size": 52,
        "representative_comments": [
          "Crashes upon tapping sign-in on iOS 18",
          "Screen goes entirely black when typing password"
        ]
      }
    ]
  }
  ```

---

## 5. LLM Workflow & Reply Drafting

### 5.1 Generate Reply Draft
- **Method:** `POST`
- **Route:** `/api/comments/:id/reply-draft`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "tone": "warm" // Options: "warm" | "brief" | "formal"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Reply draft generated",
    "data": {
      "id": 401,
      "comment_id": 101,
      "tone": "warm",
      "body": "Hi there, we're really sorry about the login crashes after this update. Our engineering team is currently deploying a hotfix. In the meantime, re-authenticating after clearing cache should restore access. Thanks for letting us know!",
      "status": "draft",
      "created_at": "2026-10-16T12:20:00Z"
    }
  }
  ```

---

### 5.2 Approve / Edit Reply Draft
- **Method:** `PATCH`
- **Route:** `/api/reply-drafts/:id`
- **Auth:** `Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "body": "Updated reply text...",
    "status": "approved" // Options: "draft" | "approved" | "copied"
  }
  ```
- **Response (200 OK):** Returns updated draft object.

---

## 6. Public & Shared Endpoints

### 6.1 Landing Page Live Demo Analysis
- **Method:** `POST`
- **Route:** `/api/demo/analyze`
- **Auth:** Public (Rate-limited: 30 requests/min per IP)
- **Request Body:**
  ```json
  {
    "text": "Super intuitive UI and lightning fast load times!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Analysis computed",
    "data": {
      "sentiment": "Positive",
      "confidence": 0.94,
      "polarity": 0.72,
      "priority": "Low Priority",
      "top_words": {
        "positive": [["intuitive", 0.51], ["fast", 0.38]],
        "negative": []
      },
      "neutral_band_active": false
    }
  }
  ```

---

### 6.2 Public Shared Project Report
- **Method:** `GET`
- **Route:** `/api/share/:token`
- **Auth:** Public
- **Response (200 OK):** Returns project metadata, aggregate statistics, themes, and executive briefing (raw user emails and passwords redacted).

---

### 6.3 System Health Check
- **Method:** `GET`
- **Route:** `/api/health`
- **Auth:** Public
- **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "models_loaded": true,
    "database": "connected",
    "version": "2.0.0"
  }
  ```
