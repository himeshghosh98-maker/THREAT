"use client";

import * as React from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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

  const currentStageName =
    activeSteps[currentStageIndex]?.name || (isCompleted ? "Completed" : "In progress");

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full pt-4 pb-2"
    >
      {/* Status announcement line */}
      <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2.5">
        <span className="flex items-center gap-1.5 font-medium">
          {isCompleted ? (
            <span className="text-primary flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              Analysis complete — redirecting to report...
            </span>
          ) : isError ? (
            <span className="text-error flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-error" />
              Pipeline interrupted
            </span>
          ) : (
            <span className="text-primary flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              Stage {Math.min(currentStageIndex + 1, activeSteps.length)} of {activeSteps.length}:{" "}
              <strong className="text-on-surface font-semibold">{currentStageName}</strong>
            </span>
          )}
        </span>
        <span className="font-mono text-[11px] text-on-surface-variant">
          {isCompleted ? activeSteps.length : currentStageIndex + 1} / {activeSteps.length}
        </span>
      </div>

      {/* 5-Step Strip from Stitch Design */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 items-center">
        {activeSteps.map((step, idx) => {
          const isDone = step.status === "completed";
          const isRunning = step.status === "running";
          const isFailed = step.status === "failed";

          let dotClass = "bg-surface-variant";
          let textClass = "text-on-surface-variant";
          let barClass = "bg-surface-container-high";

          if (isDone) {
            dotClass = "bg-primary";
            textClass = "text-primary font-semibold";
            barClass = "bg-primary";
          } else if (isRunning) {
            dotClass = "bg-primary ring-4 ring-primary/20 animate-pulse";
            textClass = "text-primary font-semibold";
            barClass = "bg-primary-container";
          } else if (isFailed) {
            dotClass = "bg-error";
            textClass = "text-error font-semibold";
            barClass = "bg-error-container";
          }

          return (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${dotClass}`} />
                <span
                  className={`text-[11px] font-mono tracking-wider uppercase truncate ${textClass}`}
                >
                  {idx + 1}. {step.name}
                </span>
              </div>
              <div className={`h-1 w-full rounded-full transition-all duration-300 ${barClass}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
