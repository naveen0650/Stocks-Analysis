# 09 — Risk Register

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| 1 | Financial data provider changes terms / breaks | H | H | provider abstraction layer (P2) so implementations are swappable; cache historical responses; never fabricate missing data |
| 2 | External API rate limits / quota exhaustion | M | M | server-side caching with freshness timestamps; staggered ingestion jobs (P2) |
| 3 | LLM hallucination in research answers | M | H | RAG with mandatory citations; refuse when retrieval is empty; label AI output vs source facts |
| 4 | Sentiment model poor accuracy on finance text | M | M | Experiment 2 compares 3 model families before selection; report F1, keep rule-based fallback |
| 5 | Scope creep (feature list is large) | H | H | strict 4-phase plan; each phase ships a usable increment; dissertation mapping keeps focus |
| 6 | Insufficient historical data for forecasting | M | M | minimum-data guards (models refuse to run); document data requirements |
| 7 | Secrets leakage (API keys in frontend) | L | H | keys only in backend env; `.env` git-ignored; review checklist per phase |
| 8 | Brute force / credential stuffing | M | M | rate limiting + lockout + audit alerts (implemented P1) |
| 9 | Password reset without SMTP (dev tokens) | M | M | dev-only token exposure gated on ENV; SMTP wiring tracked for P2 |
| 10 | SQLite→PostgreSQL migration drift | L | M | portable column types only; compose ships PostgreSQL; migration tested before P2 |
| 11 | Performance on large expense histories | L | M | indexed queries, pagination, aggregation in Python over bounded windows; profiling in P4 |
| 12 | Single-machine rate-limit state | L | L | interface-based limiter; Redis backing store planned P4 |
| 13 | Regulatory: platform mistaken for advice | M | H | disclaimer gate + versioned acceptance; decision engine framed as "analysis, not advice" throughout UI |
| 14 | Timeline pressure across 4 reviews | M | M | milestones M1–M8 with demo-first ordering; riskiest integration (providers) scheduled early in P2 |

L = likelihood, I = impact (H/M/L).
