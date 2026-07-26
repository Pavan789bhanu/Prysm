"""Stakeholder-facing executive summaries from analysis outputs."""
from __future__ import annotations

from typing import Any

import pandas as pd


def build_executive_summary(
    *,
    query: str,
    dataset_path: str | None = None,
    insights: dict[str, Any] | None = None,
    charts: list | None = None,
    plan: str | None = None,
    demo_mode: bool = False,
) -> dict[str, Any]:
    insights = insights or {}
    charts = charts or []

    rows = insights.get("rows")
    columns = insights.get("columns") or []
    null_counts = insights.get("null_counts") or {}
    numeric_summary = insights.get("numeric_summary") or {}

    if dataset_path and (rows is None or not columns):
        try:
            df = pd.read_csv(dataset_path)
            rows = len(df)
            columns = list(df.columns.astype(str))
            null_counts = {c: int(v) for c, v in df.isna().sum().items()}
            numeric_summary = {
                col: {
                    "mean": float(df[col].mean()),
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                }
                for col in df.select_dtypes(include="number").columns
            }
        except Exception:
            pass

    rows = rows or 0
    findings: list[str] = []

    if rows and columns:
        findings.append(
            f"Dataset covers {rows:,} rows across {len(columns)} columns."
        )

    if null_counts:
        dirty = sorted(
            ((col, count) for col, count in null_counts.items() if count),
            key=lambda item: item[1],
            reverse=True,
        )[:3]
        if dirty:
            findings.append(
                "Missing values concentrated in "
                + ", ".join(f"{col} ({count})" for col, count in dirty)
                + "."
            )
        else:
            findings.append("No missing values detected in the analyzed sample.")

    # Highlight strongest numeric signal by range / mean when available.
    if numeric_summary:
        ranked = []
        for col, stats in numeric_summary.items():
            if not isinstance(stats, dict):
                continue
            # describe()-style nested or flat mean/min/max
            mean = stats.get("mean")
            if isinstance(mean, dict):
                mean = mean.get("mean") or next(iter(mean.values()), None)
            min_v = stats.get("min")
            max_v = stats.get("max")
            if isinstance(min_v, dict):
                min_v = min_v.get("min") or next(iter(min_v.values()), None)
            if isinstance(max_v, dict):
                max_v = max_v.get("max") or next(iter(max_v.values()), None)
            try:
                if mean is not None:
                    ranked.append((col, float(mean), float(min_v or 0), float(max_v or 0)))
            except (TypeError, ValueError):
                continue
        ranked.sort(key=lambda item: abs(item[3] - item[2]), reverse=True)
        if ranked:
            col, mean, min_v, max_v = ranked[0]
            findings.append(
                f"Strongest numeric spread appears in `{col}` "
                f"(mean {mean:,.2f}, range {min_v:,.2f} → {max_v:,.2f})."
            )

    if charts:
        findings.append(
            f"Rendered {len(charts)} interactive visualization"
            f"{'s' if len(charts) != 1 else ''} from the executed pipeline."
        )
    else:
        findings.append(
            "Code was generated; chart rendering did not produce figures for this run."
        )

    if plan:
        findings.append(f"Agent plan executed: {plan}.")

    mode_note = (
        "Generated in offline demo mode for reliable stakeholder presentations."
        if demo_mode
        else "Generated with the live multi-agent AI pipeline."
    )

    headline = (
        f"Prysm analyzed your request — “{query.strip()}” — and produced an "
        f"executable insight package with {len(charts)} chart"
        f"{'s' if len(charts) != 1 else ''}."
    )

    narrative = " ".join(
        [
            headline,
            f"The workspace scanned {rows:,} rows"
            + (f" and {len(columns)} fields." if columns else "."),
            mode_note,
        ]
    )

    return {
        "headline": headline,
        "narrative": narrative,
        "key_findings": findings[:6],
        "demo_mode": demo_mode,
        "chart_count": len(charts),
        "row_count": rows,
        "column_count": len(columns),
    }
