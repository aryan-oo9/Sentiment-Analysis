import io

def test_paste_ingestion(client, auth_headers):
    # Create project
    proj_res = client.post("/api/projects", headers=auth_headers, json={
        "name": "Ingestion Test Project"
    })
    proj_id = proj_res.get_json()["data"]["id"]

    # Ingest comments
    res = client.post(f"/api/projects/{proj_id}/comments", headers=auth_headers, json={
        "comments": [
            {"text": "The app update crashed on login", "source": "paste"},
            {"text": "Great performance and fast checkout", "source": "paste"}
        ]
    })
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert data["ingested_count"] == 2
    assert len(data["comments"]) == 2

    # Verify inbox contains comments
    inbox_res = client.get(f"/api/projects/{proj_id}/comments", headers=auth_headers)
    assert inbox_res.status_code == 200
    assert inbox_res.get_json()["data"]["pagination"]["total_items"] == 2

def test_csv_ingestion_with_column_mapping(client, auth_headers):
    proj_res = client.post("/api/projects", headers=auth_headers, json={"name": "CSV Project"})
    proj_id = proj_res.get_json()["data"]["id"]

    csv_content = "id,user_feedback,channel\n1,Amazing user experience,support\n2,Broken navigation links,email\n"
    data = {
        "file": (io.BytesIO(csv_content.encode("utf-8")), "feedback.csv"),
        "text_column": "user_feedback",
        "source_column": "channel"
    }

    res = client.post(f"/api/projects/{proj_id}/import", headers=auth_headers, data=data, content_type="multipart/form-data")
    assert res.status_code == 201
    assert res.get_json()["data"]["total_processed"] == 2

def test_csv_batch_limit_enforced(client, auth_headers):
    proj_res = client.post("/api/projects", headers=auth_headers, json={"name": "Large CSV Project"})
    proj_id = proj_res.get_json()["data"]["id"]

    # Generate CSV with 501 rows
    lines = ["id,text"] + [f"{i},comment number {i}" for i in range(501)]
    csv_content = "\n".join(lines)
    data = {
        "file": (io.BytesIO(csv_content.encode("utf-8")), "large.csv"),
        "text_column": "text"
    }

    res = client.post(f"/api/projects/{proj_id}/import", headers=auth_headers, data=data, content_type="multipart/form-data")
    assert res.status_code == 413
    assert "exceeds maximum batch limit" in res.get_json()["message"]

def test_empty_paste_input(client, auth_headers):
    proj_res = client.post("/api/projects", headers=auth_headers, json={"name": "Empty Project"})
    proj_id = proj_res.get_json()["data"]["id"]

    res = client.post(f"/api/projects/{proj_id}/comments", headers=auth_headers, json={
        "comments": []
    })
    assert res.status_code == 400
