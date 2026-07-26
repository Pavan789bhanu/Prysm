"""Lightweight in-process background jobs for analysis runs.

Good enough for demos and single-node beta. Replace with Celery/RQ for
multi-instance production.
"""
from __future__ import annotations

import threading
from typing import Callable


_lock = threading.Lock()
_running: set[int] = set()


def start_analysis_job(analysis_id: int, worker: Callable[[], None]) -> bool:
    """Start a daemon thread for an analysis if one is not already running."""
    with _lock:
        if analysis_id in _running:
            return False
        _running.add(analysis_id)

    def _run() -> None:
        try:
            worker()
        finally:
            with _lock:
                _running.discard(analysis_id)

    thread = threading.Thread(
        target=_run,
        name=f"prysm-analysis-{analysis_id}",
        daemon=True,
    )
    thread.start()
    return True


def is_running(analysis_id: int) -> bool:
    with _lock:
        return analysis_id in _running
