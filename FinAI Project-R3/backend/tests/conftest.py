"""Test configuration: isolated database per test, limiter reset.

The DATABASE_URL must be set before app modules are imported (the engine is
created at import time).
"""

import os
import tempfile
from datetime import date, timedelta

_TMP = tempfile.mkdtemp(prefix="finai-tests-")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TMP}/test.db")
os.environ.setdefault(
    "SECRET_KEY", "test-secret-key-0123456789abcdef0123456789abcdef"
)
os.environ.setdefault("ENV", "development")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.ratelimit import limiter  # noqa: E402
from app.db.session import Base, engine  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture()
def client():
    limiter.reset()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def user_headers(client):
    """Register a fresh user; return (auth headers, {category_name: id})."""
    headers, _ = _register_and_login(
        client, email="user@example.com", password="Password#123"
    )
    cats = {
        c["name"]: c["id"]
        for c in client.get("/api/v1/categories", headers=headers).json()
    }
    return headers, cats


def _register_and_login(client, *, email, password="Password#123", full_name="Test User"):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
            "disclaimer_version": "1.0.0",
        },
    )
    assert resp.status_code == 201, resp.text
    tokens = resp.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}, tokens


@pytest.fixture()
def make_user(client):
    def _make(email: str, password: str = "Password#123"):
        return _register_and_login(client, email=email, password=password)

    return _make


def _ago(days: int) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


def _this_month_day(day: int) -> str | None:
    """ISO date for `day` of the current month, or None when that would be
    today or later — analytics windows cut off at today, so seeding a
    future-dated row would silently drop it from month totals."""
    today = date.today()
    if day >= today.day:
        return None
    return today.replace(day=day).isoformat()


def _current_month_day(day: int) -> str:
    """Day of the current month clamped to today; budgets cover the whole
    month, so a row dated today still counts toward them."""
    today = date.today()
    return today.replace(day=min(day, today.day)).isoformat()


def _prev_month_day(day: int) -> str:
    first = date.today().replace(day=1)
    last_prev = first - timedelta(days=1)
    return last_prev.replace(day=min(day, last_prev.day)).isoformat()


@pytest.fixture()
def seeded_expenses(client, user_headers):
    """Expenses across categories: most in the current month (as far as
    today allows), a couple in the previous month for trend history.
    Returns (headers, cats, expected) so tests can assert against whatever
    subset of the planned rows actually landed in the current month."""
    headers, _ = user_headers
    cats = {
        c["name"]: c["id"]
        for c in client.get("/api/v1/categories", headers=headers).json()
    }

    def _post(category, day_iso, amount, merchant):
        resp = client.post(
            "/api/v1/expenses",
            headers=headers,
            json={
                "category_id": cats[category],
                "expense_date": day_iso,
                "amount": amount,
                "payment_method": "upi",
                "merchant": merchant,
            },
        )
        assert resp.status_code == 201, resp.text

    planned = [
        ("Food", 1, 250.00, "Swiggy"),
        ("Food", 3, 120.50, "Zomato"),
        ("Transport", 2, 60.00, "Uber"),
        ("Transport", 5, 45.00, "Metro"),
        ("Shopping", 10, 3500.00, "Amazon"),
        ("Utilities", 12, 890.00, "Electricity"),
        ("Entertainment", 14, 499.00, "Netflix"),
    ]
    month_total, top_category, top_amount = 0.0, None, 0.0
    month_rows: list[tuple[str, float, str, str]] = []
    for category, day, amount, merchant in planned:
        day_iso = _this_month_day(day)
        if day_iso is None:
            continue
        _post(category, day_iso, amount, merchant)
        month_total = round(month_total + amount, 2)
        month_rows.append((category, amount, merchant, day_iso))
        if amount > top_amount:
            top_amount, top_category = amount, category

    prev_rows: list[tuple[str, float, str, str]] = []
    for category, day, amount, merchant in [
        ("Food", 15, 300.00, "Swiggy"),
        ("Transport", 16, 55.00, "Uber"),
    ]:
        day_iso = _prev_month_day(day)
        _post(category, day_iso, amount, merchant)
        prev_rows.append((category, amount, merchant, day_iso))

    expected = {
        "month_key": f"{date.today():%Y-%m}",
        "month_total": month_total,
        "top_category": top_category,
        "month_rows": month_rows,
        "prev_rows": prev_rows,
    }
    return headers, cats, expected
