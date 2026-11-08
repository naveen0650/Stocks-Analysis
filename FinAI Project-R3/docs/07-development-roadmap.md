# 07 — Four-Phase Development Roadmap

Each phase ends with a demonstrable increment — no phase depends on
unfinished work, and reviews present what actually runs.

## Phase 1 — Foundation & Core Financial Management ✅ (this release)
| Deliverable | Status |
|---|---|
| Monorepo, API architecture, docs | done |
| DB schema (users, expenses, incomes, budgets, audit) | done |
| JWT auth (register/login/refresh/sessions), RBAC | done |
| Disclaimer gate with versioned acceptance | done |
| Expense manager: CRUD, filters, categories, recurring, tags | done |
| Income tracking | done |
| Budgets with utilization + threshold alerts | done |
| Analytics: trends, MoM/YoY, category distribution, top merchants | done |
| AI: z-score anomaly detection, guarded insight engine | done |
| Financial health score (explainable, weighted) | done |
| Admin: overview metrics, user management, audit logs, login activity | done |
| Tests: auth, expenses, budgets, analytics, admin | done |

**Review 1 presentation**: problem statement → gaps → proposed system →
architecture (doc 01) → stack justification (doc 02) → ER design (doc 03) →
security design (doc 06) → expense analytics + AI insights demo → limitations
→ Phase 2 roadmap.

## Phase 2 — Investment Analytics
Increment 1 (2026-10-03) delivered the market-analysis core on the
recorded-sample provider — no API key required:
- ✅ `FinancialDataProvider` abstraction + recorded-sample provider & fixtures
- ✅ Technical indicators: SMA/EMA, RSI (Wilder), MACD, Bollinger, drawdown,
  annualised volatility
- ✅ Valuation engine: DCF (editable assumptions, sensitivity grid), PE, PEG,
  EV/EBITDA, DDM; bear/base/bull scenarios
- ✅ Explainable stock scoring (`/api/v1/market/*` endpoints, 28 new tests)
Remaining in Phase 2:
- News ingestion (legitimate APIs only) + sentiment model (Experiment 2:
  rules vs TF-IDF/SVM vs transformer)
- Live vendor provider + price/fundamentals cache (Alembic migrations begin)
- PDF research reports; stock-analysis UI page

## Phase 3 — Portfolio Intelligence & Financial Planning
Pulled forward (2026-10-03, user request): **FD calculator and mutual-fund
calculator** (SIP with annual step-up + lumpsum + combined, expense-ratio
drag, XIRR, goal-seek, inflation view) shipped under `/calculators` with a
light "floating panels" UI theme, alongside the stock-analysis UI page.
Remaining in Phase 3:
- Portfolio analyzer (holdings, P/L, allocation, sector/market-cap mix)
- Risk: volatility, max drawdown, HHI concentration; benchmark comparison
- Stress-test scenarios (market/sector/rate shocks)
- Net worth tracker; goals engine; retirement planner; inflation analysis
- Expense forecasting experiment (MA vs Holt vs ARIMA vs GBM)
- XIRR/CAGR engine for transaction histories (per-portfolio; the
  calculator-level XIRR engine already exists)

## Phase 4 — Intelligent Financial Platform
- RAG research assistant with cited answers; LLM summarization service
- Background jobs (news ingestion, sentiment batches, report generation)
  on Redis; caching layer; observability (structured logs, job metrics)
- Admin analytics expansion; disclaimer/feature-flag management
- Security hardening pass; performance testing; Playwright e2e suite
- Docker deployment guide; dissertation documentation freeze

## Milestones
| Milestone | Target |
|---|---|
| M1 Phase 1 complete & demoable | ✅ this release |
| M2 Provider abstraction + first stock end-to-end | ✅ API-level (increment 1); UI page next |
| M3 Sentiment experiment evaluated (F1 reported) | Phase 2 end |
| M4 Valuation engine + PDF reports | valuation ✅ (increment 1); PDF pending |
| M5 Portfolio + planning calculators | Phase 3 mid |
| M6 Forecasting experiment evaluated | Phase 3 end |
| M7 RAG assistant grounded + cited | Phase 4 mid |
| M8 Hardening, e2e tests, deployment | Phase 4 end |

## Final demo flow (maps 1:1 to modules)
disclaimer → register → dashboard → add income/expense → analytics → AI
insight → (P2) stock analysis → valuation → sentiment → research report →
(P3) portfolio + stress test + calculators → PDF report → (P4) admin
monitoring & audit trail.
