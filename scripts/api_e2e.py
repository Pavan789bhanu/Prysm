#!/usr/bin/env python3
"""API e2e smoke against a running Prysm backend (cookie + bearer compatible)."""
from __future__ import annotations

import os
import sys
import time
import uuid

import httpx

API_URL = os.getenv("API_URL", "http://localhost:8000").rstrip("/")


def main() -> int:
    client = httpx.Client(base_url=API_URL, timeout=60.0)
    health = client.get("/api/health")
    health.raise_for_status()
    assert health.json()["status"] in {"ok", "degraded"}

    suffix = uuid.uuid4().hex[:8]
    username = f"e2e_{suffix}"
    email = f"{username}@example.com"
    password = "password12345"

    register = client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    assert register.status_code == 201, register.text
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sample = client.post("/api/datasets/sample", headers=headers)
    assert sample.status_code == 200, sample.text
    dataset_id = sample.json()["dataset"]["id"]

    created = client.post(
        "/api/analyses",
        headers=headers,
        json={
            "dataset_id": dataset_id,
            "query": "Show correlations and revenue trends",
            "async": True,
        },
    )
    assert created.status_code in {200, 202}, created.text
    analysis_id = created.json()["analysis"]["id"]

    final = None
    for _ in range(60):
        detail = client.get(f"/api/analyses/{analysis_id}", headers=headers)
        detail.raise_for_status()
        final = detail.json()["analysis"]
        if final["status"] in {"completed", "failed", "cancelled"}:
            break
        time.sleep(1.5)

    assert final and final["status"] == "completed", final
    report = client.get(f"/api/analyses/{analysis_id}/report", headers=headers)
    assert report.status_code == 200
    assert b"Prysm" in report.content
    print(f"API E2E OK — analysis={analysis_id} charts={len(final.get('charts') or [])}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"API E2E FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
