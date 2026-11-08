# 08 — Testing Strategy

## Pyramid

```
        ╱  E2E (Playwright, Phase 4)  ╲        full demo journey
       ╱  Integration (httpx client)   ╲       API + DB over test schema
      ╱  Unit (pure analytics engine)   ╲      finance math, scoring, rules
```

## Phase 1 — implemented

**Unit (pure functions, no I/O)**
- aggregation: period bucketing, MoM/YoY deltas
- anomaly: z-score correctness, small-sample guard, flag thresholds
- insights: each rule fires only under its data-sufficiency guard
- health score: weight redistribution when factors lack data; bounds 0–100

**Integration (pytest + FastAPI TestClient + isolated SQLite per test)**
- auth: register (email / mobile-only / duplicate), login incl. wrong password
  and lock-out, refresh rotation, logout revocation, change password,
  disclaimer gate (403 `DISCLAIMER_REQUIRED` until current version accepted)
- expenses: CRUD, filters, pagination, soft delete, category guards
  (system categories undeletable; in-use categories blocked)
- budgets: creation, live status math (actual/remaining/utilization/alerts)
- analytics: dashboard payload shape and computed numbers against seeded data
- admin: RBAC denial for normal users, activation/deactivation, audit trail

Run: `cd backend && .venv\Scripts\python -m pytest -q` (91 tests green as of
the calculator + light-theme increment)

## Conventions
- One isolated database per test (fixture creates/drops schema).
- Tests seed through the **public API** (not direct DB writes) wherever
  possible — they verify behaviour, not implementation.
- Financial assertions compare with `pytest.approx` (never exact floats).

## Phase 2 — increment 1 (implemented)
- **Indicator golden tests**: every formula verified against hand-computed
  values (EMA seed + recursion, Wilder RSI edge cases, MACD on a perfect
  ramp, Bollinger on constant/mixed windows, drawdown, log-return volatility)
- **Valuation golden tests**: fully hand-computed 2-year DCF traced through
  every intermediate (PVs, terminal value, EV, equity, per-share); edge and
  rejection cases (r ≤ g, zero FCF, growth ≥ WACC); sensitivity-grid
  monotonicity; bear ≤ base ≤ bull scenario ordering
- **Provider contract tests**: recorded fixtures serve ordered, windowable
  bars; unknown symbols raise `ProviderError`; quote math derived from bars
- **API integration tests**: auth required, payload shape, upside-vs-price
  consistency across methods, blended-value agreement, editable assumptions
  re-valuation (422 on infeasible), 404s

## Calculators (implemented 2026-10-03)
- **FD golden tests**: quarterly/monthly compounding verified against the
  closed-form compound formula; effective-yield identity; senior-citizen
  bonus; partial-year schedule rows; post-tax and real-value views; input
  rejection bounds
- **Mutual-fund golden tests**: XIRR reproduces the input return exactly
  (simulation and solver share one monthly convention); lumpsum CAGR vs
  closed form; step-up invested arithmetic (12·1000·(1+1.1+1.21)); expense
  drag = gross − net value with XIRR netting to r − TER; goal-seek inverts
  the projection exactly

## Phase 2–4 remaining
- P2: sentiment evaluation harness (labelled set, precision/recall/F1);
  PDF report snapshot tests
- P3: forecasting walk-forward evaluation; XIRR golden cases (known IRRs)
- P4: Playwright journey (register → expense → analysis → report), load test
  on analytics endpoints, coverage gate in CI

## CI plan (when hosted)
GitHub Actions: backend job (install, pytest), frontend job (install,
typecheck, build), docker build job — matrix on Python 3.11 / Node 22.
