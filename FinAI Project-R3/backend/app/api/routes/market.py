"""Market analysis endpoints (Phase 2, increment 1).

Served from the recorded-sample provider until a real market-data API key
is configured (docs/05). Every response is explicitly labelled with its
source and carries the not-investment-advice disclaimer.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user
from app.market import service
from app.market.providers import get_provider
from app.market.providers.base import ProviderError
from app.market.valuation import ValuationInputError
from app.models.user import User
from app.schemas.market import ValuationAssumptions

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/symbols")
def list_symbols(user: User = Depends(get_current_user)) -> dict:
    return service.list_symbols()


@router.get("/{symbol}/analysis")
def analysis(
    symbol: str, user: User = Depends(get_current_user)
) -> dict:
    try:
        return service.analyze_symbol(symbol)
    except ProviderError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValuationInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/{symbol}/fair-value")
def fair_value(symbol: str, user: User = Depends(get_current_user)) -> dict:
    """R3: market-adjusted fair value (fundamentals + technicals + news buzz)."""
    try:
        result = service.analyze_symbol(symbol)
    except ProviderError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValuationInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "symbol": result["symbol"],
        "as_of": result["as_of"],
        "source": result["source"],
        "fair_value": result["fair_value"],
        "news": result["news"],
        "disclaimer": result["disclaimer"],
    }


@router.post("/{symbol}/valuation")
def valuation(
    symbol: str,
    assumptions: ValuationAssumptions | None = None,
    user: User = Depends(get_current_user),
) -> dict:
    """Re-value a symbol under user-editable assumptions."""
    provider = get_provider()
    try:
        prices = provider.get_daily_prices(symbol)
        fundamentals = provider.get_fundamentals(symbol)
    except ProviderError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    price = prices.bars[-1].close
    try:
        return service.build_valuation(
            fundamentals, price, assumptions or ValuationAssumptions()
        )
    except ValuationInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
