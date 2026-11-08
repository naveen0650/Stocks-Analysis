# What's new since Review 1 (Revision 2)

Everything below is **implemented, tested and running** in this folder.
Stack: FastAPI + PostgreSQL/SQLite backend, React 18 + TypeScript frontend.
Automated tests: **91 passing** (up from 49 at Review 1).

## 1. Investment-analytics core (Phase 2) — `backend/app/market/`

| Piece | Where | Notes |
|---|---|---|
| Provider abstraction | `app/market/providers/base.py` | `FinancialDataProvider` interface — vendor APIs drop in later behind the same contract (ADR-006) |
| Recorded-sample provider | `app/market/providers/recorded.py` + `fixtures/` | Deterministic OHLCV + fundamentals for RELIANCE.NS & TCS.NS; no API key needed; every response labelled `recorded-sample` |
| Technical indicators | `app/market/indicators.py` | SMA, EMA, Wilder RSI, MACD, Bollinger, max drawdown, annualised volatility — hand-implemented, golden-tested |
| Valuation engine | `app/market/valuation.py` | Two-stage DCF with full working + WACC×growth sensitivity grid + bear/base/bull scenarios; P/E, PEG, EV/EBITDA, Gordon DDM; refuses infeasible assumptions (422) |
| Explainable stock score | `app/market/scoring.py` | 6 weighted factors, same transparency contract as the Phase-1 health score |
| API | `GET /api/v1/market/symbols`, `GET /{symbol}/analysis`, `POST /{symbol}/valuation` | Editable assumptions re-value instantly |
| Market UI | `frontend/src/pages/Market.tsx` | Chart with SMA/Bollinger, indicator strip, valuation table, scenario cards, sensitivity heatmap, assumptions panel, factor breakdown |

**Demo**: log in → **Market** → switch symbols → change WACC → *Re-value*.

## 2. Financial calculators (pulled forward from Phase 3) — `backend/app/calculators/`

- **Fixed deposit** — compounding frequency (yearly → monthly), senior-citizen
  bonus rate, post-tax view (income-tax slab), inflation-adjusted real value,
  year-by-year schedule. Verified against the closed-form compound formula.
- **Mutual fund** — SIP and/or lumpsum, expected return, **annual step-up**,
  **expense ratio** (TER drag shown in ₹), inflation view, **goal-seek**
  (enter a target corpus → required monthly SIP, computed exactly).
  The reported XIRR reproduces the assumed return exactly — simulation and
  solver share one monthly convention (golden-tested).
- **UI** — `frontend/src/pages/Calculators.tsx`, sky-blue tabs, results
  recalculate live as any input changes.

**Demo**: **Calculators** → Mutual Fund tab → tick *Goal target* → set ₹1 Cr.

## 3. Light theme (whole app)

White canvas, sky-blue accents, floating white panels — implemented at the
design-token level (`tailwind.config.js` palette + `src/index.css` component
classes), so every page shares it. Charts, tooltips and score colours re-tuned
for readability on white.

## 4. Reliability & packaging

- Test suite **49 → 91**, incl. hand-computed golden tests for every
  indicator and valuation method; fixture dates are now month-agnostic.
- `docker-compose.yml`: `restart: unless-stopped` on all services — the stack
  returns automatically after a reboot.
- nginx now serves `index.html` with `Cache-Control: no-cache` (hashed assets
  immutable) — browser refreshes always pick up new builds.
- `START-FINAI.bat` / `STOP-FINAI.bat` derive the compose project name from
  their own folder, so each copy of FinAI on this machine is an independent
  stack (no port/name collisions; only one stack runs at a time).

## 5. Documentation kept current (spec requirement)

`docs/02` (styling row + ADR-006), `docs/04` (market + calculator endpoints),
`docs/05` (indicator/valuation/score sections), `docs/07` (roadmap status),
`docs/08` (golden-test inventory), `README.md` (Revision-2 state),
`HOW_TO_RUN_AND_REVIEW.md` (run paths, 91 tests, review reading order).

## Still open for the final review package

News-sentiment experiment (rules vs TF-IDF/SVM vs transformer, F1-reported),
live vendor market provider (needs an API key), PDF research reports,
portfolio analytics (Phase 3), and the Review-2 presentation.
