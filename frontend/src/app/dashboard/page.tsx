"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileCode2,
  Sparkles,
} from "lucide-react";
import { api, type Analysis, type Dataset } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { DemoGuide } from "@/components/dashboard/demo-guide";
import { DemoReadinessBanner } from "@/components/dashboard/demo-readiness-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function DashboardOverviewPage() {
  const { token, user, stats, refreshProfile } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.listDatasets(token), api.listAnalyses(token)])
      .then(([datasetData, analysisData]) => {
        setDatasets(datasetData.datasets);
        setAnalyses(analysisData.analyses);
      })
      .finally(() => setLoading(false));
    refreshProfile();
  }, [token, refreshProfile]);

  const recentAnalyses = analyses.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.username}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your AI analyst workspace for datasets, live charts, and generated code.
        </p>
      </div>

      <DemoReadinessBanner />

      <DemoGuide
        hasDatasets={datasets.length > 0}
        hasAnalyses={analyses.length > 0}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Datasets",
            value: stats?.datasets ?? 0,
            icon: Database,
            color: "text-primary",
          },
          {
            label: "Total analyses",
            value: stats?.analyses ?? 0,
            icon: Sparkles,
            color: "text-accent",
          },
          {
            label: "Completed",
            value: stats?.completed_analyses ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "Recent activity",
            value: recentAnalyses.length,
            icon: Clock3,
            color: "text-secondary",
          },
        ].map((item) => (
          <Card key={item.label} className="gradient-edge glass-hover overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{item.label}</CardDescription>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/6">
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{loading ? "—" : item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Start your next analysis workflow</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/dashboard/upload">
              <Button variant="outline" className="h-auto w-full justify-between py-4">
                <span className="text-left">
                  <span className="block font-medium">Upload a dataset</span>
                  <span className="block text-sm text-muted-foreground">
                    Add a CSV file to your workspace
                  </span>
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/analyze">
              <Button className="h-auto w-full justify-between py-4">
                <span className="text-left">
                  <span className="block font-medium">Run an analysis</span>
                  <span className="block text-sm text-primary-foreground/80">
                    Ask a question about your data
                  </span>
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent datasets</CardTitle>
            <CardDescription>Your latest uploaded files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No datasets yet. Upload your first CSV to get started.
              </p>
            ) : (
              datasets.slice(0, 4).map((dataset) => (
                <div
                  key={dataset.id}
                  className="glass-tile flex items-center justify-between rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{dataset.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {dataset.row_count} rows · {dataset.column_count} columns
                    </p>
                  </div>
                  <Badge variant="muted">{formatDate(dataset.created_at)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent analyses</CardTitle>
            <CardDescription>Latest AI-generated analysis pipelines</CardDescription>
          </div>
          <Link href="/dashboard/history">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : recentAnalyses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No analyses yet. Upload a dataset and run your first query.
            </p>
          ) : (
            recentAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                href="/dashboard/history"
                className="glass-tile flex flex-col gap-3 rounded-xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-primary" />
                    <p className="truncate font-medium">{analysis.query}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.filename} · {formatDate(analysis.created_at)}
                  </p>
                </div>
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
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
