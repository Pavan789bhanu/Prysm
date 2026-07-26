"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { ApiError, api, type Analysis, type Dataset } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { AnalysisResult } from "@/components/dashboard/analysis-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const exampleQueries = [
  "Perform exploratory data analysis with summary statistics and correlations",
  "Build a regression model and show key statistical metrics",
  "Create visualizations to understand trends and distributions",
];

export default function AnalyzePage() {
  const { token, refreshProfile } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .listDatasets(token)
      .then((data) => {
        setDatasets(data.datasets);
        if (data.datasets[0]) {
          setSelectedDatasetId(data.datasets[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load datasets.");
      });
    api
      .me(token)
      .then((data) => setDemoMode(Boolean(data.demo_mode)))
      .catch(() => undefined);
  }, [token]);

  async function pollAnalysis(analysisId: number) {
    if (!token) return;
    const maxAttempts = 90;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const { analysis } = await api.getAnalysis(token, analysisId);
      if (analysis.status === "completed" || analysis.status === "failed") {
        setResult(analysis);
        if (analysis.status === "failed") {
          setError(analysis.error_message || "Analysis failed.");
        }
        await refreshProfile();
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    setError("Analysis is taking longer than expected. Check History in a moment.");
  }

  async function handleAnalyze() {
    if (!token || !selectedDatasetId || !query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await api.createAnalysis(token, {
        dataset_id: selectedDatasetId,
        query: query.trim(),
        async: true,
      });
      setResult(response.analysis);
      if (response.analysis.status === "processing") {
        await pollAnalysis(response.analysis.id);
      } else {
        await refreshProfile();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.analysis) setResult(err.analysis);
      } else {
        setError("Analysis failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSampleAndAnalyze() {
    if (!token) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const sample = await api.loadSampleDataset(token);
      setDatasets((prev) => [sample.dataset, ...prev]);
      setSelectedDatasetId(sample.dataset.id);
      setQuery(sample.suggested_query);
      const response = await api.createAnalysis(token, {
        dataset_id: sample.dataset.id,
        query: sample.suggested_query,
        async: true,
      });
      setResult(response.analysis);
      if (response.analysis.status === "processing") {
        await pollAnalysis(response.analysis.id);
      } else {
        await refreshProfile();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.analysis) setResult(err.analysis);
      } else {
        setError("Demo analysis failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedDataset = datasets.find((item) => item.id === selectedDatasetId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Run analysis</h1>
          <p className="mt-2 text-muted-foreground">
            Ask a question in plain English. Prysm plans, generates, and executes the
            analysis so you can see charts — not just code.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void handleLoadSampleAndAnalyze()}
        >
          <Sparkles className="h-4 w-4" />
          One-click demo
        </Button>
      </div>

      {demoMode ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Demo mode is on (no OpenAI key detected). Analyses use a deterministic offline
          pipeline that still executes and renders real Plotly charts.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Analysis setup</CardTitle>
            <CardDescription>
              Choose a dataset and describe what you want to learn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Select dataset</Label>
              {datasets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No datasets yet.{" "}
                  <Link href="/dashboard/upload" className="text-primary underline">
                    Upload a CSV
                  </Link>{" "}
                  or run the one-click demo.
                </p>
              ) : (
                <div className="space-y-2">
                  {datasets.map((dataset) => (
                    <button
                      key={dataset.id}
                      type="button"
                      onClick={() => setSelectedDatasetId(dataset.id)}
                      className={`w-full rounded-xl px-4 py-3 text-left ${
                        selectedDatasetId === dataset.id
                          ? "glass-selected"
                          : "glass-tile"
                      }`}
                    >
                      <p className="font-medium">{dataset.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {dataset.row_count} rows · {dataset.column_count} columns
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="query">Your question</Label>
              <Textarea
                id="query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. Show correlations and create visualizations for key numeric columns"
              />
            </div>

            <div className="space-y-2">
              <Label>Example prompts</Label>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {selectedDataset ? (
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="mb-2 text-sm font-medium">Dataset preview</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDataset.columns.map((column) => (
                    <Badge key={column} variant="muted">
                      {column}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <Button
              className="w-full"
              disabled={loading || !selectedDatasetId || !query.trim()}
              onClick={() => void handleAnalyze()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running agents + charts...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BrainCircuit className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <p className="text-lg font-medium">AI agents are working</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Planning, generating code, and rendering visualizations...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : result ? (
            <AnalysisResult analysis={result} />
          ) : (
            <Card>
              <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center">
                <Sparkles className="h-10 w-10 text-primary" />
                <p className="text-lg font-medium">Your analysis will appear here</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Select a dataset, describe your goal, and Prysm will generate and execute
                  a Python analysis pipeline with live charts.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
