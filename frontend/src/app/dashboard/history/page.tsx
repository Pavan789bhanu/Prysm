"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { ApiError, api, type Analysis } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { AnalysisResult } from "@/components/dashboard/analysis-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function HistoryPage() {
  const { token, refreshProfile } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .listAnalyses()
      .then((data) => {
        setAnalyses(data.analyses);
        if (data.analyses[0]) {
          setSelectedId(data.analyses[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load history.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDelete(id: number) {
    if (!token) return;
    if (!window.confirm("Delete this analysis permanently?")) {
      return;
    }
    try {
      await api.deleteAnalysis(id);
      const remaining = analyses.filter((item) => item.id !== id);
      setAnalyses(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    }
  }

  const selectedAnalysis = analyses.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis history</h1>
        <p className="mt-2 text-muted-foreground">
          Review past queries, live charts, agent plans, and generated code.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Past analyses</CardTitle>
            <CardDescription>Click an item to view full details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : analyses.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-muted-foreground">
                <p>No analyses yet. Run the one-click demo to populate a board-ready result.</p>
                <Link href="/dashboard/analyze" className="inline-flex text-primary underline">
                  Go to Analyze → One-click demo
                </Link>
              </div>
            ) : (
              analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className={`rounded-xl px-4 py-3 ${
                    selectedId === analysis.id ? "glass-selected" : "glass-tile"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(analysis.id)}
                    className="w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{analysis.query}</p>
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
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {analysis.filename}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(analysis.created_at)}
                    </p>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(analysis.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {selectedAnalysis ? (
          <AnalysisResult analysis={selectedAnalysis} />
        ) : (
          <Card>
            <CardContent className="flex min-h-[320px] items-center justify-center p-10 text-sm text-muted-foreground">
              Select an analysis to view details.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
