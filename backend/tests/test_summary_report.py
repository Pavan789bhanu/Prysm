"""Unit tests for executive summary + HTML report builders."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from report import render_analysis_report
from summary import build_executive_summary


def test_business_findings_from_sales_csv(tmp_path: Path):
    path = tmp_path / "sales.csv"
    pd.DataFrame(
        {
            "month": ["2025-01", "2025-01", "2025-02"],
            "region": ["North", "South", "North"],
            "product": ["Analytics Pro", "Insight Lite", "Analytics Pro"],
            "units_sold": [10, 20, 15],
            "revenue": [1000, 500, 1500],
            "marketing_spend": [100, 80, 120],
            "nps": [45, 50, 48],
        }
    ).to_csv(path, index=False)

    summary = build_executive_summary(
        query="Show revenue trends by region",
        dataset_path=str(path),
        insights={},
        charts=[{"title": "Trend", "html": "<div/>"}],
        plan="preprocessing_agent -> Data_Viz",
        demo_mode=True,
    )

    findings = " ".join(summary["key_findings"]).lower()
    assert "revenue" in findings
    assert "north" in findings
    assert summary["chart_count"] == 1
    assert summary["demo_mode"] is True
    assert "offline demo mode" in summary["narrative"].lower()


def test_report_includes_print_action_and_findings():
    html = render_analysis_report(
        {
            "id": 7,
            "query": "Investor demo analysis",
            "filename": "sales.csv",
            "plan": "preprocessing_agent -> Data_Viz",
            "status": "completed",
            "summary": {
                "headline": "Done",
                "narrative": "Board-ready narrative",
                "key_findings": ["Total revenue is strong", "North leads"],
                "demo_mode": True,
            },
            "charts": [{"title": "Revenue", "html": "<div>chart</div>"}],
            "dataset_preview": {
                "columns": ["region", "revenue"],
                "sample": [{"region": "North", "revenue": 100}],
            },
        }
    )
    assert "Stakeholder Report" in html
    assert "Print / Save PDF" in html
    assert "Total revenue is strong" in html
    assert "Offline demo mode" in html
