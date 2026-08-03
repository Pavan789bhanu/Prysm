"""Honest demo readiness checks for stakeholder presentations."""
from __future__ import annotations

import time
from typing import Any

_CACHE: dict[str, Any] = {"ts": 0.0, "payload": None}
_CACHE_TTL = 45.0


def build_demo_status(*, deep: bool = False) -> dict[str, Any]:
    now = time.time()
    if not deep and _CACHE["payload"] and now - float(_CACHE["ts"]) < _CACHE_TTL:
        return dict(_CACHE["payload"])

    from config import OPENAI_API_KEY, use_demo_analysis
    from demo_service import ensure_sample_csv

    checks: dict[str, Any] = {
        "sample_csv": False,
        "pandas": False,
        "plotly": False,
        "executor": False,
    }
    issues: list[str] = []

    sample_path = None
    try:
        sample_path = ensure_sample_csv()
        checks["sample_csv"] = sample_path.exists() and sample_path.stat().st_size > 0
        if not checks["sample_csv"]:
            issues.append("Sample CSV is missing or empty")
    except Exception as exc:
        issues.append(f"Sample CSV unavailable: {exc}")

    try:
        import pandas as pd  # noqa: F401

        checks["pandas"] = True
    except Exception:
        issues.append("pandas is not installed")

    try:
        import plotly  # noqa: F401

        checks["plotly"] = True
    except Exception:
        issues.append("plotly is not installed")

    if checks["sample_csv"] and checks["pandas"] and checks["plotly"] and sample_path:
        try:
            from executor import execute_analysis_code

            smoke = execute_analysis_code(
                "import plotly.express as px\n"
                'fig = px.scatter(df, x=df.columns[0], y=df.columns[-1], title="Ready")\n'
                "fig.show()\n",
                str(sample_path),
            )
            checks["executor"] = bool(smoke.get("success")) and bool(smoke.get("charts"))
            if not checks["executor"]:
                issues.append((smoke.get("stderr") or "Executor smoke failed")[:240])
        except Exception as exc:
            issues.append(f"Executor check failed: {exc}")
    else:
        issues.append("Executor skipped until sample CSV and chart dependencies are healthy")

    demo_mode = use_demo_analysis()
    openai_configured = bool(OPENAI_API_KEY)
    core_ready = all(
        [checks["sample_csv"], checks["pandas"], checks["plotly"], checks["executor"]]
    )

    payload = {
        "demo_mode": demo_mode,
        "openai_configured": openai_configured,
        "one_click_demo": True,
        "charts_enabled": checks["plotly"] and checks["executor"],
        "async_analyses": True,
        "present_mode": True,
        "report_export": True,
        "executive_summaries": True,
        "checks": checks,
        "issues": issues,
        "ready_for_stakeholders": core_ready,
    }
    _CACHE["ts"] = now
    _CACHE["payload"] = payload
    return dict(payload)
