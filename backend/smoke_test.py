import sys
import time
import uuid
import requests

def run_smoke_test(base_url="http://127.0.0.1:5000"):
    base_url = base_url.rstrip("/")
    print(f"\n=======================================================")
    print(f"[*] Starting TweetSense v2 Smoke Test against: {base_url}")
    print(f"=======================================================\n")

    # 1. Healthcheck
    print("[1/5] Testing GET /api/health...")
    r = requests.get(f"{base_url}/api/health", timeout=15)
    assert r.status_code == 200, f"Health check failed with HTTP {r.status_code}: {r.text}"
    health_data = r.json()
    assert health_data.get("status") == "healthy", f"Status not healthy: {health_data}"
    assert health_data.get("models_loaded") is True, f"Models not loaded: {health_data}"
    print(f"  --> PASS: {health_data}")

    # 2. Registration
    test_id = uuid.uuid4().hex[:8]
    test_email = f"smoketest_{test_id}@tweetsense.io"
    test_password = "SmokeTestPassword123!"
    print(f"\n[2/5] Testing POST /api/auth/register ({test_email})...")
    r = requests.post(f"{base_url}/api/auth/register", json={
        "email": test_email,
        "password": test_password
    }, timeout=15)
    assert r.status_code in (200, 201), f"Register failed: {r.text}"
    reg_data = r.json()
    token = reg_data["data"]["token"]
    assert token, "No token returned upon registration"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"  --> PASS: User created, JWT acquired")

    # 3. Create Project
    print("\n[3/5] Testing POST /api/projects...")
    r = requests.post(f"{base_url}/api/projects", headers=headers, json={
        "name": f"Smoke Test Project {test_id}",
        "description": "Automated verification workspace",
        "neutral_band": 0.10
    }, timeout=15)
    assert r.status_code in (200, 201), f"Create project failed: {r.text}"
    proj_id = r.json()["data"]["id"]
    print(f"  --> PASS: Workspace created with ID: {proj_id}")

    # 4. Ingest and Analyze Comments
    print(f"\n[4/5] Testing POST /api/projects/{proj_id}/comments (batch ingestion)...")
    payload = {
        "comments": [
            {"text": "Absolutely love the new dark mode and sleek responsive interface!", "source": "smoke_test"},
            {"text": "Awful experience, constant crashes upon tapping submit. Totally broken!", "source": "smoke_test"},
            {"text": "Received the monthly summary email digest this afternoon.", "source": "smoke_test"}
        ]
    }
    r = requests.post(f"{base_url}/api/projects/{proj_id}/comments", headers=headers, json=payload, timeout=20)
    assert r.status_code in (200, 201), f"Ingest comments failed: {r.text}"
    ingest_data = r.json()
    assert ingest_data["data"]["ingested_count"] == 3, f"Unexpected count: {ingest_data}"
    print(f"  --> PASS: 3 comments ingested and analyzed")

    # 5. Fetch project stats and check predictions
    print(f"\n[5/5] Testing GET /api/projects/{proj_id}/stats...")
    r = requests.get(f"{base_url}/api/projects/{proj_id}/stats", headers=headers, timeout=15)
    assert r.status_code == 200, f"Stats failed: {r.text}"
    stats_data = r.json()["data"]
    assert stats_data["total_comments"] == 3, f"Total comments != 3: {stats_data}"
    print(f"  --> PASS: Total comments: {stats_data['total_comments']}")
    print(f"  --> Sentiment breakdown: {stats_data['sentiment_breakdown']}")
    print(f"  --> Inference latency P50: {stats_data['latency_p50_ms']}ms, P95: {stats_data['latency_p95_ms']}ms")

    print("\n=======================================================")
    print("[SUCCESS] ALL 5 SMOKE TEST STEPS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000"
    run_smoke_test(target)
