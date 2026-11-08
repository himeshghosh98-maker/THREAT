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
        badgeClasses: "bg-emerald-950/40 text-emerald-400 border-emerald-500/40",
        textClass: "text-emerald-400",
        icon: CheckCircle2,
        description: "No significant indicators found in the available checks."
      };
    case "suspicious":
      return {
        label: "Suspicious",
        badgeClasses: "bg-amber-950/40 text-amber-400 border-amber-500/40",
        textClass: "text-amber-400",
        icon: AlertTriangle,
        description: "Potential security anomalies detected."
      };
    case "high_risk":
      return {
        label: "High Risk",
        badgeClasses: "bg-red-950/40 text-red-400 border-red-500/50",
        textClass: "text-red-400",
        icon: AlertOctagon,
        description: "Multiple severe indicators of malicious intent."
      };
    case "confirmed_malicious":
      return {
        label: "Confirmed Malicious",
        badgeClasses: "bg-[#93000a]/40 text-[#ffb4ab] border-[#93000a] shadow-[0_0_12px_rgba(185,28,28,0.25)]",
        textClass: "text-[#ffb4ab]",
        icon: ShieldAlert,
        description: "Confirmed malicious campaign or credential-stealing payload."
      };
    case "inconclusive":
    default:
      return {
        label: "Inconclusive",
        badgeClasses: "bg-surface-container text-on-surface-variant border-surface-container-high",
        textClass: "text-on-surface-variant",
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
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border shadow-sm",
        meta.badgeClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{meta.label}</span>
      {score !== undefined && (
        <span className="opacity-80 font-mono text-[10px]">({score})</span>
      )}
    </span>
  );
}
