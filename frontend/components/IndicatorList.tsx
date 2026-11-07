import * as React from "react";
import { Indicator, Severity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from "lucide-react";

interface IndicatorListProps {
  indicators: Indicator[];
}

function getSeverityBadge(severity: Severity) {
  switch (severity) {
    case "critical":
      return (
        <Badge className="bg-red-950/80 text-red-300 border-red-800 gap-1 font-mono text-[10px] uppercase">
          <ShieldAlert className="w-3 h-3" /> Critical
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-red-900/40 text-red-400 border-red-700/50 gap-1 font-mono text-[10px] uppercase">
          <AlertCircle className="w-3 h-3" /> High
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-900/40 text-amber-300 border-amber-700/50 gap-1 font-mono text-[10px] uppercase">
          <AlertTriangle className="w-3 h-3" /> Medium
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-blue-900/40 text-blue-300 border-blue-700/50 gap-1 font-mono text-[10px] uppercase">
          <Info className="w-3 h-3" /> Low
        </Badge>
      );
    case "info":
    default:
      return (
        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 gap-1 font-mono text-[10px] uppercase">
          <Info className="w-3 h-3" /> Info
        </Badge>
      );
  }
}

export function IndicatorList({ indicators }: IndicatorListProps) {
  if (!indicators || indicators.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800/80 bg-zinc-950/40 p-4 text-center text-sm text-zinc-400">
        No specific threat indicators recorded for this scan.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {indicators.map((ind) => (
        <div
          key={ind.id}
          className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 text-sm">
                {ind.title}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                {ind.category}
              </span>
            </div>
            {getSeverityBadge(ind.severity)}
          </div>
          <p className="text-sm text-zinc-300 mb-2 leading-relaxed">
            {ind.evidence}
          </p>
          <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
            <span>Source:</span>
            <span className="text-zinc-400">{ind.source}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
