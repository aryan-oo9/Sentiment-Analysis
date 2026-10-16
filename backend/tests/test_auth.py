def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "password": "SecurePassword123!"
    })
    assert res.status_code == 201
    json_data = res.get_json()
    assert json_data["status"] == "success"
    assert "token" in json_data["data"]
    assert json_data["data"]["user"]["email"] == "newuser@example.com"

def test_register_duplicate_email(client, test_user):
    res = client.post("/api/auth/register", json={
        "email": test_user.email,
        "password": "AnotherPassword123!"
    })
    assert res.status_code == 409
    json_data = res.get_json()
    assert json_data["status"] == "error"

def test_register_short_password(client):
    res = client.post("/api/auth/register", json={
        "email": "valid@example.com",
        "password": "short"
    })
    assert res.status_code == 400
    json_data = res.get_json()
    assert json_data["status"] == "error"

def test_login_success(client, test_user):
    res = client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "Password123!"
    })
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["status"] == "success"
    assert "token" in json_data["data"]

def test_login_invalid_password(client, test_user):
    res = client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
    json_data = res.get_json()
    assert json_data["status"] == "error"

def test_get_me_success(client, auth_headers, test_user):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    json_data = res.get_json()
    assert json_data["data"]["user"]["email"] == test_user.email

def test_get_me_unauthorized(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401
