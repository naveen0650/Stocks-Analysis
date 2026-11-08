"""Create a ready-to-demo account with two months of sample data.

Usage (host or inside the api container):
    python scripts/demo_data.py [base_url]

Defaults to http://127.0.0.1:8000/api/v1. Account: demo@example.com / Demo#12345
Skips seeding when the account already has expenses, so it is safe to re-run.
"""

import json
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000") + "/api/v1"
EMAIL, PASSWORD = "demo@example.com", "Demo#12345"
DISCLAIMER_VERSION = "1.0.0"

sys.stdout.reconfigure(encoding="utf-8")


def call(method, path, body=None, token=None, expect=200):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def main() -> None:
    status, login = call(
        "POST", "/auth/login", {"identifier": EMAIL, "password": PASSWORD}
    )
    if status != 200:
        status, reg = call(
            "POST",
            "/auth/register",
            {
                "email": EMAIL,
                "password": PASSWORD,
                "full_name": "Demo User",
                "disclaimer_version": DISCLAIMER_VERSION,
            },
        )
        assert status == 201, f"register failed: {reg}"
        login = reg

    token = login["access_token"]
    _, page = call(
        "GET", "/expenses?page=1&page_size=1", token=token
    )
    if page["total"] > 0:
        print(f"Demo account {EMAIL} already has data — nothing to do.")
        return

    _, cats = call("GET", "/categories", token=token)
    cid = {c["name"]: c["id"] for c in cats}

    call(
        "POST", "/incomes",
        {"income_date": "2026-08-01", "amount": 85000, "source": "Salary", "is_recurring": True},
        token=token,
    )
    call(
        "POST", "/incomes",
        {"income_date": "2026-09-01", "amount": 85000, "source": "Salary", "is_recurring": True},
        token=token,
    )
    rows = [
        ("Housing", "2026-08-01", 22000, "Rent", True),
        ("Food", "2026-08-09", 350, "Zomato", False),
        ("Food", "2026-08-16", 420, "Swiggy", False),
        ("Transport", "2026-08-20", 68, "Uber", False),
        ("Shopping", "2026-08-11", 2499, "Amazon", False),
        ("Utilities", "2026-08-05", 1105, "Electricity", False),
        ("Entertainment", "2026-08-06", 499, "Netflix", True),
        ("Housing", "2026-09-01", 22000, "Rent", True),
        ("Food", "2026-09-02", 280, "Zomato", False),
        ("Food", "2026-09-08", 512, "Swiggy", False),
        ("Transport", "2026-09-03", 72, "Uber", False),
        ("Shopping", "2026-09-14", 6499, "Amazon", False),
        ("Utilities", "2026-09-05", 1240, "Electricity", False),
        ("Entertainment", "2026-09-06", 499, "Netflix", True),
    ]
    for category, day, amount, merchant, recurring in rows:
        call(
            "POST", "/expenses",
            {
                "category_id": cid[category],
                "expense_date": day,
                "amount": amount,
                "payment_method": "upi",
                "merchant": merchant,
                "is_recurring": recurring,
            },
            token=token,
            expect=201,
        )
    call(
        "POST", "/budgets",
        {
            "name": "Shopping budget",
            "category_id": cid["Shopping"],
            "period": "monthly",
            "amount": 5000,
            "alert_thresholds": [50, 75, 90],
        },
        token=token,
        expect=201,
    )
    print(f"Demo account ready: {EMAIL} / {PASSWORD} (2 months of sample data)")


if __name__ == "__main__":
    main()
