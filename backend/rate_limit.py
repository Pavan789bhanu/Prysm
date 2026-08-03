"""Rate limiting with optional Redis backend and in-memory fallback."""
from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from threading import Lock

from config import REDIS_URL

log = logging.getLogger("prysm.ratelimit")


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


class RedisRateLimiter:
    def __init__(self, limit: int, window_seconds: int, *, prefix: str) -> None:
        from redis import Redis

        self.limit = limit
        self.window = window_seconds
        self.prefix = prefix
        self._redis = Redis.from_url(REDIS_URL)

    def allow(self, key: str) -> bool:
        now = time.time()
        redis_key = f"prysm:rl:{self.prefix}:{key}"
        pipe = self._redis.pipeline()
        pipe.zremrangebyscore(redis_key, 0, now - self.window)
        pipe.zcard(redis_key)
        pipe.zadd(redis_key, {f"{now}:{time.time_ns()}": now})
        pipe.expire(redis_key, self.window + 1)
        _, count, _, _ = pipe.execute()
        return int(count) < self.limit

    def reset(self) -> None:
        # Best-effort clear for tests.
        for key in self._redis.scan_iter(match=f"prysm:rl:{self.prefix}:*"):
            self._redis.delete(key)


def _build_limiter(limit: int, window: int, prefix: str):
    if REDIS_URL:
        try:
            limiter = RedisRateLimiter(limit, window, prefix=prefix)
            # Connectivity check
            limiter._redis.ping()
            return limiter, "redis"
        except Exception as exc:
            log.warning("Redis rate limit unavailable (%s) — using memory", exc)
    return RateLimiter(limit, window), "memory"


auth_limiter, _auth_backend = _build_limiter(20, 60, "auth")
analysis_limiter, _analysis_backend = _build_limiter(10, 60, "analysis")
upload_limiter, _upload_backend = _build_limiter(20, 60, "upload")
_backend = (
    "redis"
    if "redis" in {_auth_backend, _analysis_backend, _upload_backend}
    else "memory"
)


def reset_all_limiters() -> None:
    auth_limiter.reset()
    analysis_limiter.reset()
    upload_limiter.reset()


def backend_name() -> str:
    return _backend
