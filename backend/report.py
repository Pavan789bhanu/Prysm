"""HTML report generator for stakeholder / investor demos."""
from __future__ import annotations

import html
from datetime import datetime, timezone
from typing import Any


def render_analysis_report(analysis: dict[str, Any]) -> str:
    summary = analysis.get("summary") or {}
    findings = summary.get("key_findings") or []
    charts = analysis.get("charts") or []
    preview = analysis.get("dataset_preview") or {}
    columns = preview.get("columns") or []
    sample = preview.get("sample") or []
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    findings_html = "".join(
        f"<li>{html.escape(str(item))}</li>" for item in findings
    ) or "<li>No findings recorded.</li>"

    chart_blocks = []
    for index, chart in enumerate(charts, start=1):
        title = html.escape(str(chart.get("title") or f"Chart {index}"))
        body = chart.get("html") or ""
        chart_blocks.append(
            f"""
            <section class="card">
              <h3>{title}</h3>
              <div class="chart">{body}</div>
            </section>
            """
        )

    sample_rows = ""
    if sample and columns:
        head = "".join(f"<th>{html.escape(str(c))}</th>" for c in columns)
        body_rows = []
        for row in sample[:8]:
            cells = "".join(
                f"<td>{html.escape('' if row.get(c) is None else str(row.get(c)))}</td>"
                for c in columns
            )
            body_rows.append(f"<tr>{cells}</tr>")
        sample_rows = (
            f"<table><thead><tr>{head}</tr></thead>"
            f"<tbody>{''.join(body_rows)}</tbody></table>"
        )

    query = html.escape(str(analysis.get("query") or ""))
    filename = html.escape(str(analysis.get("filename") or "dataset"))
    plan = html.escape(str(analysis.get("plan") or "—"))
    narrative = html.escape(
        str(summary.get("narrative") or summary.get("headline") or "")
    )
    status = html.escape(str(analysis.get("status") or ""))
    demo_badge = (
        '<span class="pill accent">Offline demo mode</span>'
        if summary.get("demo_mode")
        else '<span class="pill">Live AI pipeline</span>'
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Prysm Analysis Report #{analysis.get("id")}</title>
  <style>
    :root {{
      --bg: #0a0612; --fg: #f6f3fc; --muted: #b6abce;
      --card: rgba(255,255,255,0.06); --accent: #ec4899; --line: rgba(255,255,255,0.12);
    }}
    body {{
      margin: 0; font-family: "Segoe UI", system-ui, sans-serif; color: var(--fg);
      background: radial-gradient(40rem 40rem at 10% -10%, rgba(168,85,247,.35), transparent),
                  radial-gradient(35rem 35rem at 90% 0%, rgba(236,72,153,.3), transparent),
                  var(--bg);
      padding: 40px 20px 80px;
    }}
    .wrap {{ max-width: 980px; margin: 0 auto; }}
    .hero {{
      border: 1px solid var(--line); background: var(--card); border-radius: 24px;
      padding: 28px 32px; backdrop-filter: blur(12px);
    }}
    .brand {{ letter-spacing: .08em; text-transform: uppercase; color: var(--accent); font-size: 12px; font-weight: 700; }}
    h1 {{ margin: 10px 0 8px; font-size: 28px; line-height: 1.2; }}
    p {{ color: var(--muted); line-height: 1.6; }}
    .meta {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }}
    .pill {{
      border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; font-size: 12px;
      background: rgba(255,255,255,0.04);
    }}
    .pill.accent {{ border-color: rgba(236,72,153,.45); color: #fda4d4; }}
    .card {{
      margin-top: 18px; border: 1px solid var(--line); background: var(--card);
      border-radius: 20px; padding: 22px 24px;
    }}
    h2, h3 {{ margin: 0 0 12px; }}
    ul {{ margin: 0; padding-left: 18px; color: var(--muted); }}
    li {{ margin: 8px 0; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 8px; text-align: left; }}
    th {{ color: var(--muted); font-weight: 600; }}
    .chart {{ background: #fff; border-radius: 12px; overflow: hidden; }}
    .actions {{ margin-top: 16px; }}
    .actions button {{
      background: linear-gradient(135deg, #a855f7, #ec4899); color: white; border: 0;
      border-radius: 999px; padding: 10px 16px; font-weight: 600; cursor: pointer;
    }}
    .footer {{ margin-top: 28px; color: var(--muted); font-size: 12px; text-align: center; }}
    code {{ color: #f9a8d4; }}
    @media print {{
      body {{ background: #fff; color: #111; padding: 0; }}
      .hero, .card {{ border: 1px solid #ddd; background: #fff; backdrop-filter: none; }}
      p, ul, .footer, th {{ color: #333; }}
      .actions {{ display: none; }}
      .chart {{ break-inside: avoid; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="brand">Prysm · Stakeholder Report</div>
      <h1>{query}</h1>
      <p>{narrative}</p>
      <div class="meta">
        <span class="pill">Status: {status}</span>
        <span class="pill">Dataset: {filename}</span>
        <span class="pill">Plan: {plan}</span>
        <span class="pill">Charts: {len(charts)}</span>
        <span class="pill">Generated: {generated_at}</span>
        {demo_badge}
      </div>
      <div class="actions">
        <button onclick="window.print()">Print / Save PDF</button>
      </div>
    </section>

    <section class="card">
      <h2>Key findings</h2>
      <ul>{findings_html}</ul>
    </section>

    {" ".join(chart_blocks)}

    <section class="card">
      <h2>Data preview</h2>
      {sample_rows or "<p>No preview rows available.</p>"}
    </section>

    <div class="footer">
      Generated by Prysm — AI data analysis, refracted into insight. · {generated_at}
    </div>
  </div>
</body>
</html>
"""
