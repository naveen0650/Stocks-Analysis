"""Integration tests: authentication, disclaimer gate, sessions, RBAC."""

API = "/api/v1"


def test_healthz_public(client):
    resp = client.get(f"{API}/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_disclaimer_endpoint_public(client):
    resp = client.get(f"{API}/config/disclaimer")
    body = resp.json()
    assert resp.status_code == 200
    assert body["version"] == "1.0.0"
    assert any("SEBI" in p for p in body["points"])


def test_register_requires_disclaimer_version(client):
    resp = client.post(
        f"{API}/auth/register",
        json={
            "email": "a@b.com",
            "password": "Password#123",
            "full_name": "A",
            "disclaimer_version": "0.0.9",
        },
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "DISCLAIMER_REQUIRED"


def test_register_requires_email_or_mobile(client):
    resp = client.post(
        f"{API}/auth/register",
        json={"password": "Password#123", "full_name": "A", "disclaimer_version": "1.0.0"},
    )
    assert resp.status_code == 422


def test_register_mobile_only_account(client):
    resp = client.post(
        f"{API}/auth/register",
        json={
            "mobile": "9876543210",
            "password": "Password#123",
            "full_name": "M",
            "disclaimer_version": "1.0.0",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["mobile"] == "9876543210"
    assert body["access_token"]


def test_duplicate_email_rejected(client, make_user):
    make_user("dup@example.com")
    resp = client.post(
        f"{API}/auth/register",
        json={
            "email": "dup@example.com",
            "password": "Password#123",
            "full_name": "Dup",
            "disclaimer_version": "1.0.0",
        },
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "EMAIL_TAKEN"


def test_login_success_and_me(client, make_user):
    headers, tokens = make_user("login@example.com")
    me = client.get(f"{API}/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "login@example.com"


def test_login_wrong_password(client, make_user):
    make_user("wrongpw@example.com")
    resp = client.post(
        f"{API}/auth/login",
        json={"identifier": "wrongpw@example.com", "password": "nope"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "INVALID_CREDENTIALS"


def test_account_locks_after_repeated_failures(client, make_user):
    make_user("lock@example.com")
    for _ in range(5):
        resp = client.post(
            f"{API}/auth/login",
            json={"identifier": "lock@example.com", "password": "bad"},
        )
        assert resp.status_code == 401
    # The account is now locked: even the correct password is refused.
    resp = client.post(
        f"{API}/auth/login",
        json={"identifier": "lock@example.com", "password": "Password#123"},
    )
    assert resp.status_code == 423
    assert resp.json()["detail"]["code"] == "ACCOUNT_LOCKED"


def test_refresh_rotation_and_logout_revocation(client, make_user):
    headers, tokens = make_user("refresh@example.com")

    refreshed = client.post(
        f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert refreshed.status_code == 200
    body = refreshed.json()
    assert body["access_token"] != tokens["access_token"]
    assert body["refresh_token"] != tokens["refresh_token"]

    # Rotation revokes the old refresh token immediately.
    dead = client.post(
        f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert dead.status_code == 401

    # The rotated token can be logged out and then stops working entirely.
    out = client.post(
        f"{API}/auth/logout",
        json={"refresh_token": body["refresh_token"]},
        headers=headers,
    )
    assert out.status_code == 200
    gone = client.post(
        f"{API}/auth/refresh", json={"refresh_token": body["refresh_token"]}
    )
    assert gone.status_code == 401


def test_change_password_requires_current(client, make_user):
    headers, _ = make_user("cp@example.com")
    bad = client.post(
        f"{API}/auth/change-password",
        json={"current_password": "wrong", "new_password": "NewPass#123"},
        headers=headers,
    )
    assert bad.status_code == 401

    ok = client.post(
        f"{API}/auth/change-password",
        json={"current_password": "Password#123", "new_password": "NewPass#123"},
        headers=headers,
    )
    assert ok.status_code == 200
    relogin = client.post(
        f"{API}/auth/login",
        json={"identifier": "cp@example.com", "password": "NewPass#123"},
    )
    assert relogin.status_code == 200


def test_sessions_listed_and_revocable(client, make_user):
    headers, tokens = make_user("sessions@example.com")
    listed = client.get(
        f"{API}/auth/sessions",
        headers={**headers, "X-Refresh-Token": tokens["refresh_token"]},
    )
    assert listed.status_code == 200
    sessions = listed.json()
    assert len(sessions) == 1
    assert sessions[0]["is_current"] is True

    revoked = client.delete(
        f"{API}/auth/sessions/{sessions[0]['id']}", headers=headers
    )
    assert revoked.status_code == 200
    dead = client.post(
        f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert dead.status_code == 401


def test_password_reset_flow_dev(client, make_user):
    make_user("reset@example.com")
    forgot = client.post(
        f"{API}/auth/password/forgot", json={"identifier": "reset@example.com"}
    )
    assert forgot.status_code == 200
    token = forgot.json().get("reset_token")
    assert token  # development returns the token; production would not

    reset = client.post(
        f"{API}/auth/password/reset",
        json={"token": token, "new_password": "Reset#12345"},
    )
    assert reset.status_code == 200
    relogin = client.post(
        f"{API}/auth/login",
        json={"identifier": "reset@example.com", "password": "Reset#12345"},
    )
    assert relogin.status_code == 200

    # Tokens are single-use.
    reused = client.post(
        f"{API}/auth/password/reset",
        json={"token": token, "new_password": "Again#12345"},
    )
    assert reused.status_code == 400


def test_regular_user_cannot_access_admin(client, make_user):
    headers, _ = make_user("plain@example.com")
    resp = client.get(f"{API}/admin/overview", headers=headers)
    assert resp.status_code == 403


def test_unauthenticated_access_blocked(client):
    resp = client.get(f"{API}/expenses")
    assert resp.status_code == 401
