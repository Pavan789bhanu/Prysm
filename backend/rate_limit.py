"""Simple in-memory rate limiter for auth and analysis endpoints."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            bucket = self._hits[key]
            while bucket and now - bucket[0] > self.window:
                bucket.popleft()
            if len(bucket) >= self.limit:
                return False
            bucket.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


# Conservative defaults for public beta / demos.
auth_limiter = RateLimiter(limit=20, window_seconds=60)
analysis_limiter = RateLimiter(limit=10, window_seconds=60)
upload_limiter = RateLimiter(limit=20, window_seconds=60)


def reset_all_limiters() -> None:
    auth_limiter.reset()
    analysis_limiter.reset()
    upload_limiter.reset()


def backend_name() -> str:
    return "memory"
