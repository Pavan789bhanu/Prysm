"""Demo dataset + offline analysis for stakeholder demos without OpenAI."""
from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pandas as pd

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"
SAMPLE_FILENAME = "prysm_demo_sales.csv"


def ensure_sample_csv() -> Path:
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    path = SAMPLES_DIR / SAMPLE_FILENAME
    if path.exists():
        return path

    rows = []
    regions = ["North", "South", "East", "West"]
    products = ["Analytics Pro", "Insight Lite", "Prism Cloud", "Data Forge"]
    for month in range(1, 13):
        for i, product in enumerate(products):
            rows.append(
                {
                    "month": f"2025-{month:02d}",
                    "region": regions[i % len(regions)],
                    "product": product,
                    "units_sold": 40 + month * 3 + i * 7,
                    "revenue": round((40 + month * 3 + i * 7) * (29 + i * 11) * 1.08, 2),
                    "marketing_spend": round(800 + month * 40 + i * 120, 2),
                    "nps": 42 + (month % 5) + i,
                }
            )
    pd.DataFrame(rows).to_csv(path, index=False)
    return path


def sample_file_bytes() -> tuple[str, io.BytesIO]:
    path = ensure_sample_csv()
    return SAMPLE_FILENAME, io.BytesIO(path.read_bytes())


def build_demo_analysis(dataset_path: str, query: str) -> dict[str, Any]:
    """Produce a deterministic, executable analysis pipeline for demos."""
    df = pd.read_csv(dataset_path)
    numeric = list(df.select_dtypes(include="number").columns)
    categorical = [c for c in df.columns if c not in numeric]

    x_col = numeric[0] if numeric else str(df.columns[0])
    y_col = (
        numeric[1]
        if len(numeric) > 1
        else (numeric[0] if numeric else str(df.columns[-1]))
    )
    cat_col = categorical[0] if categorical else None

    lines = [
        "import pandas as pd",
        "import plotly.express as px",
        "",
        '# Load dataset (executor rewrites path automatically)',
        'df = pd.read_csv("dataset.csv")',
        "",
        'print("Shape:", df.shape)',
        'print("Columns:", list(df.columns))',
        "print(df.describe(include='all').transpose().head(12))",
        "",
        "numeric_df = df.select_dtypes(include='number')",
        "if not numeric_df.empty:",
        "    corr = numeric_df.corr(numeric_only=True)",
        "    fig_corr = px.imshow(",
        "        corr,",
        '        text_auto=".2f",',
        '        title="Numeric feature correlations",',
        '        color_continuous_scale="Magma",',
        "    )",
        "    fig_corr.show()",
        "",
        "fig_scatter = px.scatter(",
        "    df,",
        f'    x="{x_col}",',
        f'    y="{y_col}",',
    ]
    if cat_col:
        lines.append(f'    color="{cat_col}",')
    lines.extend(
        [
            f'    title="{y_col} vs {x_col}",',
            ")",
            "fig_scatter.show()",
        ]
    )
    if cat_col and y_col in numeric:
        lines.extend(
            [
                "",
                f'grouped = df.groupby("{cat_col}", as_index=False)["{y_col}"].mean()',
                "fig_bar = px.bar(",
                "    grouped,",
                f'    x="{cat_col}",',
                f'    y="{y_col}",',
                f'    title="Average {y_col} by {cat_col}",',
                ")",
                "fig_bar.show()",
            ]
        )

    if "month" in df.columns and y_col in numeric:
        lines.extend(
            [
                "",
                f'trend = df.groupby("month", as_index=False)["{y_col}"].sum()',
                "fig_trend = px.line(",
                "    trend,",
                '    x="month",',
                f'    y="{y_col}",',
                f'    markers=True,',
                f'    title="{y_col} over time",',
                ")",
                "fig_trend.show()",
            ]
        )

    code = "\n".join(lines)
    plan = "preprocessing_agent -> statistical_analytics_agent -> Data_Viz"
    plan_desc = (
        "Demo mode planned a clean EDA → correlation → visualization flow "
        f"for query: {query!r}."
    )

    return {
        "output": code,
        "agent_outputs": {
            "PlannerAgent": {"plan": plan, "plan_desc": plan_desc},
            "preprocessing_agent": {
                "commentary": "Profile shape, dtypes, and summary statistics.",
                "code": "print(df.shape)\nprint(df.describe(include='all'))",
            },
            "statistical_analytics_agent": {
                "commentary": "Compute numeric correlations for key relationships.",
                "code": "corr = df.select_dtypes(include='number').corr()",
            },
            "Data_Viz": {
                "commentary": "Render correlation heatmap and trend charts with Plotly.",
                "code": "fig = px.imshow(corr)\nfig.show()",
            },
        },
        "plan": plan,
        "plan_desc": plan_desc,
        "dataset_preview": {
            "rows": len(df),
            "columns": list(df.columns),
            "sample": json.loads(
                df.head(5).to_json(orient="records", date_format="iso")
            ),
        },
        "demo_mode": True,
    }
