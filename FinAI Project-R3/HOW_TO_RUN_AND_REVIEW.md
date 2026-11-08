# FinAI — How to Run It & Review the Code in VS Code

Welcome to the **FinAI** project — *An AI-Driven Personal Finance, Investment Analytics and Financial Intelligence Platform* (M.Tech dissertation).
Phase 1 (foundation & core financial management) is complete and delivered; **Phase 2 increment 1 (investment-analytics core) is complete** — market-data provider abstraction, technical indicators, a multi-method valuation engine and an explainable stock score, served from recorded sample data (no API key needed).
This document gets you from a fresh folder to a running system, then gives you a guided path for reviewing the code in Visual Studio Code.

> Full engineering details live in [`docs/01–10`](docs/) and the 31-page write-up in
> [`deliverables/FinAI_Project_Documentation.docx`](deliverables/). This file is the quick, practical entry point.

---

## 1. What is in this folder

```
FinAI/
├── backend/                 FastAPI application (Python 3.11)
│   ├── app/
│   │   ├── core/            config, JWT/bcrypt security, rate limiter, dependencies
│   │   ├── db/              engine/session, base model
│   │   ├── models/          SQLAlchemy entities (users, expenses, budgets, audit …)
│   │   ├── schemas/         Pydantic request/response contracts (+ market.py)
│   │   ├── services/        business logic (auth, expenses, analytics, admin, audit)
│   │   ├── analytics/       the AI engine: aggregation, anomaly, insights, health_score
│   │   ├── market/          Phase 2: indicators, valuation, scoring, orchestration,
│   │   │   └── providers/   FinancialDataProvider ABC + recorded-sample provider
│   │   │       └── fixtures/  deterministic sample OHLCV + fundamentals (2 NSE symbols)
│   │   └── api/routes/      versioned REST endpoints (/api/v1, incl. /market)
│   ├── tests/               91 automated tests (all passing)
│   ├── scripts/             seed.py, demo_data.py, e2e_check.py,
│   │                        generate_market_fixtures.py
│   ├── requirements.txt     .env.example      Dockerfile
├── frontend/                React 18 + TypeScript + Tailwind + Recharts (Vite)
│   └── src/pages/           Dashboard, Expenses, Budgets, Analytics, HealthScore,
│                            Insights, Calculators (FD + mutual fund), Market,
│                            Admin, Profile, Login/Register/Disclaimer
│   └── (light theme: white canvas, sky-blue accents, floating panels)
├── docs/                    10 architecture documents (01–10)
├── deliverables/            M.Tech documentation + Review-1 presentation (+ PDFs,
│                            app screenshots, generator scripts)
├── .vscode/                 VS Code launch configs, tasks, recommended extensions
├── docker-compose.yml       postgres + redis + api + web (nginx, port 8080)
├── START-FINAI.bat          one-click launch (Docker → containers → seed → browser)
├── STOP-FINAI.bat           one-click stop
└── README.md                developer README
```

> `node_modules/`, the Python `.venv/` and local `*.db` files are **not** part of this
> copy — they are regenerable with the commands below (keeps the folder small and clean).

---

## 2. Prerequisites

| Tool | Version | Check with | Install (Windows) |
|---|---|---|---|
| Python | 3.11+ | `python --version` | `winget install Python.Python.3.11` |
| Node.js | 18+ (22 recommended) | `node --version` | `winget install OpenJS.NodeJS.LTS` |
| Docker Desktop | any recent | `docker --version` | `winget install Docker.DockerDesktop` — *optional, only for Option B* |

No git repo is included; if you plan to modify the code, run `winget install Git.Git` and `git init` first.

---

## 3. Quick start — Option A: local development (fastest)

> **One-click option:** double-click **`START-FINAI.bat`** in this folder — it starts
> Docker (if needed), builds and starts all containers, seeds data, opens the project in
> VS Code and opens the app at `http://localhost:8080`. Use **`STOP-FINAI.bat`** to stop.
> The manual steps below describe the same thing in detail.

Open **two terminals** in this folder (in VS Code: `` Ctrl+` ``).

**Terminal 1 — backend API (port 8000):**

```bat
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env          &::- already present in this copy; edit SECRET_KEY if you like
.venv\Scripts\python.exe scripts\seed.py        &::- 12 categories + admin account
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend (port 5173):**

```bat
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**

| Account | Email | Password |
|---|---|---|
| Administrator | `admin@finai.local` | `Admin@12345` |
| Demo user (after step 4 below) | `demo@example.com` | `Demo#12345` |

**Optional — seed two months of demo data** (run in a third terminal while the backend is up):

```bat
cd backend
.venv\Scripts\python.exe scripts\demo_data.py
```

Other useful URLs: API docs `http://127.0.0.1:8000/docs` (interactive OpenAPI) · health `http://127.0.0.1:8000/api/v1/healthz`.

---

## 4. Quick start — Option B: Docker (production-shaped stack)

Requires Docker Desktop to be **running** (start the app first).

```bat
docker compose up --build -d
docker compose exec api python scripts/seed.py
docker compose exec api python scripts/demo_data.py http://localhost:8080
```

Then open **http://localhost:8080** (nginx serving the production frontend build,
proxying `/api` to the FastAPI container; PostgreSQL 16 stores the data).
Stop everything with `docker compose down` (add `-v` to also wipe the database volume).

---

## 5. Run the test suite (91 tests)

```bat
cd backend
.venv\Scripts\python.exe -m pytest
```

