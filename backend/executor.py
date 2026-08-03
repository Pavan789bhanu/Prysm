"""Restricted execution of generated analysis code.

Runs agent-produced Python against the uploaded CSV in a temporary working
directory, captures stdout/stderr, and extracts Plotly HTML figures so the
dashboard can show real charts — not just source code.
"""
from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path
from typing import Any


TIMEOUT_SECONDS = int(os.getenv("CODE_EXEC_TIMEOUT", "45"))

_SENSITIVE_ENV_MARKERS = (
    "SECRET",
    "PASSWORD",
    "TOKEN",
    "API_KEY",
    "APIKEY",
    "PRIVATE_KEY",
    "ACCESS_KEY",
    "OPENAI",
    "AWS_",
)


def _is_sensitive_env(key: str) -> bool:
    upper = key.upper()
    return any(marker in upper for marker in _SENSITIVE_ENV_MARKERS)


_WRAPPER = textwrap.dedent(
    """
    import json
    import os
    import sys
    import traceback
    from pathlib import Path

    import pandas as pd

    DATASET_PATH = Path(os.environ["PRYSM_DATASET_PATH"])
    OUTPUT_DIR = Path(os.environ["PRYSM_OUTPUT_DIR"])
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load the real uploaded dataset under the names agents typically use.
    df = pd.read_csv(DATASET_PATH)
    df_name = df.copy()
    data = df.copy()

    # Capture Plotly figures written via fig.show / write_html / write_image.
    _figures = []
    try:
        import plotly.graph_objects as go

        def _capture_show(self, *args, **kwargs):
            idx = len(_figures) + 1
            html_path = OUTPUT_DIR / f"figure_{idx}.html"
            self.write_html(str(html_path), include_plotlyjs="cdn", full_html=True)
            _figures.append(str(html_path.name))
            return None

        go.Figure.show = _capture_show
    except Exception:
        pass

    try:
        __USER_CODE__
    except Exception:
        traceback.print_exc()
        sys.exit(1)

    insights = {
        "rows": int(len(df)),
        "columns": list(df.columns.astype(str)),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "null_counts": {c: int(v) for c, v in df.isna().sum().items()},
        "numeric_summary": json.loads(
            df.select_dtypes(include="number").describe().to_json()
        ),
        "figures": _figures,
    }
    (OUTPUT_DIR / "insights.json").write_text(json.dumps(insights), encoding="utf-8")
    print(json.dumps({"ok": True, "figures": _figures}))
    """
)


def _rewrite_csv_loads(code: str) -> str:
    """Replace hardcoded pd.read_csv('...') with the uploaded dataset path."""
    patterns = [
        r"pd\.read_csv\(\s*['\"][^'\"]+['\"]\s*\)",
        r"pandas\.read_csv\(\s*['\"][^'\"]+['\"]\s*\)",
    ]
    rewritten = code
    for pattern in patterns:
        rewritten = re.sub(pattern, "pd.read_csv(DATASET_PATH)", rewritten)
    return rewritten


def execute_analysis_code(code: str, dataset_path: str) -> dict[str, Any]:
    """Execute generated analysis code and return charts + insights + logs."""
    if not code or not code.strip():
        return {
            "success": False,
            "stdout": "",
            "stderr": "No code to execute.",
            "charts": [],
            "insights": None,
        }

    # Soft guardrails: reject obviously dangerous patterns before spawning.
    blocked = (
        "subprocess",
        "socket",
        "__import__('os')",
        "os.system",
        "shutil.rmtree",
        "pathlib.Path('/')",
        "open('/",
        "eval(",
        "exec(",
        "pickle",
    )
    lowered = code.lower()
    for token in blocked:
        if token.lower() in lowered:
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Blocked potentially unsafe code pattern: {token}",
                "charts": [],
                "insights": None,
            }

    work = Path(tempfile.mkdtemp(prefix="prysm-exec-"))
    out_dir = work / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    script_path = work / "run.py"

    indented = textwrap.indent(_rewrite_csv_loads(code).strip() + "\n", "    ")
    script = _WRAPPER.replace("    __USER_CODE__\n", indented)
    script_path.write_text(script, encoding="utf-8")

    # Inherit runtime paths so site-packages resolve, but strip secrets/tokens.
    env = {
        key: value
        for key, value in os.environ.items()
        if not _is_sensitive_env(key)
    }
    env["PRYSM_DATASET_PATH"] = str(Path(dataset_path).resolve())
    env["PRYSM_OUTPUT_DIR"] = str(out_dir.resolve())
    env["MPLBACKEND"] = "Agg"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    # Ensure generated code cannot see common secret variables even if renamed oddly.
    for banned in (
        "OPENAI_API_KEY",
        "SECRET_KEY",
        "ADMIN_PASSWORD",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_ACCESS_KEY_ID",
    ):
        env.pop(banned, None)

    try:
        completed = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=str(work),
            env=env,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            check=False,
        )
        stdout = completed.stdout[-8000:]
        stderr = completed.stderr[-8000:]
        success = completed.returncode == 0
    except subprocess.TimeoutExpired:
        stdout = ""
        stderr = f"Code execution timed out after {TIMEOUT_SECONDS}s."
        success = False
    except Exception as exc:
        stdout = ""
        stderr = str(exc)
        success = False

    charts: list[dict[str, str]] = []
    for html_file in sorted(out_dir.glob("figure_*.html")):
        try:
            html = html_file.read_text(encoding="utf-8")
            charts.append(
                {
                    "title": html_file.stem.replace("_", " ").title(),
                    "html": html,
                    "format": "html",
                }
            )
        except Exception:
            continue

    # Also pick up any PNG exports if agents wrote them.
    for png_file in sorted(out_dir.glob("*.png")):
        try:
            encoded = base64.b64encode(png_file.read_bytes()).decode("ascii")
            charts.append(
                {
                    "title": png_file.stem.replace("_", " ").title(),
                    "html": (
                        f'<img alt="{png_file.stem}" '
                        f'src="data:image/png;base64,{encoded}" '
                        f'style="max-width:100%;height:auto;" />'
                    ),
                    "format": "png",
                }
            )
        except Exception:
            continue

    insights = None
    insights_path = out_dir / "insights.json"
    if insights_path.exists():
        try:
            insights = json.loads(insights_path.read_text(encoding="utf-8"))
        except Exception:
            insights = None

    shutil.rmtree(work, ignore_errors=True)

    return {
        "success": success,
        "stdout": stdout,
        "stderr": stderr,
        "charts": charts,
        "insights": insights,
    }
