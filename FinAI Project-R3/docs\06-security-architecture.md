# 06 — Security Architecture

## Identity & authentication
- Passwords hashed with **bcrypt** (cost 12). Plaintext never stored or logged.
- **JWT access tokens** (30 min, HS256, `typ=access`) + **refresh tokens**
  (14 days) stored **hashed** server-side; every refresh session is revocable
  and visible to the user ("active sessions" screen).
- Login is refused until the **current disclaimer version** is accepted;
  acceptance (version + IP + timestamp) is persisted.
- Brute-force defence: per-IP+identifier sliding-window rate limit +
  temporary account lock after 5 consecutive failures (auto-expiring),
  all failures audit-logged.

## Authorization (RBAC)
| Capability | user | admin |
|---|---|---|
| own financial data CRUD | ✓ | — |
| analytics/insights on own data | ✓ | — |
| admin panel, user management | — | ✓ |
| view any user's financial data | — | ✗ (by design) |

Admin endpoints expose **counts and status only** — least privilege is
enforced at the service layer, not just the UI.

## Input & injection defence
- Every request body validated by Pydantic schemas (type/range/length).
- All DB access via SQLAlchemy bound parameters — no string-built SQL.
- React escapes output by default; the API sets `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and disables caching
  of authenticated responses.

## CSRF & session strategy
Tokens travel in the `Authorization` header (never cookies), which removes
the classic CSRF vector for the API; the remaining cookie surface (UI theme
preference) is non-security state.

## Secrets management
- `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS` come from environment /
  `.env` (`.env` is git-ignored; `.env.example` documents the keys).
- External API keys (Phase 2+) live **only** in backend env — never in
  frontend code or bundles.

## Audit & observability
Append-only `audit_log` records registrations, logins (success/failure),
password changes/resets, admin actions (activation, role change), disclaimer
acceptances, with IP + user-agent + metadata. Admin security views aggregate
this trail; suspicious patterns (failure bursts) surface in `/admin/overview`.

## Rate limiting
In-process sliding-window limiter (auth: 10/5 min per IP; mutations: 120/min
per user; reads: 300/min). The implementation is an interface — Phase 4 swaps
the backing store to Redis for multi-instance deployments.

## Known Phase 1 limitations (tracked, not hidden)
1. Password reset tokens are returned in responses **only in development**;
   production requires SMTP/SES wiring (roadmap P2).
2. Rate limiter state is per-process (single-instance correct).
3. Email/mobile verification is stubbed — recorded in the risk register
   until a delivery provider is configured.
