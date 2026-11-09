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
      <div className="flex items-center justify-between text-xs text-[#526085] mb-2.5">
        <span className="flex items-center gap-1.5 font-medium">
          {isCompleted ? (
            <span className="text-[#10B981] flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              Analysis complete — redirecting to report...
            </span>
          ) : isError ? (
            <span className="text-[#EF4444] flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />
              Pipeline interrupted
            </span>
          ) : (
            <span className="text-[#4F6BFF] flex items-center gap-1.5 font-semibold">
              <Loader2 className="w-3.5 h-3.5 text-[#4F6BFF] animate-spin" />
              Stage {Math.min(currentStageIndex + 1, activeSteps.length)} of {activeSteps.length}:{" "}
              <strong className="text-[#0B1B6B] font-bold">{currentStageName}</strong>
            </span>
          )}
        </span>
        <span className="font-mono text-[11px] text-[#7C8CFF] font-bold">
          {isCompleted ? activeSteps.length : currentStageIndex + 1} / {activeSteps.length}
        </span>
      </div>

      {/* 5-Step Strip with glowing pill indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 items-center">
        {activeSteps.map((step, idx) => {
          const isDone = step.status === "completed";
          const isRunning = step.status === "running";
          const isFailed = step.status === "failed";

          let dotClass = "bg-[#D4E0F7]";
          let textClass = "text-[#526085]";
          let barClass = "bg-[#E4ECFD]";

          if (isDone) {
            dotClass = "bg-[#4F6BFF]";
            textClass = "text-[#4F6BFF] font-semibold";
            barClass = "bg-gradient-to-r from-[#4F6BFF] to-[#7C8CFF]";
          } else if (isRunning) {
            dotClass = "bg-[#4F6BFF] ring-4 ring-[#4F6BFF]/25 animate-pulse";
            textClass = "text-[#4F6BFF] font-bold";
            barClass = "bg-[#7C8CFF]/50 animate-pulse";
          } else if (isFailed) {
            dotClass = "bg-[#EF4444]";
            textClass = "text-[#EF4444] font-semibold";
            barClass = "bg-[#FEE2E2]";
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
              <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${barClass}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
