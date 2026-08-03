"""Background job backends for analysis runs.

Default: in-process threads (single-node demos).
Optional: Redis + RQ when REDIS_URL is reachable.
"""
from __future__ import annotations

import logging
import threading
from typing import Callable

from config import JOB_BACKEND, REDIS_URL

log = logging.getLogger("prysm.jobs")

_lock = threading.Lock()
_running: set[int] = set()
_cancelled: set[int] = set()
_backend = "thread"
_rq_queue = None


def _init_rq():
    global _backend, _rq_queue
    if JOB_BACKEND == "thread":
        _backend = "thread"
        return
    if JOB_BACKEND not in {"auto", "rq"}:
        _backend = "thread"
        return
    if not REDIS_URL:
        if JOB_BACKEND == "rq":
            log.warning("JOB_BACKEND=rq but REDIS_URL is unset — falling back to threads")
        _backend = "thread"
        return
    try:
        from redis import Redis
        from rq import Queue

        conn = Redis.from_url(REDIS_URL)
        conn.ping()
        _rq_queue = Queue("prysm-analyses", connection=conn)
        _backend = "rq"
        log.info("Using RQ job backend at %s", REDIS_URL)
    except Exception as exc:
        log.warning("Redis/RQ unavailable (%s) — falling back to threads", exc)
        _backend = "thread"
        _rq_queue = None


_init_rq()


def backend_name() -> str:
    return _backend


def start_analysis_job(analysis_id: int, worker: Callable[[], None] | None = None) -> bool:
    """Queue an analysis. Prefer analysis_runner when using RQ."""
    if _backend == "rq" and _rq_queue is not None:
        try:
            from analysis_runner import run_analysis_task

            job = _rq_queue.enqueue(run_analysis_task, analysis_id, job_timeout=600)
            models_update_job_id(analysis_id, job.id)
            return True
        except Exception as exc:
            log.warning("RQ enqueue failed (%s) — falling back to thread", exc)

    return _start_thread(analysis_id, worker)


def models_update_job_id(analysis_id: int, job_id: str) -> None:
    try:
        import models

        with models.get_connection() as conn:
            conn.execute(
                "UPDATE analyses SET job_id = ? WHERE id = ?",
                (job_id, analysis_id),
            )
    except Exception:
        return


def _start_thread(analysis_id: int, worker: Callable[[], None] | None) -> bool:
    if worker is None:
        from analysis_runner import run_analysis_task

        def worker() -> None:
            run_analysis_task(analysis_id)

    with _lock:
        if analysis_id in _running:
            return False
        _running.add(analysis_id)
        _cancelled.discard(analysis_id)

    def _run() -> None:
        try:
            worker()
        finally:
            with _lock:
                _running.discard(analysis_id)
                _cancelled.discard(analysis_id)

    thread = threading.Thread(
        target=_run,
        name=f"prysm-analysis-{analysis_id}",
        daemon=True,
    )
    thread.start()
    return True


def is_running(analysis_id: int) -> bool:
    with _lock:
        if analysis_id in _running:
            return True
    # RQ jobs are considered running if still processing/pending in DB.
    try:
        import models

        analysis = models.get_analysis_by_id(analysis_id)
        return bool(analysis and analysis["status"] in {"pending", "processing"})
    except Exception:
        return False


def request_cancel(analysis_id: int) -> bool:
    with _lock:
        if analysis_id in _running:
            _cancelled.add(analysis_id)
            return True
    return _backend == "rq"


def is_cancelled(analysis_id: int) -> bool:
    with _lock:
        if analysis_id in _cancelled:
            return True
    try:
        import models

        return models.is_analysis_cancel_requested(analysis_id)
    except Exception:
        return False
