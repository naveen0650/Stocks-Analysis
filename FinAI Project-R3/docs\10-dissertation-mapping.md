# 10 — Dissertation Mapping

## Chapter plan → project artefacts

| Chapter | Content | Source in repo |
|---|---|---|
| 1 Introduction | problem, objectives, scope | this doc + `07-development-roadmap.md` |
| 2 Literature review | limitations of existing finance tools; research gap | gap table below |
| 3 Proposed system | architecture, stack justification | `01-architecture.md`, `02-tech-stack.md` |
| 4 Design | ER model, API design, security design | `03`, `04`, `06` |
| 5 Implementation | phased build, module walkthroughs | code + phase sections of `07` |
| 6 Algorithms | formulas & methodology (below) | `backend/app/analytics/` (executable truth) |
| 7 Experiments & evaluation | Exp 1–4 with metrics | `ml/` experiment plan |
| 8 Conclusion | results, limitations, future work | per-phase results |

## Research gap addressed

| Gap in conventional tools | FinAI answer |
|---|---|
| Expense tracking without explanation | guarded insight engine citing its numbers (P1) |
| Black-box scores | weighted, documented, per-factor breakdown (P1) |
| No integrated investment research | stock analyzer + valuation + sentiment (P2) |
| AI without grounding | RAG with citations; "data unavailable" over invention (P2–4) |
| Planning divorced from actual behaviour | goals/calculators fed by real expense history (P3) |

## Algorithms to document (with formulas)

| Algorithm | Phase | Reference implementation |
|---|---|---|
| Z-score anomaly detection | 1 | `analytics/anomaly.py` |
| Weighted health score + weight redistribution | 1 | `analytics/health_score.py` |
| Period aggregation, MoM/YoY deltas | 1 | `analytics/aggregation.py` |
| Compound interest / SIP / CAGR / XIRR | 3 | `analytics/` (planned) |
| DCF, PE, PEG, EV/EBITDA, DDM + sensitivity grids | 2 | planned pure-function module |
| Portfolio volatility, max drawdown, HHI | 3 | planned |
| Sentiment classification (rules / SVM / transformer) | 2 | `ml/experiments/` |
| Expense forecasting (MA / Holt / ARIMA / GBM) | 3 | `ml/experiments/` |
| Explainable scoring framework | 1→4 | evolving |

## Experiments (dissertation chapters 7)

1. **Expense anomaly detection** — statistical threshold vs Isolation Forest on
   labelled injected outliers; metrics: precision, recall, F1.
2. **Financial news sentiment** — rule-based vs TF-IDF+SVM vs transformer on a
   labelled sample; metrics: accuracy, precision, recall, F1, confusion.
3. **Expense forecasting** — MA / Holt / ARIMA / GBM, walk-forward validation;
   metrics: MAE, RMSE, MAPE.
4. **Explainable investment scoring** — transparent weighted scoring vs
   opaque baseline; evaluation: user comprehensibility study + ablation of
   factor contributions.

## System evaluation metrics (non-ML)
API latency (p50/p95), analytics response time vs history size, report
generation time, test coverage — measured in Phase 4 hardening.

## Ethics & compliance
Educational/analytical scope only; no F&O recommendations (explicitly out of
scope, stated in-app); versioned disclaimer acceptance; user data isolation;
audit trail of sensitive operations.
