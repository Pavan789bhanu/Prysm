"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

export function Toast({
  message,
  tone = "success",
  onClose,
}: {
  message: string;
  tone?: ToastTone;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl animate-[float-soft_0.4s_ease-out]",
        tone === "success" && "border-emerald-400/30 bg-emerald-950/90 text-emerald-50",
        tone === "error" && "border-rose-400/30 bg-rose-950/90 text-rose-50",
        tone === "info" && "border-white/15 bg-[#120a1c]/95 text-white",
      )}
      role="status"
    >
      {tone === "success" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
      <p className="text-sm leading-5">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 rounded-md p-1 opacity-70 transition hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body,
  );
}
