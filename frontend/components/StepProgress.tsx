import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2 } from "lucide-react";

interface StepProgressProps {
  steps: { name: string; status: "pending" | "running" | "completed" | "failed" }[];
  currentStep?: number;
}

export function StepProgress({ steps }: StepProgressProps) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const percent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Analysis Pipeline</span>
        <span className="font-mono font-semibold text-zinc-200">
          {completedCount} / {steps.length} checks complete
        </span>
      </div>
      <Progress value={percent} className="h-1.5" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 p-2 rounded text-xs border ${
              step.status === "completed"
                ? "bg-zinc-950/80 border-emerald-900/40 text-zinc-200"
                : step.status === "running"
                ? "bg-cyan-950/30 border-cyan-800 text-cyan-300"
                : step.status === "failed"
                ? "bg-red-950/30 border-red-800 text-red-300"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-500"
            }`}
          >
            {step.status === "completed" && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            {step.status === "running" && (
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
            )}
            {step.status === "failed" && (
              <span className="text-red-400 font-bold shrink-0">&times;</span>
            )}
            {step.status === "pending" && (
              <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />
            )}
            <span className="truncate">{step.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
