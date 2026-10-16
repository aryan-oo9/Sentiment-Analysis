from app.models import User, Project
from app.auth import hash_password, create_access_token

def test_tenant_isolation(client, db_session, test_user, auth_headers):
    # Create User B
    user_b = User(email="userb@example.com", password_hash=hash_password("Password123!"))
    db_session.add(user_b)
    db_session.commit()
    token_b = create_access_token(user_b.id, user_b.email)
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a private project
    res_a = client.post("/api/projects", headers=auth_headers, json={
        "name": "User A Private Project",
        "description": "Confidential internal feedback"
    })
    assert res_a.status_code == 201
    proj_a_id = res_a.get_json()["data"]["id"]

    # User B should NOT see User A's project in their project list
    res_b_list = client.get("/api/projects", headers=headers_b)
    assert res_b_list.status_code == 200
    b_projects = res_b_list.get_json()["data"]
    assert not any(p["id"] == proj_a_id for p in b_projects)

    # User B should get 404 when trying to view User A's project directly
    res_b_get = client.get(f"/api/projects/{proj_a_id}", headers=headers_b)
    assert res_b_get.status_code == 404

    # User B should get 404 when trying to ingest into User A's project
    res_b_ingest = client.post(f"/api/projects/{proj_a_id}/comments", headers=headers_b, json={
        "comments": [{"text": "Unauthorized comment injection", "source": "hack"}]
    })
    assert res_b_ingest.status_code == 404
