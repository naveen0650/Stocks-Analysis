"""Integration tests: expenses, categories, incomes."""


def _create(client, headers, cats, **overrides):
    payload = {
        "category_id": cats["Food"],
        "expense_date": "2026-09-20",
        "amount": 199.99,
        "payment_method": "upi",
        "merchant": "Test Cafe",
    }
    payload.update(overrides)
    return client.post("/api/v1/expenses", headers=headers, json=payload)


def test_system_categories_seeded(client, user_headers):
    headers, _ = user_headers
    cats = client.get("/api/v1/categories", headers=headers).json()
    names = {c["name"] for c in cats}
    assert {"Food", "Transport", "Housing", "Utilities"} <= names
    assert all(c["is_system"] for c in cats)


def test_expense_crud_flow(client, user_headers):
    headers, cats = user_headers

    created = _create(client, headers, cats, tags=["lunch", "team"])
    assert created.status_code == 201
    expense = created.json()
    assert expense["category_name"] == "Food"
    assert expense["tags"] == ["lunch", "team"]

    got = client.get(f"/api/v1/expenses/{expense['id']}", headers=headers)
    assert got.status_code == 200

    patched = client.patch(
        f"/api/v1/expenses/{expense['id']}",
        headers=headers,
        json={"amount": 249.99, "notes": "updated"},
    )
    assert patched.status_code == 200
    assert float(patched.json()["amount"]) == 249.99

    deleted = client.delete(f"/api/v1/expenses/{expense['id']}", headers=headers)
    assert deleted.status_code == 200

    missing = client.get(f"/api/v1/expenses/{expense['id']}", headers=headers)
    assert missing.status_code == 404


def test_expense_validation(client, user_headers):
    headers, cats = user_headers
    # Zero / negative amounts rejected.
    bad = _create(client, headers, cats, amount=0)
    assert bad.status_code == 422
    # Unknown category rejected.
    resp = _create(client, headers, cats, category_id=99999)
    assert resp.status_code == 404
    # Bad date format rejected.
    resp = _create(client, headers, cats, expense_date="20-09-2026")
    assert resp.status_code == 422


def test_expense_filters_and_pagination(client, seeded_expenses):
    headers, cats, expected = seeded_expenses
    rows = expected["month_rows"] + expected["prev_rows"]
    dates = sorted(r[3] for r in rows)

    listed = client.get(
        "/api/v1/expenses",
        headers=headers,
        params={"date_from": dates[0], "date_to": dates[-1]},
    ).json()
    assert listed["total"] == len(rows)

    month_food = [r for r in expected["month_rows"] if r[0] == "Food"]
    if month_food:
        food_only = client.get(
            "/api/v1/expenses",
            headers=headers,
            params={"category_id": cats["Food"], "date_from": month_food[0][3]},
        ).json()
        assert food_only["total"] == len(month_food)

    paged = client.get(
        "/api/v1/expenses", headers=headers, params={"page": 1, "page_size": 4}
    ).json()
    assert len(paged["items"]) == 4
    assert paged["total"] == len(rows)

    if any(r[2] == "Amazon" for r in rows):
        searched = client.get(
            "/api/v1/expenses", headers=headers, params={"q": "amazon"}
        ).json()
        assert searched["total"] == 1
        assert searched["items"][0]["merchant"] == "Amazon"


def test_user_cannot_see_other_users_expenses(client, make_user, user_headers):
    headers_a, cats = user_headers
    _create(client, headers_a, cats)

    headers_b, _ = make_user("other@example.com")
    theirs = client.get("/api/v1/expenses", headers=headers_b).json()
    assert theirs["total"] == 0


def test_custom_category_lifecycle(client, user_headers):
    headers, _ = user_headers
    created = client.post(
        "/api/v1/categories", headers=headers, json={"name": "Pets"}
    )
    assert created.status_code == 201
    pet_id = created.json()["id"]

    # In-use categories cannot be deleted.
    used = client.post(
        "/api/v1/expenses",
        headers=headers,
        json={
            "category_id": pet_id,
            "expense_date": "2026-09-21",
            "amount": 300,
        },
    )
    assert used.status_code == 201
    blocked = client.delete(f"/api/v1/categories/{pet_id}", headers=headers)
    assert blocked.status_code == 409

    # Free categories can be removed.
    free = client.post(
        "/api/v1/categories", headers=headers, json={"name": "Hobby"}
    ).json()
    ok = client.delete(f"/api/v1/categories/{free['id']}", headers=headers)
    assert ok.status_code == 200


def test_income_flow(client, user_headers):
    headers, _ = user_headers
    created = client.post(
        "/api/v1/incomes",
        headers=headers,
        json={
            "income_date": "2026-09-01",
            "amount": 65000,
            "source": "Salary",
            "is_recurring": True,
        },
    )
    assert created.status_code == 201

    listed = client.get("/api/v1/incomes", headers=headers).json()
    assert len(listed) == 1
    assert float(listed[0]["amount"]) == 65000

    patched = client.patch(
        f"/api/v1/incomes/{listed[0]['id']}",
        headers=headers,
        json={"amount": 70000},
    )
    assert float(patched.json()["amount"]) == 70000

    deleted = client.delete(f"/api/v1/incomes/{listed[0]['id']}", headers=headers)
    assert deleted.status_code == 200
    assert client.get("/api/v1/incomes", headers=headers).json() == []
