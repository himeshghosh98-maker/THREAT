import * as React from "react";
import { RiskClassification } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

interface RiskBadgeProps {
  classification: RiskClassification;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

export function getRiskDetails(classification: RiskClassification) {
  switch (classification) {
    case "low_risk":
      return {
        label: "Low Risk",
        badgeClasses: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
        textClass: "text-emerald-400",
        icon: CheckCircle2,
        description: "No significant indicators found in the available checks."
      };
    case "suspicious":
      return {
        label: "Suspicious",
        badgeClasses: "bg-amber-950/80 text-amber-300 border-amber-700/60",
        textClass: "text-amber-400",
        icon: AlertTriangle,
        description: "Potential security anomalies detected."
      };
    case "high_risk":
      return {
        label: "High Risk",
        badgeClasses: "bg-red-950/80 text-red-300 border-red-700/60",
        textClass: "text-red-400",
        icon: AlertOctagon,
        description: "Multiple severe indicators of malicious intent."
      };
    case "confirmed_malicious":
      return {
        label: "Confirmed Malicious",
        badgeClasses: "bg-[#450a0a] text-red-200 border-red-800",
        textClass: "text-red-300",
        icon: ShieldAlert,
        description: "Confirmed malicious campaign or credential-stealing payload."
      };
    case "inconclusive":
    default:
      return {
        label: "Inconclusive",
        badgeClasses: "bg-zinc-800 text-zinc-300 border-zinc-700",
        textClass: "text-zinc-400",
        icon: HelpCircle,
        description: "Unable to complete checks to reach a decisive verdict."
      };
  }
}

export function RiskBadge({
  classification,
  score,
  showIcon = true,
  className
}: RiskBadgeProps) {
  const meta = getRiskDetails(classification);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm",
        meta.badgeClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{meta.label}</span>
      {score !== undefined && (
        <span className="opacity-80 font-mono text-[11px]">({score}/100)</span>
      )}
    </span>
  );
}
