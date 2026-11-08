"use client";

import * as React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface FailedChecksBannerProps {
  checksFailed: string[];
}

export function FailedChecksBanner({ checksFailed }: FailedChecksBannerProps) {
  if (!checksFailed || checksFailed.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-500/50 bg-amber-950/25 p-4 text-amber-200 shadow-md flex flex-col sm:flex-row items-start gap-3.5 animate-in fade-in-50"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
        <AlertTriangle className="w-4 h-4" />
      </div>

      <div className="space-y-2 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-1.5">
            <span>Incomplete Telemetry Checks</span>
            <span className="text-xs px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
              {checksFailed.length} failed
            </span>
          </h4>
        </div>

        {/* Exact specified text */}
        <p className="text-xs text-amber-300/90 leading-relaxed">
          These checks could not be completed. This reduces confidence.
        </p>

        {/* Failed check tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {checksFailed.map((check, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-amber-900/40 text-amber-200 border border-amber-700/50"
            >
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>{check}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
