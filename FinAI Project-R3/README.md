# FinAI — AI-Driven Personal Finance, Investment Analytics & Financial Intelligence Platform

M.Tech dissertation project. **Revision 3 (Review 3) state**:

- **Phase 1 — complete** ✅ secure auth with a versioned risk-disclaimer gate,
  expense/income/budget management, analytics engine, guarded AI insight engine,
  explainable financial-health scoring, admin console.
- **Phase 2 — investment analytics, complete (R2 + R3)** ✅ market-data provider
  abstraction with a recorded-sample provider (no API key needed), technical
  indicators (SMA/EMA, RSI, MACD, Bollinger, drawdown, volatility), a
  multi-method valuation engine (DCF + sensitivity + scenarios, P/E, PEG,
  EV/EBITDA, DDM), an explainable stock score, **News Buzz & Financial Sentiment
  Engine**, **Market-Adjusted Fair Value Engine (Fundamentals + Technicals + News Buzz)**,
  and the enhanced **Market** analysis UI.
- **Pulled forward from Phase 3** ✅ **FD calculator** (compounding frequency,
  senior-citizen bonus, post-tax and inflation views) and **mutual-fund
  calculator** (SIP + annual step-up + lumpsum, expense-ratio drag, XIRR,
  goal-seek for a target corpus) with a live-recalculating UI.
- **Light theme**: white canvas, sky-blue accents, floating panels.

> This platform is an **educational analytics tool**. It is not investment
> advice and provides no F&O recommendations (explicitly out of scope).
> Market analysis currently runs on clearly-labelled recorded sample data.

## Quick start (development)

Prerequisites: **Python 3.11+** and **Node 18+**. Docker is optional.

### 1. Backend

```cmd
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env        # then set a real SECRET_KEY

:: seed system categories + admin account (default: admin@finai.local / Admin@12345)
.venv\Scripts\python scripts\seed.py

:: run
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs · Liveness: http://127.0.0.1:8000/api/v1/healthz

### 2. Frontend

```cmd
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the dev server proxies `/api` to the backend.

### 3. Try the full flow

Accept the disclaimer → register → add income & expenses → Dashboard, Budgets,
Analytics (anomaly detection), AI Insights, Financial Health → **Calculators**
(FD / Mutual Fund tabs — every result recomputes as you edit inputs) →
**Market** (pick RELIANCE.NS or TCS.NS, read indicators, valuation methods,
sensitivity grid and the score; edit WACC and hit *Re-value*) → sign in as the
admin for the Admin Console.

### Tests

```cmd
cd backend
.venv\Scripts\python -m pytest
```

**91 tests**: pure analytics engine, hand-computed indicator/valuation golden
tests, FD & mutual-fund calculator identities (closed forms, exact XIRR,
exact goal-seek), provider contract tests, and the full API over an isolated
database (auth incl. lockout & rotation, expenses, budgets, analytics,
market, calculators, admin RBAC and audit trail).

## One-click run (Docker)

Double-click **START-FINAI-R3.cmd** in this folder — starts Docker if needed,
automatically stops any running R2 stack, builds and starts PostgreSQL 16 + API
(port 8000) + built frontend (port 8080), seeds admin + demo data, and opens the
app in your browser. **STOP-FINAI-R3.cmd** stops the containers while preserving
your database volume.

```cmd
docker compose up --build      :: what the launcher runs
```

## Repository layout

```
finai-r3/
├── backend/            FastAPI app (app/core, db, models, schemas, services,
│                       analytics, market/providers+fixtures+sentiment+fair_value,
│                       calculators, api/routes), tests (99 passing), scripts
├── frontend/           React 18 + TypeScript + Tailwind + Recharts (Vite)
│                       pages: Dashboard, Expenses, Budgets, Analytics,
│                       HealthScore, Insights, Calculators, Market (+ FairValuePanel), Admin
├── docs/               10 architecture & dissertation documents (01–10)
├── deliverables/       R3 documentation (.docx/.pdf) & presentation (.pptx/.pdf)
├── docker-compose.yml  postgres + api + web (+ redis) · restart policies on
├── START-FINAI-R3.cmd  one-click launch
└── STOP-FINAI-R3.cmd   one-click stop
```

## Documentation map

| Doc | Contents |
|---|---|
| [01-architecture](docs/01-architecture.md) | System layers, flows, module map |
| [02-tech-stack](docs/02-tech-stack.md) | Stack choices + ADRs + deferrals |
| [03-database-design](docs/03-database-design.md) | ER model, indexes, decisions |
| [04-api-design](docs/04-api-design.md) | Endpoint catalogue incl. /market and /calculators |
| [05-ai-ml-architecture](docs/05-ai-ml-architecture.md) | Insight rules, anomaly model, scores, indicators, valuation |
| [06-security-architecture](docs/06-security-architecture.md) | Auth, RBAC, OWASP posture, limitations |
| [07-development-roadmap](docs/07-development-roadmap.md) | 4-phase plan + milestones |
| [08-testing-strategy](docs/08-testing-strategy.md) | Test pyramid, golden tests, current coverage |
| [09-risk-register](docs/09-risk-register.md) | 14 tracked risks with mitigations |
| [10-dissertation-mapping](docs/10-dissertation-mapping.md) | Chapters, algorithms, experiments |

## Phase status

- **Phase 1** ✅ foundation, expenses/budgets/analytics, guarded AI insights,
  explainable health score, admin console.
- **Phase 2** — market-data abstraction + recorded provider ✅, indicators ✅,
  valuation + scenarios + sensitivity ✅, stock score ✅, Market UI ✅.
  Remaining: news sentiment experiment (rules vs TF-IDF/SVM vs transformer),
  live vendor provider + cache, PDF research reports.
- **Phase 3** — FD + mutual-fund calculators ✅ (pulled forward). Remaining:
  portfolio analytics, risk metrics, stress tests, net worth, goals,
  retirement planner, forecasting experiment.
- **Phase 4** — RAG research assistant, background jobs, caching,
  observability, e2e tests, deployment hardening.

See [WHATS_NEW_R3.md](WHATS_NEW_R3.md) and [WHATS_NEW_R2.md](WHATS_NEW_R2.md) for everything added since Review 1,
and [docs/07-development-roadmap.md](docs/07-development-roadmap.md).
