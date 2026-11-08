"""Investment risk disclaimer shown before the application becomes usable."""

from app.core.config import get_settings

DISCLAIMER_TITLE = "Investment Risk Disclaimer & User Agreement"

DISCLAIMER_BULLETS = [
    "This platform provides analytical and educational information only.",
    "It is not a SEBI-registered investment adviser.",
    "AI-generated analysis may contain errors — verify before acting.",
    "Historical performance does not guarantee future results.",
    "Fair-value calculations are estimates based on stated assumptions.",
    "You are responsible for your own investment decisions.",
    "Market data may be delayed depending on the data provider.",
    "No guaranteed returns are implied anywhere on this platform.",
    "Futures & Options (F&O) recommendations are outside the scope of this "
    "platform due to their higher complexity and risk.",
]


def current_disclaimer() -> dict:
    return {
        "version": get_settings().DISCLAIMER_VERSION,
        "title": DISCLAIMER_TITLE,
        "points": DISCLAIMER_BULLETS,
        "acknowledgement": "I Understand & Continue",
    }
