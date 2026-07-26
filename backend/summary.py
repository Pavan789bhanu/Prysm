"""Stakeholder-facing executive summaries from analysis outputs."""
from __future__ import annotations

from typing import Any

import pandas as pd


def _business_findings(df: pd.DataFrame) -> list[str]:
    """Extra narrative when the dataset looks like a sales / KPI table."""
    findings: list[str] = []
    cols = {c.lower(): c for c in df.columns}

    revenue_col = cols.get("revenue")
    region_col = cols.get("region")
    product_col = cols.get("product")
    spend_col = cols.get("marketing_spend") or cols.get("marketing spend")
    units_col = cols.get("units_sold") or cols.get("units")

    if revenue_col is not None:
        total = float(df[revenue_col].sum())
        findings.append(f"Total recorded revenue is ${total:,.0f} across the analyzed window.")
        if region_col is not None:
            by_region = df.groupby(region_col)[revenue_col].sum().sort_values(ascending=False)
            top_region = by_region.index[0]
            share = float(by_region.iloc[0] / total) if total else 0.0
            findings.append(
                f"Top region by revenue is {top_region} "
                f"(${float(by_region.iloc[0]):,.0f}, {share:.0%} of total)."
            )
        if product_col is not None:
            by_product = df.groupby(product_col)[revenue_col].sum().sort_values(ascending=False)
            findings.append(
                f"Leading product line is {by_product.index[0]} "
                f"at ${float(by_product.iloc[0]):,.0f}."
            )

    if spend_col is not None and revenue_col is not None:
        corr = df[[spend_col, revenue_col]].corr().iloc[0, 1]
        if pd.notna(corr):
            findings.append(
                f"Marketing spend correlates with revenue at r={float(corr):.2f} "
                "(useful signal for growth conversations)."
            )

    if units_col is not None:
        findings.append(
            f"Volume footprint: {int(df[units_col].sum()):,} units sold "
            f"(avg {float(df[units_col].mean()):.1f} per row)."
        )

    return findings


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
    df: pd.DataFrame | None = None

    if dataset_path:
        try:
            df = pd.read_csv(dataset_path)
            if rows is None or not columns:
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
            df = None

    rows = rows or 0
    findings: list[str] = []

    if df is not None:
        findings.extend(_business_findings(df))

    if rows and columns and not findings:
        findings.append(
            f"Dataset covers {rows:,} rows across {len(columns)} columns."
        )
    elif rows and columns:
        findings.insert(
            0,
            f"Dataset covers {rows:,} rows across {len(columns)} columns.",
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
        elif not any("missing" in f.lower() for f in findings):
            findings.append("No missing values detected in the analyzed sample.")

    if numeric_summary:
        ranked = []
        for col, stats in numeric_summary.items():
            if not isinstance(stats, dict):
                continue
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

    # Keep the board deck tight.
    deduped: list[str] = []
    seen: set[str] = set()
    for item in findings:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return {
        "headline": headline,
        "narrative": narrative,
        "key_findings": deduped[:7],
        "demo_mode": demo_mode,
        "chart_count": len(charts),
        "row_count": rows,
        "column_count": len(columns),
    }
