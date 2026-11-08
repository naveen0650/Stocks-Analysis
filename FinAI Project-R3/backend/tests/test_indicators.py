"""Golden tests for the technical-indicator engine.

Every expected value below is hand-computed from the formula definition
(docs/05) — if one of these fails, the formula changed, not the fixture.
"""

import pytest

from app.market import indicators


def test_sma_simple_window():
    values = [2.0, 4.0, 6.0, 8.0, 10.0]
    assert indicators.sma(values, 3) == [None, None, 4.0, 6.0, 8.0]
    # window 1 is the identity; window larger than the input is all None.
    assert indicators.sma(values, 1) == values
    assert indicators.sma(values, 6) == [None] * 5


def test_ema_seeded_with_sma_then_recursive():
    # k = 2/3; seed = (1+2)/2 = 1.5
    # 3*(2/3) + 1.5*(1/3) = 2.5; 4*(2/3) + 2.5*(1/3) = 3.5
    assert indicators.ema([1.0, 2.0, 3.0, 4.0], 2) == [
        None,
        1.5,
        2.5,
        3.5,
    ]


def test_rsi_pins_to_100_on_pure_gains_and_50_on_flat():
    rising = [float(i) for i in range(1, 20)]
    assert indicators.rsi(rising, 14)[-1] == 100.0
    flat = [5.0] * 20
    assert indicators.rsi(flat, 14)[-1] == 50.0


def test_rsi_wilder_smoothing_golden():
    # 14 diffs alternate +1/-1 -> avg gain = avg loss = 0.5 -> RSI 50.
    values = [10.0, 11.0, 10.0, 11.0, 10.0, 11.0, 10.0, 11.0,
              10.0, 11.0, 10.0, 11.0, 10.0, 11.0, 10.0, 12.0]
    out = indicators.rsi(values, 14)
    assert out[14] == 50.0
    # Final diff is +2: avg_gain = (0.5*13 + 2)/14, avg_loss = 6.5/14
    # -> RS = 17/13 -> RSI = 56.666...
    assert out[15] == pytest.approx(56.6667, abs=1e-4)


def test_macd_golden_short_windows():
    # EMA2-EMA4 on a perfect ramp is a constant 1.0 from index 3;
    # EMA2-of-MACD is 1.0 from index 4, so the histogram is 0 afterwards.
    out = indicators.macd([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
                          fast=2, slow=4, signal=2)
    assert out["macd"] == [None, None, None, 1.0, 1.0, 1.0, 1.0, 1.0]
    assert out["signal"] == [None, None, None, None, 1.0, 1.0, 1.0, 1.0]
    assert out["histogram"] == [None, None, None, None, 0.0, 0.0, 0.0, 0.0]


def test_bollinger_bands_golden_and_flat():
    # window 3 over [1,2,3]: mean 2, population sd sqrt(2/3) = 0.816497
    bands = indicators.bollinger_bands([1.0, 2.0, 3.0], window=3, num_std=2.0)
    assert bands["middle"][2] == 2.0
    assert bands["upper"][2] == pytest.approx(3.6330, abs=1e-4)
    assert bands["lower"][2] == pytest.approx(0.3670, abs=1e-4)
    flat = indicators.bollinger_bands([5.0] * 25, window=20)
    assert flat["upper"][-1] == 5.0
    assert flat["lower"][-1] == 5.0


def test_max_drawdown_tracks_deepest_peak_to_trough():
    assert indicators.max_drawdown([100.0, 80.0, 120.0, 90.0]) == -25.0
    assert indicators.max_drawdown([100.0, 110.0]) == 0.0
    assert indicators.max_drawdown([42.0]) is None


def test_annualized_volatility_zero_for_constant_and_log_golden():
    assert indicators.annualized_volatility([100.0, 100.0, 100.0]) == 0.0
    # returns ln(1.05) and ln(102.9/105): sample sd * sqrt(252)
    assert indicators.annualized_volatility([100.0, 105.0, 102.9]) == (
        pytest.approx(77.4443, abs=1e-3)
    )


def test_trailing_return():
    values = [100.0, 110.0, 120.0]
    assert indicators.trailing_return(values, 1) == pytest.approx(9.0909, abs=1e-4)
    assert indicators.trailing_return(values, 2) == 20.0
    assert indicators.trailing_return(values, 5) is None


def test_invalid_windows_are_rejected():
    with pytest.raises(ValueError):
        indicators.sma([1.0], 0)
    with pytest.raises(ValueError):
        indicators.ema([1.0], 0)
    with pytest.raises(ValueError):
        indicators.rsi([1.0, 2.0], 0)
