# 01 — System Architecture

## 1. Context

FinAI is a full-stack web platform unifying personal financial management,
investment analytics, and AI-assisted financial intelligence. Phase 1 delivers
the foundation layer and core financial management; Phases 2–4 layer investment
analytics, portfolio intelligence, and the AI research assistant on top.

```
                        ┌─────────────────────────────────┐
                        │   Browser (React SPA, TS)       │
                        │   Glassmorphism dashboard UI    │
                        └───────────────┬─────────────────┘
                                        │ HTTPS / JSON (JWT bearer)
                        ┌───────────────▼─────────────────┐
                        │   API Layer — FastAPI           │
                        │   /api/v1  versioned routes     │
                        │   validation · RBAC · rate limit│
                        ├─────────────────────────────────┤
                        │   Business Logic (services)     │
                        │   auth · expenses · budgets ·   │
                        │   analytics · insights · admin  │
                        ├─────────────────────────────────┤
                        │   Analysis / AI Engine          │
                        │   aggregation · z-score anomaly │
                        │   rule-based insight generation │
                        │   financial health scoring      │
                        ├─────────────────────────────────┤
                        │   Data Access (SQLAlchemy 2.0)  │
                        │   repository-style helpers      │
                        ├──────────────┬──────────────────┤
                        │   PostgreSQL │  (SQLite dev)     │
                        └──────────────┴──────────────────┘
                                        │  (Phase 2+)
                        ┌───────────────▼──────────────────┐
                        │   External Provider Abstraction  │
                        │   market data · news · FX        │
                        │   (FinancialDataProvider iface)  │
                        └─────────────────────────────────┘
```

## 2. Layering rules

| Layer | Responsibility | Must not |
|---|---|---|
| API (routes) | HTTP concerns: parsing, auth, status codes, rate limiting | business logic |
| Services | business rules, cross-entity orchestration | HTTP constructs |
| Analysis engine | pure computation (no DB, no HTTP) — unit-testable in isolation | I/O |
| Data access | SQLAlchemy models + session helpers | business rules |

The analysis engine is deliberately **pure Python**: aggregation, anomaly
detection, insight generation, and scoring take plain data in and return plain
dicts out. This keeps the ML experiments of later phases testable without a
running server.

## 3. Module map (Phase 1)

```
backend/app/
├── core/       config, security (JWT/hash), dependencies, rate limiter
├── db/         engine/session, base model, seed helpers
├── models/     ORM entities (users, expenses, budgets, audit)
├── schemas/    Pydantic request/response contracts
├── api/routes/ auth, users, expenses, budgets, analytics, admin, health
├── services/   orchestration (expense, budget, analytics, admin, audit)
└── analytics/  aggregation, anomaly, insights, health-score (pure functions)
```

## 4. Key flows

### Authentication (JWT access + refresh)
1. Client posts credentials **with the disclaimer version it accepted**.
2. Server verifies password (bcrypt), verifies current disclaimer acceptance,
   returns a short-lived access token + long-lived refresh token (hashed at
   rest, revocable per session).
3. Failed logins are rate-limited per IP+identifier and written to the audit log.
4. On 401 the client silently redeems the refresh token once, then retries.

### Analytics pipeline
```
request ──► service fetches user rows ──► analytics.aggregation (series/totals)
                                        ├─► analytics.anomaly  (z-score)
                                        ├─► analytics.insights (rule engine)
                                        └─► analytics.health_score (weighted model)
```
Every insight carries the numbers it was derived from — no unsupported claims.

## 5. Phase 2–4 extension points

- **Provider abstraction** (`FinancialDataProvider` interface) for market data,
  news and FX so no external site is tightly coupled (Phase 2).
- **ml/ package** for sentiment, forecasting and categorization experiments,
  consumed by the backend as a library (Phase 2–3).
- **Background jobs** (Celery/RQ + Redis) for ingestion, sentiment batches and
  report generation (Phase 2+; Redis already provisioned in compose).
- **RAG assistant**: retrieval over ingested news/filings + LLM summarization
  with citations (Phase 4).

The layer boundaries above are chosen so each phase adds modules without
rewriting existing ones.
