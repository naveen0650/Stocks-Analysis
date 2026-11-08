"""Aggregated v1 API router. Each route module declares its own prefix."""

from fastapi import APIRouter

from app.api.routes import (
    admin,
    analytics,
    auth,
    calculators,
    expenses,
    market,
    meta,
)

api_v1_router = APIRouter()
api_v1_router.include_router(meta.router, tags=["meta"])
api_v1_router.include_router(auth.router)
api_v1_router.include_router(expenses.router)
api_v1_router.include_router(analytics.router)
api_v1_router.include_router(market.router)
api_v1_router.include_router(calculators.router)
api_v1_router.include_router(admin.router)
