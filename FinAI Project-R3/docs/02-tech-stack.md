# 02 — Technology Stack & Justification

## Choices

| Concern | Choice | Alternatives considered | Why |
|---|---|---|---|
| API framework | **FastAPI (Python)** | Django REST, Express, Spring | Native async, Pydantic validation, automatic OpenAPI docs, first-class fit with the Python ML ecosystem used by later phases |
| Data validation | **Pydantic v2** | marshmallow, attrs | Fast, typed, integrates with FastAPI; single source of truth for API contracts |
| ORM / DB access | **SQLAlchemy 2.0** | Django ORM, raw SQL | Mature, typed `Mapped[]` models, dialect-portable between SQLite and PostgreSQL |
| Database | **PostgreSQL (prod) / SQLite (dev default)** | MySQL | Relational integrity, JSON columns, indexes; SQLite gives zero-config local development with an identical schema via SQLAlchemy |
| Cache | **Redis (Phase 2+)** | Memcached | Provisioned in compose now; used later for market-data caching and job queues |
| Background jobs | **Phase 2+ (Celery/RQ)** | — | Phase 1 has no workloads needing async workers; introducing them early would be speculative |
| Auth | **JWT (access + refresh), bcrypt** | server sessions | Stateless API, SPA-friendly, revocable via persisted refresh-token hashes |
| Frontend | **React 18 + TypeScript + Vite** | Next.js | The app is a token-authenticated SPA behind a separate API; SSR adds operational complexity with no SEO benefit for a private dashboard. Vite gives fast HMR and a clean production build |
| Styling | **Tailwind CSS v3** | CSS modules, MUI | Utility-first keeps the light design system — white canvas, sky-blue accents and floating panels — consistent without fighting a component library's look |
| Charts | **Recharts** | ECharts, Highcharts | Lightweight, React-native composition, covers donut/bar/line/area required by the analytics module |
| Market data | **Provider abstraction, recorded-sample first** | vendor SDKs wired directly | Deterministic fixtures power dev/tests/demo with no API key; vendor providers (Alpha Vantage / Twelve Data / FMP) drop in behind the same interface later — no fabricated data ever reaches a response unlabelled |
| Tests | **pytest + httpx TestClient / Vitest (Phase 2)** | unittest | Fixtures + parametrize; backend is the risk surface in Phase 1 |
| Packaging | **Docker + docker-compose** | bare metal | Reproducible deployment; compose provisions the production-shaped stack |

## Architecture Decision Records ( condensed )

**ADR-001 — SQLite for development, PostgreSQL for production.**
`DATABASE_URL` selects the dialect; schema is defined once in SQLAlchemy.
Rationale: a dissertation demo must run on any laptop in seconds; production
concerns (concurrency, JSON ops) are satisfied by PostgreSQL via the same code.
Trade-off: SQLite-specific behaviours are avoided by sticking to portable
column types.

**ADR-002 — Vite SPA instead of Next.js.**
The product is an authenticated analytics dashboard, not a content site.
Separating web from API keeps the backend the single security boundary and
matches the API-first architecture required by the dissertation.

**ADR-003 — Analysis engine as pure functions, ML behind a package boundary.**
Keeps business logic testable without infrastructure and lets Phase 2+ swap
rule-based components for trained models without touching API code.

**ADR-004 — In-memory rate limiting in Phase 1.**
Correct for single-process deployments; the limiter sits behind a small class
that will be backed by Redis when horizontal scaling arrives (Phase 4).

**ADR-005 — Per-app tests inside `backend/` and `frontend/`.**
Monorepo convention; a root-level cross-stack e2e suite is added in Phase 4
when Playwright covers the full demo journey.

**ADR-006 — Market data behind a provider interface, recorded fixtures first.**
Phase 2 code depends only on `FinancialDataProvider`. The first provider
serves deterministic recorded-sample JSON, so development, tests and the
review demo run without an API key or network access, and responses are
always explicitly labelled. Vendor APIs (chosen by free-tier limits) plug in
behind the same contract; Redis caching activates with the live provider.

## Explicitly deferred (with reasons)

- Celery/Redis workers — no async workload exists until data ingestion (P2).
- Alembic migrations — schema is greenfield and created via `create_all`;
  migrations are introduced the moment schema evolution begins (P2).
- Transformer sentiment / RAG — requires the ingestion pipeline first (P2/P4).
