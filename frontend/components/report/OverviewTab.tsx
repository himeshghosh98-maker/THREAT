"use client";

import * as React from "react";
import { AiExplanation, Indicator, Severity } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Crosshair,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Info,
  HelpCircle,
  Cpu
} from "lucide-react";

interface OverviewTabProps {
  explanation: AiExplanation | null;
  indicators: Indicator[];
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

function getSeverityBadge(severity: Severity) {
  switch (severity) {
    case "critical":
      return (
        <Badge className="bg-error-container/80 text-error border-error-container gap-1 font-mono text-[10px] uppercase">
          <ShieldAlert className="w-3 h-3" /> Critical
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-red-950/80 text-red-400 border-red-700/60 gap-1 font-mono text-[10px] uppercase">
          <AlertCircle className="w-3 h-3" /> High
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-950/80 text-amber-300 border-amber-700/60 gap-1 font-mono text-[10px] uppercase">
          <AlertTriangle className="w-3 h-3" /> Medium
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/60 gap-1 font-mono text-[10px] uppercase">
          <CheckCircle2 className="w-3 h-3" /> Low
        </Badge>
      );
    case "info":
    default:
      return (
        <Badge className="bg-surface-container-high text-on-surface-variant border-outline-variant/30 gap-1 font-mono text-[10px] uppercase">
          <Info className="w-3 h-3" /> Info
        </Badge>
      );
  }
}

export function OverviewTab({ explanation, indicators }: OverviewTabProps) {
  // Top 3 indicators sorted by severity (highest first)
  const sortedIndicators = React.useMemo(() => {
    return [...indicators].sort(
      (a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0)
    );
  }, [indicators]);

  const top3Indicators = sortedIndicators.slice(0, 3);

  // Model name logic: if fallback or empty, show 'deterministic-fallback'
  const modelName =
    explanation?.model && explanation.model.trim().length > 0
      ? explanation.model
      : "deterministic-fallback";

  return (
    <div className="space-y-6">
      {/* AI Explanation Card */}
      <Card className="border-primary/30 bg-surface-container-low shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary/40" />
        <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI explanation (based on the evidence below)</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-surface-container-high text-primary border-primary/30 font-mono text-[11px] gap-1">
              <Cpu className="w-3 h-3" />
              <span>{modelName}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {explanation ? (
            <>
              {/* Executive Summary */}
              <div className="p-4 rounded-lg bg-surface-container border border-surface-container-high space-y-1.5">
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                  Executive Threat Synthesis:
                </span>
                <p className="text-sm text-on-surface leading-relaxed">
                  {explanation.summary}
                </p>
              </div>

              {/* Tactics */}
              {explanation.tactics && explanation.tactics.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface uppercase tracking-wider font-mono">
                    <Crosshair className="w-3.5 h-3.5 text-red-400" />
                    <span>Identified Adversary Tactics:</span>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {explanation.tactics.map((tactic, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-on-surface bg-surface-container px-3 py-2.5 rounded-lg border border-surface-container-high flex items-start gap-2.5"
                      >
                        <span className="text-red-400 font-mono font-bold leading-none mt-0.5">•</span>
                        <span className="leading-relaxed">{tactic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Actions */}
              {explanation.recommended_actions && explanation.recommended_actions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface uppercase tracking-wider font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span>Recommended Mitigations & Response:</span>
                  </div>
                  <ul className="space-y-2">
                    {explanation.recommended_actions.map((action, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-on-surface bg-primary/5 px-3 py-2.5 rounded-lg border border-primary/20 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 rounded-lg bg-surface-container border border-surface-container-high text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-on-surface-variant mx-auto opacity-50" />
              <h5 className="text-sm font-medium text-on-surface">
                AI Threat Explanation Unavailable
              </h5>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                Automated synthesis could not be generated for this telemetry report. Review individual deterministic indicators and heuristics below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 3 Indicators Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-on-surface flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-primary" />
            <span>Top Threat Indicators ({top3Indicators.length} of {indicators.length})</span>
          </h3>
          <span className="text-xs text-on-surface-variant font-mono">
            Sorted by severity
          </span>
        </div>

        {top3Indicators.length === 0 ? (
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-6 text-center text-xs text-on-surface-variant">
            No specific indicators discovered for this scan.
          </div>
        ) : (
          <div className="space-y-3">
            {top3Indicators.map((ind, idx) => (
              <div
                key={ind.id || idx}
                className="rounded-xl border border-surface-container-high bg-surface-container-low p-4 hover:border-surface-container-highest transition-colors space-y-2.5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-on-surface">
                      {ind.title}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant/30">
                      {ind.category}
                    </span>
                  </div>
                  {getSeverityBadge(ind.severity)}
                </div>

                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high font-mono text-xs text-on-surface break-words leading-relaxed select-all">
                  {ind.evidence}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant pt-1 border-t border-surface-container-high/40">
                  <span>Detection Source:</span>
                  <span className="text-primary font-medium">{ind.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
