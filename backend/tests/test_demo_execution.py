"""Tests for demo analysis + restricted code execution."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from demo_service import build_demo_analysis, ensure_sample_csv
from executor import execute_analysis_code


def test_sample_csv_exists():
    path = ensure_sample_csv()
    assert path.exists()
    df = pd.read_csv(path)
    assert len(df) > 0
    assert "revenue" in df.columns


def test_demo_analysis_executes_and_returns_charts(tmp_path):
    sample = ensure_sample_csv()
    result = build_demo_analysis(str(sample), "show trends")
    assert "plotly" in result["output"].lower()
    assert result["demo_mode"] is True

    execution = execute_analysis_code(result["output"], str(sample))
    assert execution["success"] is True
    assert len(execution["charts"]) >= 1
    assert execution["insights"]["rows"] > 0


def test_executor_blocks_unsafe_patterns(tmp_path):
    sample = ensure_sample_csv()
    result = execute_analysis_code("import subprocess\nsubprocess.run(['echo','x'])\n", str(sample))
    assert result["success"] is False
    assert "Blocked" in result["stderr"] or "not allowed" in result["stderr"].lower()


def test_executor_blocks_disallowed_imports(tmp_path):
    sample = ensure_sample_csv()
    result = execute_analysis_code("import os\nprint(os.getcwd())\n", str(sample))
    assert result["success"] is False
    assert "not allowed" in result["stderr"].lower()


def test_executor_blocks_open_and_dunder(tmp_path):
    sample = ensure_sample_csv()
    opened = execute_analysis_code("open('/etc/passwd').read()\n", str(sample))
    assert opened["success"] is False
    dunder = execute_analysis_code("print(df.__class__)\n", str(sample))
    assert dunder["success"] is False
