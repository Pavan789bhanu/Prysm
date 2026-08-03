"""RQ worker entrypoint for durable analysis jobs.

Usage:
  REDIS_URL=redis://localhost:6379/0 python worker.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from redis import Redis
from rq import Worker

from config import REDIS_URL


def main() -> None:
    if not REDIS_URL:
        raise SystemExit("REDIS_URL is required to start the RQ worker")
    conn = Redis.from_url(REDIS_URL)
    worker = Worker(["prysm-analyses"], connection=conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
