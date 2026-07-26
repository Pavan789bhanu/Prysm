"""Shared pytest fixtures.

Each test gets a completely isolated app instance backed by a temporary data
directory (its own SQLite DB + uploads folder), so tests never touch real data
and never interfere with each other.
"""
from __future__ import annotations

import importlib
import importlib.util
import pathlib
import sys
import types

import pytest

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "adminpass123"


def _fake_run_analysis(_dataset_path, query):
    """Stub for the AI engine so route tests don't need dspy/openai/network."""
    return {
        "output": "import pandas as pd\nprint('ok')",
        "agent_outputs": {
            "PlannerAgent": {"plan": "preprocessing_agent", "plan_desc": "clean then go"},
            "preprocessing_agent": {"code": "df = df.dropna()", "commentary": "cleaned"},
        },
        "plan": "preprocessing_agent",
        "plan_desc": "clean then go",
        "dataset_preview": {"rows": 3, "columns": ["a", "b"], "sample": []},
        "charts": [
            {
                "title": "Figure 1",
                "html": "<html><body>chart</body></html>",
                "format": "html",
            }
        ],
        "insights": {"rows": 3, "columns": ["a", "b"]},
        "execution": {"success": True, "stdout": "ok", "stderr": ""},
        "summary": {
            "headline": "Analysis complete",
            "narrative": "Prysm analyzed the dataset and rendered charts.",
            "key_findings": ["3 rows analyzed", "1 chart rendered"],
            "demo_mode": True,
            "chart_count": 1,
            "row_count": 3,
            "column_count": 2,
        },
        "demo_mode": True,
    }


@pytest.fixture
def app_module(tmp_path, monkeypatch):
    """Reload config/models/storage/app against an isolated temp data dir."""
    monkeypatch.setenv("PRYSM_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ADMIN_USERNAME", ADMIN_USERNAME)
    monkeypatch.setenv("ADMIN_EMAIL", "admin@prysm.local")
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-that-is-definitely-32+bytes-long")

    import rate_limit

    rate_limit.reset_all_limiters()

    # Inject a lightweight fake analyst_service so the lazy import in
    # create_analysis resolves without the heavy AI stack.
    fake = types.ModuleType("analyst_service")
    fake.run_analysis = _fake_run_analysis
    monkeypatch.setitem(sys.modules, "analyst_service", fake)

    import config
    import models
    import storage

    importlib.reload(config)
    importlib.reload(models)
    importlib.reload(storage)

    # Load backend/app.py explicitly by path. The project root also contains an
    # app.py (a legacy entry point), so a bare `import app` can resolve to the
    # wrong file depending on sys.path order. Loading by file location is
    # deterministic.
    app_path = BACKEND_DIR / "app.py"
    spec = importlib.util.spec_from_file_location("app", app_path)
    app_mod = importlib.util.module_from_spec(spec)
    sys.modules["app"] = app_mod
    spec.loader.exec_module(app_mod)
    return app_mod


@pytest.fixture
def client(app_module):
    return app_module.app.test_client()


@pytest.fixture
def auth(client):
    """Register a regular user and return (token, headers)."""
    resp = client.post(
        "/api/auth/register",
        json={"username": "venu", "email": "venu@example.com", "password": "password123"},
    )
    token = resp.get_json()["access_token"]
    return token, {"Authorization": f"Bearer {token}"}
