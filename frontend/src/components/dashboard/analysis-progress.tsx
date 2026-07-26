"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Check, Code2, LineChart, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stages = [
  { label: "Planning agents", icon: BrainCircuit, detail: "Choosing the analysis path" },
  { label: "Generating pipeline", icon: Code2, detail: "Writing executable Python" },
  { label: "Executing analysis", icon: ListChecks, detail: "Running against your CSV" },
  { label: "Rendering charts", icon: LineChart, detail: "Building Plotly visuals" },
];

export function AnalysisProgress({ active = true }: { active?: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timers = [
      window.setTimeout(() => setStep(1), 900),
      window.setTimeout(() => setStep(2), 2000),
      window.setTimeout(() => setStep(3), 3400),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [active]);

  return (
    <Card>
      <CardContent className="space-y-5 p-8">
        <div className="text-center">
          <p className="text-lg font-medium">Building your insight package</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prysm is planning, generating, executing, and visualizing — hang tight.
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400 transition-all duration-700"
            style={{ width: `${((step + 1) / stages.length) * 100}%` }}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {stages.map((stage, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <div
                key={stage.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300",
                  current
                    ? "border-fuchsia-400/40 bg-fuchsia-500/10"
                    : done
                      ? "border-emerald-400/25 bg-emerald-500/5"
                      : "border-white/10 bg-white/5 opacity-70",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    current
                      ? "bg-primary/25 text-primary animate-pulse"
                      : done
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <stage.icon className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{stage.label}</p>
                  <p className="text-xs text-muted-foreground">{stage.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
