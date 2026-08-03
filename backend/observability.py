"""Lightweight request logging / request-id observability."""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from flask import Flask, g, request


def configure_logging() -> None:
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )


def init_observability(app: Flask) -> None:
    configure_logging()
    log = logging.getLogger("prysm.request")

    @app.before_request
    def _start_timer() -> None:
        g.request_started = time.perf_counter()
        incoming = request.headers.get("X-Request-ID") or ""
        g.request_id = incoming.strip() or uuid.uuid4().hex

    @app.after_request
    def _log_request(response):  # type: ignore[no-untyped-def]
        started = getattr(g, "request_started", None)
        duration_ms = (
            int((time.perf_counter() - started) * 1000) if started is not None else None
        )
        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers["X-Request-ID"] = request_id
        # Skip noisy polling if desired later; for now log all API calls.
        if request.path.startswith("/api/"):
            log.info(
                "method=%s path=%s status=%s duration_ms=%s request_id=%s remote=%s",
                request.method,
                request.path,
                response.status_code,
                duration_ms,
                request_id,
                request.headers.get("X-Forwarded-For", request.remote_addr),
            )
        return response

    @app.errorhandler(Exception)
    def _unhandled(exc: Exception):  # type: ignore[no-untyped-def]
        from flask import jsonify
        from werkzeug.exceptions import HTTPException

        if isinstance(exc, HTTPException):
            return exc

        logging.getLogger("prysm.error").exception(
            "Unhandled error request_id=%s path=%s",
            getattr(g, "request_id", None),
            request.path,
        )
        return jsonify({"message": "Internal server error."}), 500


def health_extras() -> dict[str, Any]:
    extras: dict[str, Any] = {}
    try:
        from jobs import backend_name

        extras["job_backend"] = backend_name()
    except Exception:
        extras["job_backend"] = "unknown"
    try:
        from rate_limit import backend_name as rate_backend_name

        extras["rate_limit_backend"] = rate_backend_name()
    except Exception:
        extras["rate_limit_backend"] = "memory"
    return extras
