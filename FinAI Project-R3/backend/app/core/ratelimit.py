"""In-process sliding-window rate limiting.

Correct for single-process deployments (Phase 1). The SlidingWindowLimiter
interface is deliberately small so a Redis-backed store can replace it when
the API scales horizontally (Phase 4, see docs/02-tech-stack.md ADR-004).
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

RATE_LIMITED_DETAIL = {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
}


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                return False
            hits.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def ip_rate_limit(scope: str, limit: int, window_seconds: int):
    """Dependency factory: IP-scoped sliding-window limit."""

    def dependency(request: Request) -> None:
        if not limiter.allow(f"{scope}:{client_ip(request)}", limit, window_seconds):
            raise HTTPException(status_code=429, detail=RATE_LIMITED_DETAIL)

    return dependency


def key_rate_limit(key: str, scope: str, limit: int, window_seconds: int) -> None:
    """Imperative check for arbitrary keys (used for per-user limits)."""
    if not limiter.allow(f"{scope}:{key}", limit, window_seconds):
        raise HTTPException(status_code=429, detail=RATE_LIMITED_DETAIL)
