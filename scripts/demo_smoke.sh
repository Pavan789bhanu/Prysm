#!/usr/bin/env bash
# Offline funding-demo smoke: sample CSV → execute → summary → report HTML.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

export DEMO_MODE=true
export SECRET_KEY="${SECRET_KEY:-demo-smoke-secret-key-32chars-min}"

python3 - <<'PY'
from demo_service import build_demo_analysis, ensure_sample_csv
from executor import execute_analysis_code
from report import render_analysis_report
from summary import build_executive_summary

sample = ensure_sample_csv()
demo = build_demo_analysis(str(sample), "Show revenue trends by region")
execution = execute_analysis_code(demo["output"], str(sample))
assert execution.get("success"), execution.get("stderr")
assert execution.get("charts"), "expected charts"
summary = build_executive_summary(
    query="Show revenue trends by region",
    dataset_path=str(sample),
    insights=execution.get("insights"),
    charts=execution.get("charts"),
    plan=demo.get("plan"),
    demo_mode=True,
)
assert summary["key_findings"], "expected findings"
html = render_analysis_report(
    {
        "id": 1,
        "query": "Show revenue trends by region",
        "filename": sample.name,
        "plan": demo.get("plan"),
        "status": "completed",
        "summary": summary,
        "charts": execution.get("charts"),
        "dataset_preview": demo.get("dataset_preview"),
    }
)
assert "Stakeholder Report" in html
print(f"SMOKE OK — charts={len(execution['charts'])} findings={len(summary['key_findings'])}")
PY
