"""News buzz & sentiment engine (R3).

Transparent, lexicon-based financial sentiment (VADER-style, finance tuned).
Every headline gets a score in [-1, +1] with the matched terms returned as
evidence, so the UI can show *why* a headline was read as positive/negative.

The aggregate applies exponential recency decay (half-life in days) and
derives a "buzz" level from article volume. Learned models (TF-IDF+SVM,
FinBERT) can replace `score_text` later behind the same signature
(Experiment 2 in docs/10).
"""

from __future__ import annotations

import json
import math
import re
from datetime import date
from pathlib import Path

NEWS_DIR = Path(__file__).parent / "fixtures" / "news"

POSITIVE = {
    "beat": 1.0, "beats": 1.0, "surge": 1.0, "surges": 1.0, "record": 0.8,
    "growth": 0.6, "grows": 0.6, "upgrade": 1.0, "upgraded": 1.0,
    "expansion": 0.6, "expands": 0.6, "profit": 0.5, "strong": 0.7,
    "wins": 0.8, "win": 0.6, "order": 0.4, "deal": 0.5, "rally": 0.8,
    "outperform": 0.9, "buyback": 0.8, "dividend": 0.4, "robust": 0.7,
    "margin expansion": 1.0, "approval": 0.6, "partnership": 0.5,
    "raises guidance": 1.2, "bullish": 1.0, "launch": 0.4, "rebound": 0.7,
}
NEGATIVE = {
    "miss": -1.0, "misses": -1.0, "decline": -0.7, "declines": -0.7,
    "fall": -0.6, "falls": -0.6, "plunge": -1.0, "plunges": -1.0,
    "downgrade": -1.0, "downgraded": -1.0, "loss": -0.8, "weak": -0.7,
    "probe": -0.8, "penalty": -0.9, "fine": -0.5, "lawsuit": -0.9,
    "slowdown": -0.7, "cuts guidance": -1.2, "layoffs": -0.6,
    "bearish": -1.0, "pressure": -0.5, "concern": -0.5, "concerns": -0.5,
    "attrition": -0.4, "delay": -0.5, "headwinds": -0.7, "volatile": -0.3,
}
NEGATORS = {"not", "no", "never", "without"}


def score_text(text: str) -> dict:
    """Score one headline. Returns {score, label, matched}."""
    lowered = text.lower()
    total = 0.0
    matched: list[str] = []
    # multi-word phrases first, then remove them so words are not double counted
    for lexicon in (POSITIVE, NEGATIVE):
        for phrase, weight in lexicon.items():
            if " " in phrase and phrase in lowered:
                total += weight
                matched.append(phrase)
                lowered = lowered.replace(phrase, " ")
    tokens = re.findall(r"[a-z]+", lowered)
    for i, tok in enumerate(tokens):
        weight = POSITIVE.get(tok) or NEGATIVE.get(tok)
        if weight is None:
            continue
        if i > 0 and tokens[i - 1] in NEGATORS:
            weight = -weight
        total += weight
        matched.append(tok)
    # VADER-style normalisation into (-1, 1)
    score = total / math.sqrt(total * total + 4.0) if total else 0.0
    label = "positive" if score > 0.15 else "negative" if score < -0.15 else "neutral"
    return {"score": round(score, 4), "label": label, "matched": matched}


def load_news(symbol: str) -> list[dict]:
    path = NEWS_DIR / f"{symbol.upper()}.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8-sig"))["articles"]


def aggregate(articles: list[dict], as_of: date, half_life_days: float = 7.0) -> dict:
    """Recency-weighted sentiment + buzz level over a list of articles."""
    if not articles:
        return {
            "status": "not_evaluated",
            "reason": "no news available for this symbol",
            "article_count": 0,
            "sentiment_score": None,
            "buzz_level": "none",
            "articles": [],
        }
    scored = []
    weighted = 0.0
    weights = 0.0
    recent_7d = 0
    for art in articles:
        published = date.fromisoformat(art["published"])
        age = max((as_of - published).days, 0)
        w = 0.5 ** (age / half_life_days)
        s = score_text(art["headline"])
        weighted += s["score"] * w
        weights += w
        if age <= 7:
            recent_7d += 1
        scored.append({**art, **s, "age_days": age, "weight": round(w, 4)})
    sentiment = weighted / weights if weights else 0.0
    buzz = "high" if recent_7d >= 5 else "elevated" if recent_7d >= 3 else "normal"
    pos = sum(1 for a in scored if a["label"] == "positive")
    neg = sum(1 for a in scored if a["label"] == "negative")
    scored.sort(key=lambda a: a["published"], reverse=True)
    return {
        "status": "evaluated",
        "article_count": len(scored),
        "articles_last_7d": recent_7d,
        "sentiment_score": round(sentiment, 4),
        "sentiment_label": (
            "positive" if sentiment > 0.15 else "negative" if sentiment < -0.15 else "neutral"
        ),
        "buzz_level": buzz,
        "positive_count": pos,
        "negative_count": neg,
        "neutral_count": len(scored) - pos - neg,
        "half_life_days": half_life_days,
        "articles": scored,
    }
