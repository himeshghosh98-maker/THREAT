"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export const DEFAULT_SCAN_STAGES = [
  "Submit",
  "Investigate",
  "Analyse",
  "Assess Risk",
  "Report"
] as const;

export interface StepProgressProps {
  currentStageIndex?: number;
  stages?: readonly string[];
  isCompleted?: boolean;
  isError?: boolean;
  steps?: { name: string; status: "pending" | "running" | "completed" | "failed" }[];
}

export function StepProgress({
  currentStageIndex = 0,
  stages = DEFAULT_SCAN_STAGES,
  isCompleted = false,
  isError = false,
  steps
}: StepProgressProps) {
  // If legacy `steps` array is provided, map it
  const activeSteps = React.useMemo(() => {
    if (steps && steps.length > 0) {
      return steps;
    }
    return stages.map((name, idx) => {
      if (isError && idx === currentStageIndex) {
        return { name, status: "failed" as const };
      }
      if (isCompleted || idx < currentStageIndex) {
        return { name, status: "completed" as const };
      }
      if (idx === currentStageIndex) {
        return { name, status: "running" as const };
      }
      return { name, status: "pending" as const };
    });
  }, [steps, stages, currentStageIndex, isCompleted, isError]);

  const completedCount = isCompleted
    ? activeSteps.length
    : activeSteps.filter((s) => s.status === "completed").length;
  const percent = activeSteps.length > 0 ? (completedCount / activeSteps.length) * 100 : 0;

  const currentStageName =
    activeSteps[currentStageIndex]?.name || (isCompleted ? "Completed" : "In progress");

  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4 rounded-lg border border-cyan-900/50 bg-zinc-900/80 p-5 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between text-xs text-zinc-300">
        <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Analysis complete — generating report...
            </>
          ) : isError ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              Scan pipeline interrupted
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              Stage {Math.min(currentStageIndex + 1, activeSteps.length)} of {activeSteps.length}:{" "}
              <strong className="text-zinc-100">{currentStageName}</strong>
            </>
          )}
        </span>
        <span className="font-mono text-zinc-400 text-[11px]">
          {completedCount} / {activeSteps.length} stages
        </span>
      </div>

      <Progress value={isCompleted ? 100 : Math.max(10, percent)} className="h-2 bg-zinc-800" />

      {/* Responsive Stages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {activeSteps.map((step, idx) => {
          const isDone = step.status === "completed";
          const isRunning = step.status === "running";
          const isFailed = step.status === "failed";

          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-md text-xs border transition-all ${
                isDone
                  ? "bg-zinc-950/80 border-emerald-900/50 text-emerald-300"
                  : isRunning
                  ? "bg-cyan-950/40 border-cyan-600 text-cyan-200 ring-1 ring-cyan-500/50"
                  : isFailed
                  ? "bg-red-950/40 border-red-800 text-red-300"
                  : "bg-zinc-950/30 border-zinc-800/80 text-zinc-500"
              }`}
            >
              {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              {isRunning && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />}
              {isFailed && <span className="text-red-400 font-bold shrink-0">&times;</span>}
              {!isDone && !isRunning && !isFailed && (
                <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0 flex items-center justify-center text-[9px] font-mono">
                  {idx + 1}
                </span>
              )}
              <span className="truncate font-medium">{step.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
