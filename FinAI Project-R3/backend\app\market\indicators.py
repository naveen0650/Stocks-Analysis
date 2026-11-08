"""Pure technical-indicator functions for daily price series.

Inputs are plain close-price lists so the functions stay I/O-free and
directly unit-testable (the same pattern as app.analytics). Outputs are
lists aligned 1:1 with the input; warm-up positions that the formula cannot
compute yet carry None. Market analytics uses float (prices are observations,
not bookkeeping amounts); valuation math that feeds advice lives in
valuation.py and rounds only at the response boundary.
"""

from __future__ import annotations

import math


def sma(values: list[float], window: int) -> list[float | None]:
    """Simple moving average; None for the first window-1 positions."""
    if window < 1:
        raise ValueError("window must be >= 1")
    out: list[float | None] = [None] * len(values)
    running = 0.0
    for i, v in enumerate(values):
        running += v
        if i >= window:
            running -= values[i - window]
        if i >= window - 1:
            out[i] = running / window
    return out


def _ema_from(values: list[float], window: int) -> list[float | None]:
    """EMA over a compact series: seeded with the SMA of the first window
    values, then recursive. Returns an aligned list with None warm-up."""
    out: list[float | None] = [None] * len(values)
    if len(values) < window:
        return out
    k = 2.0 / (window + 1.0)
    seed = sum(values[:window]) / window
    out[window - 1] = seed
    prev = seed
    for i in range(window, len(values)):
        prev = values[i] * k + prev * (1.0 - k)
        out[i] = prev
    return out


def ema(values: list[float], window: int) -> list[float | None]:
    if window < 1:
        raise ValueError("window must be >= 1")
    return _ema_from(values, window)


def rsi(values: list[float], window: int = 14) -> list[float | None]:
    """Wilder's RSI. A window of all-zero movement is neutral (50.0); a
    window with gains but no losses pins to 100."""
    if window < 1:
        raise ValueError("window must be >= 1")
    n = len(values)
    out: list[float | None] = [None] * n
    if n <= window:
        return out
    avg_gain = avg_loss = 0.0
    for i in range(1, window + 1):
        change = values[i] - values[i - 1]
        if change >= 0:
            avg_gain += change
        else:
            avg_loss -= change
    avg_gain /= window
    avg_loss /= window

    def _rsi(gain: float, loss: float) -> float:
        if gain == 0 and loss == 0:
            return 50.0
        if loss == 0:
            return 100.0
        rs = gain / loss
        return 100.0 - 100.0 / (1.0 + rs)

    out[window] = round(_rsi(avg_gain, avg_loss), 4)
    for i in range(window + 1, n):
        change = values[i] - values[i - 1]
        gain = max(change, 0.0)
        loss = max(-change, 0.0)
        avg_gain = (avg_gain * (window - 1) + gain) / window
        avg_loss = (avg_loss * (window - 1) + loss) / window
        out[i] = round(_rsi(avg_gain, avg_loss), 4)
    return out


def macd(
    values: list[float], fast: int = 12, slow: int = 26, signal: int = 9
) -> dict[str, list[float | None]]:
    """MACD line (EMA fast - EMA slow), its signal line (EMA of the MACD
    line) and the histogram. All lists align with the input; the signal
    warms up signal-1 bars after the MACD line does."""
    fast_line = _ema_from(values, fast)
    slow_line = _ema_from(values, slow)

    line: list[float | None] = [None] * len(values)
    first_valid = slow - 1
    compact: list[float] = []
    for i, (f, s) in enumerate(zip(fast_line, slow_line)):
        if f is not None and s is not None:
            line[i] = f - s
            if i >= first_valid:
                compact.append(line[i])

    signal_compact = _ema_from(compact, signal)
    signal_line: list[float | None] = [None] * len(values)
    for j, v in enumerate(signal_compact):
        if v is not None:
            signal_line[first_valid + j] = v

    histogram: list[float | None] = [
        (line[i] - signal_line[i])
        if line[i] is not None and signal_line[i] is not None
        else None
        for i in range(len(values))
    ]
    return {
        "macd": [round(v, 6) if v is not None else None for v in line],
        "signal": [round(v, 6) if v is not None else None for v in signal_line],
        "histogram": [
            round(v, 6) if v is not None else None for v in histogram
        ],
    }


def bollinger_bands(
    values: list[float], window: int = 20, num_std: float = 2.0
) -> dict[str, list[float | None]]:
    """Middle = SMA(window); upper/lower = middle ± num_std * population
    standard deviation of the same window."""
    middle = sma(values, window)
    upper: list[float | None] = [None] * len(values)
    lower: list[float | None] = [None] * len(values)
    for i in range(window - 1, len(values)):
        w = values[i - window + 1 : i + 1]
        mean = middle[i]
        variance = sum((v - mean) ** 2 for v in w) / window
        spread = num_std * math.sqrt(variance)
        upper[i] = mean + spread
        lower[i] = mean - spread
    return {"middle": middle, "upper": upper, "lower": lower}


def max_drawdown(values: list[float]) -> float | None:
    """Largest peak-to-trough decline as a negative percentage."""
    if len(values) < 2:
        return None
    peak = values[0]
    worst = 0.0
    for v in values:
        peak = max(peak, v)
        if peak > 0:
            worst = min(worst, v / peak - 1.0)
    return round(worst * 100.0, 4)


def annualized_volatility(
    values: list[float], periods_per_year: int = 252
) -> float | None:
    """Standard deviation of daily log returns, scaled by sqrt(periods)."""
    if len(values) < 3:
        return None
    returns = [
        math.log(values[i] / values[i - 1])
        for i in range(1, len(values))
        if values[i - 1] > 0 and values[i] > 0
    ]
    if len(returns) < 2:
        return None
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
    return round(math.sqrt(variance) * math.sqrt(periods_per_year) * 100.0, 4)


def trailing_return(values: list[float], bars: int) -> float | None:
    """Percentage change over the last `bars` observations."""
    if len(values) < bars + 1:
        return None
    start = values[-bars - 1]
    if start == 0:
        return None
    return round((values[-1] / start - 1.0) * 100.0, 4)