Expected: **91 passed**. The suites cover the pure analytics + market engines
(indicator and valuation golden tests with hand-computed values), the FD and
mutual-fund calculators (closed-form and XIRR identities), the recorded
provider contract, and the full API over an isolated database (integration). A
scripted end-to-end journey against a *running* server is available at
`backend/scripts/e2e_check.py`.

---

## 6. Opening the project in VS Code

1. `code "C:\Users\Naveen\Downloads\FinAI Project"` (or File → Open Folder in VS Code).
2. Accept the **recommended extensions** prompt (Python + Pylance, Tailwind IntelliSense,
   ESLint, Docker, SQLite Viewer) — a `.vscode/extensions.json` is included.
3. Run task **`FinAI: backend setup (venv + deps)`** once (`Terminal → Run Task…`), then
   `FinAI: backend seed`, then `FinAI: frontend setup`.
4. Pick the interpreter: `Ctrl+Shift+P` → *Python: Select Interpreter* →
   `backend/.venv/Scripts/python.exe`.

**Debugging** — a `launch.json` is included:
- **"FinAI: Backend (uvicorn, debug)"** — starts the API with breakpoints enabled (F5).
- **"FinAI: Backend tests (pytest)"** — debug a failing test directly.

**Tasks** — `Terminal → Run Task…` exposes: backend setup/seed/demo-data/tests,
frontend setup/dev, docker up/down. The Testing sidebar (flask icon) discovers the
pytest suites automatically.

---

## 7. Suggested code-review path (60–90 minutes)

**Step 0 — orientation (10 min)**
`README.md` → `docs/01-architecture.md` (layer diagram + rules) → `docs/02-tech-stack.md` (why each choice).

**Step 1 — the AI engines, pure and readable (25 min)** — no I/O, no framework noise:
| File | What to look for |
|---|---|
| `backend/app/analytics/aggregation.py` | month bucketing, MoM deltas, weekend split, recurring-merchant detection |
| `backend/app/anomaly.py` | z-score detector + the sample-size guards (silence over invention) |
| `backend/app/analytics/insights.py` | 6 guarded rules — each guard, each evidence object |
| `backend/app/analytics/health_score.py` | weighted model + weight redistribution formula |
| `backend/app/market/indicators.py` | SMA/EMA/RSI(Wilder)/MACD/Bollinger — hand-implemented, golden-tested |
| `backend/app/market/valuation.py` | two-stage DCF with full working, sensitivity grid, bear/base/bull scenarios |
| `backend/app/market/scoring.py` | explainable stock score (same contract as health score) |
| `backend/app/market/providers/` | provider ABC + recorded-sample fixtures (ADR-006) |

**Phase 2 API to try while it runs** (login first, then):
`GET /api/v1/market/symbols` · `GET /api/v1/market/TCS.NS/analysis` ·
`POST /api/v1/market/TCS.NS/valuation` with `{"wacc_pct": 9.5}` — watch fair
value move with your assumptions. Everything is labelled `recorded-sample`.

**Step 2 — how data is shaped (15 min)**
`backend/app/models/` (entities & indexes) → `backend/app/schemas/` (typed contracts) → `docs/03-database-design.md` for the ER reasoning.

**Step 3 — business logic (15 min)**
`backend/app/services/auth_service.py` (lockout, token rotation, disclaimer gate) →
`expense_service.py` (budget utilisation math) → `analytics_service.py` (window assembly) →
`admin_service.py` (least-privilege aggregates).

**Step 4 — the HTTP surface (10 min)**
`backend/app/api/routes/` — thin routes; note `core/deps.py` (auth dependency, RBAC) and
`core/ratelimit.py`; cross-check with `docs/04-api-design.md`.

**Step 5 — frontend (15 min)**
`src/lib/api.ts` (silent JWT refresh-and-retry) → `src/App.tsx` (route guards, disclaimer
gate) → `src/context/AuthContext.tsx` → `src/pages/Dashboard.tsx` and `HealthScore.tsx`
(Recharts composition) → `src/pages/Admin.tsx`.

**Step 6 — tests & infrastructure (10 min)**
`backend/tests/test_analytics_engine.py` (what "unit-tested AI" looks like) →
`tests/test_auth.py` (lockout/rotation/RBAC) → `docker-compose.yml` → `backend/Dockerfile`.

Set a breakpoint in `analytics/insights.py` and hit *F5* while clicking **AI Insights**
in the running app — watching real data flow through the guards is the fastest way to
understand the design.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `python` opens Microsoft Store | use `py -3.11` or disable the store alias (Settings → Apps → App execution aliases) |
| Port 8000/5173/8080 busy | stop the other process (`netstat -ano | findstr :8000`) or change `--port` |
| `npm install` fails | delete `frontend/package-lock.json` and retry; ensure Node ≥ 18 |
| Login says disclaimer required | expected on first run — accept it in the UI; the seeded admin has it pre-accepted |
| Docker: connection refused during build | start Docker Desktop first, wait for the whale icon |
| Demo user missing (fresh install) | you skipped `scripts/demo_data.py` — run it (Option A/B above) |

---

## 9. Security note for this copy

`.env` files are included **only** so the folder runs out of the box; both contain
development-only secrets. Before any real deployment: regenerate `SECRET_KEY`
(`python -c "import secrets; print(secrets.token_hex(32))"`), change the seeded admin
password, and never commit `.env` to version control (it is already in `.gitignore`).
