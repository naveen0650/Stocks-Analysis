# What's new in Revision 3 (R3)

**Headline feature: market-adjusted stock Fair Value** — one number (plus a
corridor) that combines fundamentals, technicals/chart and news buzz, with
every component shown on screen.

## 1. Fair Value engine — `backend/app/market/fair_value.py`

```
fair_value = intrinsic_anchor × (1 + technical_adj) × (1 + sentiment_adj)
```

| Component | Source | Bound | How |
|---|---|---|---|
| Intrinsic anchor | existing valuation engine | — | mean of DCF, P/E, EV/EBITDA, DDM fair values |
| Technical tilt | `indicators.py` | ±8 % | average of 4 signals in [-1, 1]: trend (price vs SMA50 + SMA20/50 cross), RSI momentum (overbought/oversold aware), MACD histogram, Bollinger band position |
| News-buzz tilt | `sentiment.py` | ±6 % | recency-weighted sentiment × buzz multiplier (high 1.0 / elevated 0.8 / normal 0.6) |
| Corridor | volatility | 5–25 % | half-width = 0.5 × annualised volatility |

Verdict: **Undervalued** (price below corridor), **Overvalued** (above),
otherwise **Fairly valued** (with mild up/downside hint at ±5 %).

Design choice: fundamentals stay the anchor; market conditions can tilt the
value by at most ~14 % combined. This keeps the number defensible in a viva
and stops short-term noise from dominating.

## 2. News buzz & sentiment — `backend/app/market/sentiment.py`

* Finance-tuned lexicon (single words + phrases like "raises guidance",
  "cuts guidance", "margin expansion"), negation handling ("not weak").
* VADER-style normalisation into (-1, 1); matched terms returned as evidence.
* Exponential recency decay (7-day half-life) and buzz level from 7-day volume.
* News is read from `app/market/fixtures/news/*.json` — **illustrative sample
  headlines, not real news**, labelled as such. A live news API slots in behind
  `load_news()`.
* Known limitation (good viva talking point): lexicons miss context, e.g.
  "attrition declines" is good news but scores negative. Experiment 2
  (TF-IDF+SVM vs FinBERT) addresses this.

## 3. API

`GET /api/v1/market/{symbol}/fair-value` — fair value, corridor, components,
technical signals, scored headlines. `/analysis` now also includes
`fair_value` and `news`.

## 4. UI — `frontend/src/components/FairValuePanel.tsx`

Top of the Market page: big fair-value figure, verdict badge, price-vs-corridor
gauge, 3-step waterfall (anchor → technical tilt → news tilt), signal chips,
and a scrollable News Buzz feed with per-headline scores and matched terms.

## 5. Launchers

* `START-FINAI-R3.cmd` — starts Docker if needed, stops any R2 stack (same
  ports), builds/starts R3, seeds demo data, opens the browser.
* `STOP-FINAI-R3.cmd` — stops containers, keeps data.

## 6. Tests

`backend/tests/test_fair_value.py` — 8 new tests (sentiment polarity,
negation, bounds, recency weighting, adjustment caps, verdicts, endpoint, 404).
