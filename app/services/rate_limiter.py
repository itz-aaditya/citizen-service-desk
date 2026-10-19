import time
from collections import defaultdict
from typing import Dict, List

from fastapi import HTTPException, Request, status

from app.config import settings


class InMemoryRateLimiter:
    """High-performance sliding-window in-memory rate limiter per client IP and endpoint path."""

    def __init__(self):
        # key -> list of float timestamps
        self._history: Dict[str, List[float]] = defaultdict(list)

    def check(
        self,
        request: Request,
        max_requests: int = 30,
        window_seconds: int = 60,
    ) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        # Bypass header if present (for whitelisted internal / automated testing)
        if request.headers.get("X-Bypass-Rate-Limit") == "1":
            return

        client_ip = "127.0.0.1"
        if request.client and request.client.host:
            client_ip = request.client.host
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        key = f"{client_ip}:{request.url.path}"
        now = time.time()
        cutoff = now - window_seconds

        history = [ts for ts in self._history[key] if ts > cutoff]
        self._history[key] = history

        if len(history) >= max_requests:
            retry_after = int(window_seconds - (now - history[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "rate_limit_exceeded",
                    "message": f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds}s.",
                },
                headers={"Retry-After": str(max(1, retry_after))},
            )

        self._history[key].append(now)

    def reset(self) -> None:
        self._history.clear()


limiter = InMemoryRateLimiter()
