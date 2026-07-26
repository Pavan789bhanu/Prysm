"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export function DemoReadinessBanner() {
  const [status, setStatus] = useState<{
    demo_mode: boolean;
    openai_configured: boolean;
    ready_for_stakeholders: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    api
      .demoStatus()
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active) setStatus(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!status) return null;

  const ready = status.ready_for_stakeholders;
  return (
    <div
      className={
        ready
          ? "flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          : "flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      }
    >
      {ready ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <ShieldAlert className="h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {ready ? "Demo environment ready for stakeholders" : "Demo environment needs attention"}
        </p>
        <p className="mt-0.5 text-xs opacity-90">
          {status.demo_mode
            ? "Offline demo mode is active — charts still run without OpenAI."
            : status.openai_configured
              ? "Live OpenAI pipeline configured."
              : "No OpenAI key detected."}{" "}
          One-click demo, present mode, and report export are available.
        </p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
        <Sparkles className="h-3.5 w-3.5" />
        Fundraiser path
      </span>
    </div>
  );
}
