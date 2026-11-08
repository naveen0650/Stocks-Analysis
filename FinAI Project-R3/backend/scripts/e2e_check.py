"""End-to-end smoke check against a RUNNING server (http://127.0.0.1:8000).

Exercises the Phase 1 demo journey through the public API:
disclaimer -> register -> income -> expenses -> dashboard -> insights ->
health score -> anomalies -> budgets -> admin login -> admin overview.
"""

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000/api/v1"
sys.stdout.reconfigure(encoding="utf-8")

failures = []


def call(method, path, body=None, token=None, expect=200):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as resp:
            status, payload = resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        status, payload = e.code, json.loads(e.read() or b"{}")
    mark = "OK " if status == expect else "FAIL"
    print(f"[{mark}] {method} {path} -> {status}")
    if status != expect:
        failures.append((method, path, status, payload))
    return payload


print("== Phase 1 demo journey ==")

d = call("GET", "/config/disclaimer")
version = d["version"]

email = f"demo{__import__('random').randint(1000, 9999)}@example.com"
reg = call(
    "POST",
    "/auth/register",
    {
        "email": email,
        "password": "Demo#12345",
        "full_name": "Demo User",
        "disclaimer_version": version,
    },
    expect=201,
)
token = reg["access_token"]

call("GET", "/auth/me", token=token)

cats = call("GET", "/categories", token=token)
cat = {c["name"]: c["id"] for c in cats}
print("   categories:", len(cats))

call(
    "POST",
    "/incomes",
    {
        "income_date": "2026-09-01",
        "amount": 75000,
        "source": "Salary",
        "is_recurring": True,
    },
    token=token,
    expect=201,
)

expenses = [
    ("Food", "2026-09-05", 320.5, "Swiggy"),
    ("Food", "2026-09-12", 150, "Zomato"),
    ("Transport", "2026-09-08", 65, "Uber"),
    ("Shopping", "2026-09-15", 4200, "Amazon"),
    ("Utilities", "2026-09-16", 950, "Electricity"),
    ("Entertainment", "2026-09-18", 499, "Netflix"),
    ("Housing", "2026-09-01", 18000, "Rent"),
]
for category, day, amount, merchant in expenses:
    call(
        "POST",
        "/expenses",
        {
            "category_id": cat[category],
            "expense_date": day,
            "amount": amount,
            "payment_method": "upi",
            "merchant": merchant,
            "is_recurring": category == "Entertainment",
        },
        token=token,
        expect=201,
    )

call(
    "POST",
    "/budgets",
    {
        "name": "Food budget",
        "category_id": cat["Food"],
        "period": "monthly",
        "amount": 500,
        "alert_thresholds": [50, 75, 90],
    },
    token=token,
    expect=201,
)

page = call("GET", "/expenses?page=1&page_size=10", token=token)
print("   expenses listed:", page["total"])

dash = call("GET", "/analytics/dashboard", token=token)
print(
    "   month expenses:",
    dash["month"]["total_expenses"],
    "| insights:",
    len(dash["insights"]),
    "| health:",
    dash["health"]["score"],
    dash["health"]["grade"],
)

ins = call("GET", "/analytics/insights", token=token)
for i in ins["insights"]:
    print(f"   insight [{i['severity']}] {i['title']}")

hs = call("GET", "/analytics/health-score", token=token)
evaluated = [f["key"] for f in hs["factors"] if f["status"] == "evaluated"]
print("   health factors evaluated:", evaluated)

an = call("GET", "/analytics/anomalies", token=token)
print("   anomalies flagged:", len(an["flags"]))

bud = call("GET", "/budgets", token=token)
print("   budget utilization:", bud[0]["utilization_pct"], "% alerts:", bud[0]["triggered_alerts"])

call("GET", "/admin/overview", token=token, expect=403)  # user must be refused

adm = call(
    "POST",
    "/auth/login",
    {"identifier": "admin@finai.local", "password": "Admin@12345"},
)
adm_token = adm["access_token"]

ov = call("GET", "/admin/overview", token=adm_token)
print("   admin sees users:", ov["users"]["total"], "| failed24h:", ov["activity_24h"]["failed_logins"])

logs = call("GET", "/admin/audit-logs?limit=10", token=adm_token)
print("   audit events:", logs["total"])

la = call("GET", "/admin/login-activity", token=adm_token)
print("   login-activity days:", len(la["series"]))

print()
if failures:
    print("RESULT: FAILURES —", len(failures))
    for f in failures:
        print(" ", f)
    sys.exit(1)
print("RESULT: ALL E2E CHECKS PASSED")
