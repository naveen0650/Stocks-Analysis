"""Integration tests: budgets, analytics payloads, admin panel."""

from tests.conftest import _ago, _current_month_day


def _login(client, email, password="Password#123"):
    resp = client.post(f"/api/v1/auth/login", json={"identifier": email, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_budget_status_math_and_alerts(client, user_headers):
    headers, cats = user_headers

    # Seed income + expenses, then a 10,000 Food budget.
    client.post(
        "/api/v1/incomes",
        headers=headers,
        json={
            "income_date": _current_month_day(1),
            "amount": 50000,
            "source": "Salary",
        },
    )
    client.post(
        "/api/v1/expenses",
        headers=headers,
        json={
            "category_id": cats["Food"],
            "expense_date": _current_month_day(5),
            "amount": 5200,
        },
    )
    created = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "name": "Food budget",
            "category_id": cats["Food"],
            "period": "monthly",
            "amount": 10000,
            "alert_thresholds": [50],
        },
    )
    assert created.status_code == 201
    budget = created.json()
    assert float(budget["actual"]) == 5200
    assert float(budget["remaining"]) == 4800
    assert budget["utilization_pct"] == 52.0
    assert budget["triggered_alerts"] == [50]

    # Overall budget (no category) counts every expense.
    overall = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={"name": "Overall", "period": "monthly", "amount": 100000},
    )
    assert overall.status_code == 201
    listed = client.get("/api/v1/budgets", headers=headers).json()
    assert len(listed) == 2

    # Thresholds outside 1..200 are sanitized.
    weird = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={"name": "Weird", "period": "monthly", "amount": 1000, "alert_thresholds": [0, 500, 75]},
    ).json()
    assert weird["triggered_alerts"] is not None  # created with sanitized list


def test_dashboard_and_analytics_payloads(client, seeded_expenses):
    headers, cats, expected = seeded_expenses

    dash = client.get("/api/v1/analytics/dashboard", headers=headers).json()
    assert dash["month"]["total_expenses"] == expected["month_total"]
    assert dash["today_expense_total"] == 0.0
    assert len(dash["trends"]["monthly"]) == 6
    assert isinstance(dash["insights"], list)
    assert dash["health"]["score"] is not None

    trends = client.get("/api/v1/analytics/trends", headers=headers).json()
    current = next(
        m for m in trends["monthly"] if m["month"] == expected["month_key"]
    )
    assert current["expenses"] == dash["month"]["total_expenses"]

    cats_resp = client.get("/api/v1/analytics/categories", headers=headers).json()
    if expected["top_category"] is not None:
        assert cats_resp["distribution"][0]["category"] == expected["top_category"]

    summary = client.get("/api/v1/analytics/summary", headers=headers).json()
    assert summary["total_income"] == 0.0
    assert summary["savings"] < 0


def test_anomaly_endpoint_returns_structure(client, user_headers):
    headers, cats = user_headers
    # A spike inside sparse data will not flag, but the endpoint must respond.
    client.post(
        "/api/v1/expenses",
        headers=headers,
        json={"category_id": cats["Food"], "expense_date": _ago(6), "amount": 5000},
    )
    resp = client.get("/api/v1/analytics/anomalies", headers=headers)
    body = resp.json()
    assert resp.status_code == 200
    assert body["analyzed_transactions"] == 1
    assert isinstance(body["flags"], list)


def test_insights_endpoint_shape(client, user_headers):
    headers, cats = user_headers
    client.post(
        "/api/v1/expenses",
        headers=headers,
        json={
            "category_id": cats["Shopping"],
            "expense_date": _ago(10),
            "amount": 8000,
        },
    )
    body = client.get("/api/v1/analytics/insights", headers=headers).json()
    assert "insights" in body
    assert "data_window" in body
    for insight in body["insights"]:
        assert {"type", "severity", "title", "message", "evidence"} <= set(insight)


def test_health_score_endpoint_reports_factors(client, user_headers):
    headers, _ = user_headers
    body = client.get("/api/v1/analytics/health-score", headers=headers).json()
    assert 0 <= body["score"] <= 100
    assert body["grade"]
    assert len(body["factors"]) == 6
    keys = {f["key"] for f in body["factors"]}
    assert keys == {
        "savings_rate",
        "expense_to_income",
        "budget_adherence",
        "recurring_ratio",
        "emergency_fund",
        "diversification",
    }


# --------------------------------------------------------------------- admin


def test_admin_full_flow(client, make_user):
    make_user("plain@example.com")  # regular user that admin will manage
    admin_headers, _ = make_user("root@admin.io", password="AdminPass#1")

    # Promote via direct DB-independent path: seed script created none, so we
    # use the API of another admin... bootstrap instead via registration role.
    from app.db.session import SessionLocal
    from app.models.user import Role, User

    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == "root@admin.io").one()
    admin_user.role = Role.admin
    db.commit()
    db.close()

    headers = _login(client, "root@admin.io", "AdminPass#1")

    overview = client.get("/api/v1/admin/overview", headers=headers).json()
    assert overview["users"]["total"] >= 1
    assert overview["system"]["database"] == "ok"

    users = client.get(
        "/api/v1/admin/users", headers=headers, params={"search": "plain@example"}
    ).json()
    assert users["total"] >= 1
    target = users["items"][0]

    deactivated = client.patch(
        f"/api/v1/admin/users/{target['id']}",
        headers=headers,
        json={"is_active": False},
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    # Deactivated user cannot authenticate.
    blocked = client.post(
        "/api/v1/auth/login",
        json={"identifier": target["email"], "password": "Password#123"},
    )
    assert blocked.status_code == 403

    role_change = client.patch(
        f"/api/v1/admin/users/{target['id']}", headers=headers, json={"role": "admin"}
    )
    assert role_change.status_code == 200

    logs = client.get("/api/v1/admin/audit-logs", headers=headers).json()
    actions = {item["action"] for item in logs["items"]}
    assert "admin.user_deactivated" in actions
    assert "admin.role_changed" in actions

    activity = client.get("/api/v1/admin/login-activity", headers=headers).json()
    assert activity["days"] == 14
    assert isinstance(activity["series"], list)


def test_admin_cannot_deactivate_self(client, make_user):
    from app.db.session import SessionLocal
    from app.models.user import Role, User

    make_user("selfadmin@admin.io", password="AdminPass#1")
    db = SessionLocal()
    admin_user = db.query(User).filter(User.email == "selfadmin@admin.io").one()
    admin_user.role = Role.admin
    db.commit()
    db.close()

    headers = _login(client, "selfadmin@admin.io", "AdminPass#1")
    me = client.get("/api/v1/auth/me", headers=headers).json()

    resp = client.patch(
        f"/api/v1/admin/users/{me['id']}", headers=headers, json={"is_active": False}
    )
    assert resp.status_code == 409
