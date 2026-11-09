"use client";

import * as React from "react";
import { ScanReport } from "@/lib/types";
import { RiskBadge, getRiskDetails } from "@/components/RiskBadge";
import { RiskGauge } from "@/components/RiskGauge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  ShieldAlert,
  Info,
  Layers,
  Link2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface SummaryStripProps {
  report: ScanReport;
}

export function SummaryStrip({ report }: SummaryStripProps) {
  const risk = report.risk;
  const isLowRisk = risk.classification === "low_risk";
  const riskMeta = getRiskDetails(risk.classification);

  // Confidence calculations
  const confidencePercent = Math.round(risk.confidence * 100);
  const totalChecks = risk.checks_completed.length + risk.checks_failed.length;
  const passedChecksCount = risk.checks_completed.length;
  const failedChecksCount = risk.checks_failed.length;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Risk Classification */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md hover:border-surface-container-highest transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                Classification
              </span>
              <ShieldAlert className="w-4 h-4 text-primary opacity-80" />
            </div>

            <div className="space-y-2">
              <div>
                <RiskBadge
                  classification={risk.classification}
                  score={risk.score}
                  className="text-xs px-2.5 py-1"
                />
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {isLowRisk
                  ? "No significant indicators found in the available checks."
                  : riskMeta.description}
              </p>
            </div>

            <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>Severity Level:</span>
              <span className="font-semibold text-on-surface uppercase">
                {risk.classification.replace("_", " ")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Risk Score & Gauge with Tooltip */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md hover:border-surface-container-highest transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                Threat Risk Score
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-on-surface-variant hover:text-primary transition-colors cursor-help"
                    aria-label="Score severity explanation"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs space-y-1.5 p-3">
                  <div className="font-semibold text-white">Risk Score (0–100)</div>
                  <p className="text-zinc-300">
                    Higher score indicates greater threat probability and severity.
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 border-t border-zinc-700">
                    <span className="text-emerald-400">0–19: Low Risk</span>
                    <span className="text-amber-400">20–59: Suspicious</span>
                    <span className="text-red-400">60–84: High Risk</span>
                    <span className="text-rose-500 font-bold">85–100: Confirmed</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Visual Risk Gauge */}
            <div className="flex items-center justify-center py-1">
              <RiskGauge risk={risk} />
            </div>

            <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>Scale:</span>
              <span className="text-on-surface">0 (benign) &rarr; 100 (critical)</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Evidence Coverage Meter */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md hover:border-surface-container-highest transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                Evidence Coverage
              </span>
              <Layers className="w-4 h-4 text-secondary opacity-80" />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-on-surface">
                  {confidencePercent}%
                </span>
                <span className="text-xs font-mono text-on-surface-variant">
                  Confidence
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full transition-all duration-500"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{passedChecksCount} passed</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{failedChecksCount} failed</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>Telemetry:</span>
              <span className="text-on-surface">
                {passedChecksCount}/{totalChecks} checks
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: On-Chain Status */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md hover:border-surface-container-highest transition-colors">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                On-Chain Status
              </span>
              <Link2 className="w-4 h-4 text-primary opacity-80" />
            </div>

            <div className="space-y-2">
              <div>
                {report.onchain.status === "published" && (
                  <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-mono text-xs uppercase px-2.5 py-0.5">
                    ANCHORED ON-CHAIN
                  </Badge>
                )}
                {report.onchain.status === "validated" && (
                  <Badge className="bg-emerald-900/80 text-emerald-200 border-emerald-600 font-mono text-xs uppercase px-2.5 py-0.5">
                    VALIDATED
                  </Badge>
                )}
                {report.onchain.status === "disputed" && (
                  <Badge className="bg-amber-950/80 text-amber-300 border-amber-700/60 font-mono text-xs uppercase px-2.5 py-0.5">
                    DISPUTED
                  </Badge>
                )}
                {report.onchain.status === "not_published" && (
                  <Badge className="bg-surface-container-high text-on-surface-variant border-outline-variant/30 font-mono text-xs uppercase px-2.5 py-0.5">
                    NOT PUBLISHED
                  </Badge>
                )}
                {report.onchain.status === "revised" && (
                  <Badge className="bg-blue-950 text-blue-300 border-blue-700 font-mono text-xs uppercase px-2.5 py-0.5">
                    REVISED
                  </Badge>
                )}
              </div>

              <div className="text-xs text-on-surface-variant space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span>Network:</span>
                  <span className="text-on-surface font-semibold">
                    {report.onchain.network || "Not published"}
                  </span>
                </div>
                {report.onchain.chain_report_id !== null ? (
                  <div className="flex items-center justify-between font-mono">
                    <span>Token ID:</span>
                    <span className="text-primary font-bold">
                      #{report.onchain.chain_report_id}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-on-surface-variant/80">
                    Local report hash ready for decentralized ledger registration.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>Ledger:</span>
              <span className="text-on-surface">On-chain registry</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
