import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_registration_and_login_flow():
    test_email = "analyst@enterprise.com"
    test_password = "SecurePassword123!"

    # 1. Register
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": "Senior Data Analyst"
        }
    )
    # Could be 201 or 400 if user already registered in prior test run
    if reg_res.status_code == 201:
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["email"] == test_email
        token = reg_data["access_token"]
    else:
        # Fallback login
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": test_email, "password": test_password}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

    # 2. Login with valid credentials
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": test_password}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 3. Access protected /auth/me with bearer token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email

    # 4. Attempt login with wrong password
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": "WrongPassword999"}
    )
    assert bad_login.status_code == 401

    # 5. Access protected endpoint without token
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401 or unauth_res.status_code == 403
