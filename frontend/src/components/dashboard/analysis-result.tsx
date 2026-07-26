"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  FileCode2,
  GitBranch,
  LineChart,
  Table2,
} from "lucide-react";
import type { Analysis } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

function CodeBlock({ code, title }: { code: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/12">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <p className="font-mono text-sm font-medium text-fuchsia-100">{title}</p>
        <Button variant="ghost" size="sm" onClick={() => void copyCode()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-[480px] overflow-auto bg-black/50 p-4 text-sm leading-6 text-slate-100">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

export function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const agentEntries = useMemo(
    () => Object.entries(analysis.agent_outputs || {}),
    [analysis.agent_outputs],
  );
  const preview = analysis.dataset_preview;
  const previewColumns = preview?.columns ?? [];
  const previewRows = preview?.sample ?? [];
  const charts = analysis.charts ?? [];
  const insights = analysis.insights;
  const execution = analysis.execution;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                analysis.status === "completed"
                  ? "success"
                  : analysis.status === "failed"
                    ? "destructive"
                    : "warning"
              }
            >
              {analysis.status}
            </Badge>
            <Badge variant="muted">{analysis.filename}</Badge>
            <Badge variant="muted">{formatDate(analysis.created_at)}</Badge>
            {execution?.success ? (
              <Badge variant="success">charts rendered</Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl">{analysis.query}</CardTitle>
          <CardDescription>
            AI-generated analysis with executed insights and visualizations
          </CardDescription>
        </CardHeader>
        {analysis.error_message ? (
          <CardContent>
            <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {analysis.error_message}
            </p>
          </CardContent>
        ) : null}
      </Card>

      {charts.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" />
              <CardTitle>Rendered charts</CardTitle>
            </div>
            <CardDescription>
              Live Plotly visualizations produced by executing the analysis pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {charts.map((chart, index) => (
              <div
                key={`${chart.title}-${index}`}
                className="overflow-hidden rounded-xl border border-white/12 bg-white"
              >
                <div className="border-b border-black/5 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800">
                  {chart.title}
                </div>
                <iframe
                  title={chart.title}
                  srcDoc={chart.html}
                  className="h-[420px] w-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {insights ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle>Dataset insights</CardTitle>
            </div>
            <CardDescription>
              {insights.rows ?? "—"} rows · {(insights.columns || []).length} columns
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(insights.columns || []).slice(0, 9).map((column) => (
              <div key={column} className="glass-tile rounded-xl px-4 py-3">
                <p className="font-medium">{column}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {insights.dtypes?.[column] || "unknown"} · nulls{" "}
                  {insights.null_counts?.[column] ?? 0}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {preview ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-primary" />
              <CardTitle>Dataset preview</CardTitle>
            </div>
            <CardDescription>
              {preview.rows} rows · {previewColumns.length} columns · first{" "}
              {previewRows.length} sample rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              {previewColumns.map((column) => (
                <Badge key={column} variant="muted">
                  {column}
                </Badge>
              ))}
            </div>
            {previewRows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-white/12">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-muted-foreground">
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={column} className="px-3 py-2 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr
                        key={index}
                        className="border-t border-white/10 text-foreground/90"
                      >
                        {previewColumns.map((column) => (
                          <td key={column} className="px-3 py-2 font-mono text-xs">
                            {row[column] == null ? "—" : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sample rows were returned for this dataset.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {analysis.plan ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <CardTitle>Execution plan</CardTitle>
            </div>
            <CardDescription>{analysis.plan_desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="glass-tile rounded-xl px-4 py-3 font-mono text-sm text-fuchsia-100">
              {analysis.plan}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {analysis.output ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-primary" />
              <CardTitle>Combined Python code</CardTitle>
            </div>
            <CardDescription>
              Pipeline generated by the agents and executed to produce the charts above
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {execution && !execution.success && execution.stderr ? (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                Execution warning: {execution.stderr.slice(0, 500)}
              </p>
            ) : null}
            <CodeBlock code={analysis.output} title="analysis_pipeline.py" />
          </CardContent>
        </Card>
      ) : null}

      {agentEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Agent outputs</CardTitle>
            <CardDescription>
              Individual contributions from each specialized agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agentEntries.map(([name, output]) => {
              const commentary =
                typeof output.commentary === "string" ? output.commentary : null;
              const code = typeof output.code === "string" ? output.code : null;
              const plan = typeof output.plan === "string" ? output.plan : null;
              const planDesc =
                typeof output.plan_desc === "string" ? output.plan_desc : null;

              return (
                <div key={name} className="glass-tile rounded-xl p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="font-medium">{name}</p>
                    <Badge variant="muted">Agent</Badge>
                  </div>
                  {commentary ? (
                    <p className="mb-3 text-sm text-muted-foreground">{commentary}</p>
                  ) : null}
                  {plan ? (
                    <p className="mb-3 font-mono text-sm text-primary">{plan}</p>
                  ) : null}
                  {planDesc ? (
                    <p className="mb-3 text-sm text-muted-foreground">{planDesc}</p>
                  ) : null}
                  {code ? <CodeBlock code={code} title={`${name}.py`} /> : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
