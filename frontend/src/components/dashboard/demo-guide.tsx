"use client";

import Link from "next/link";
import { CheckCircle2, Play, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Load sample data",
    description: "Use the built-in sales CSV — no prep required for demos.",
    href: "/dashboard/upload",
    cta: "Upload / sample",
    icon: Upload,
  },
  {
    title: "Run one-click demo",
    description: "Agents plan, generate code, execute, and render live charts.",
    href: "/dashboard/analyze",
    cta: "Analyze now",
    icon: Play,
  },
  {
    title: "Share the report",
    description: "Export a stakeholder HTML report with findings and charts.",
    href: "/dashboard/history",
    cta: "Open history",
    icon: Sparkles,
  },
];

export function DemoGuide({
  hasDatasets,
  hasAnalyses,
}: {
  hasDatasets: boolean;
  hasAnalyses: boolean;
}) {
  const completed = [hasDatasets, hasAnalyses, hasAnalyses];

  return (
    <Card className="border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-rose-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-accent" />
          Stakeholder demo guide
        </CardTitle>
        <CardDescription>
          Three steps to an impressive live walkthrough for fundraisers.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="glass-tile rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary">
                <step.icon className="h-4 w-4" />
              </div>
              {completed[index] ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <span className="text-xs text-muted-foreground">Step {index + 1}</span>
              )}
            </div>
            <p className="font-medium">{step.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            <Link href={step.href} className="mt-4 inline-flex">
              <Button size="sm" variant={completed[index] ? "outline" : "default"}>
                {step.cta}
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
