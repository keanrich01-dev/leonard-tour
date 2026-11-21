"""Fixed-window rate limiter. Redis when available (shared across workers); in-memory fallback."""
import logging
import time

import redis

from app.core.config import settings

log = logging.getLogger("ratelimit")


class RateLimiter:
    def __init__(self):
        self._mem: dict[str, tuple[int, float]] = {}
        self._redis = None
        self._redis_down_until = 0.0

    def _client(self):
        if time.time() < self._redis_down_until:
            return None
        if self._redis is None:
            self._redis = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=0.3,
                                               socket_timeout=0.3)
        return self._redis

    def hit(self, key: str, limit: int, window_seconds: int) -> bool:
        """Count an attempt. Returns False when the caller is over the limit."""
        r = self._client()
        if r is not None:
            try:
                k = f"rl:{key}"
                pipe = r.pipeline()
                pipe.incr(k)
                pipe.expire(k, window_seconds, nx=True)
                count = pipe.execute()[0]
                return count <= limit
            except redis.RedisError:
                log.warning("Redis unavailable; using in-memory rate limiting for 30s")
                self._redis_down_until = time.time() + 30
        now = time.time()
        count, reset = self._mem.get(key, (0, now + window_seconds))
        if now >= reset:
            count, reset = 0, now + window_seconds
        count += 1
        self._mem[key] = (count, reset)
        return count <= limit

    def reset(self, key: str | None = None):
        if key is None:
            self._mem.clear()
            r = self._client()
            if r is not None:
                try:
                    for k in r.scan_iter("rl:*"):
                        r.delete(k)
                except redis.RedisError:
                    pass
        else:
            self._mem.pop(key, None)


limiter = RateLimiter()
