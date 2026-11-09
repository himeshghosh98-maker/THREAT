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
        badgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-[0_2px_8px_rgba(16,185,129,0.12)]",
        textClass: "text-emerald-700",
        icon: CheckCircle2,
        description: "No significant indicators found in the available checks."
      };
    case "suspicious":
      return {
        label: "Suspicious",
        badgeClasses: "bg-amber-50 text-amber-800 border-amber-200/80 shadow-[0_2px_8px_rgba(245,158,11,0.12)]",
        textClass: "text-amber-800",
        icon: AlertTriangle,
        description: "Potential security anomalies detected."
      };
    case "high_risk":
      return {
        label: "High Risk",
        badgeClasses: "bg-rose-50 text-rose-700 border-rose-200/80 shadow-[0_2px_8px_rgba(239,68,68,0.14)]",
        textClass: "text-rose-700",
        icon: AlertOctagon,
        description: "Multiple severe indicators of malicious intent."
      };
    case "confirmed_malicious":
      return {
        label: "Confirmed Malicious",
        badgeClasses: "bg-red-100 text-red-800 border-red-300 shadow-[0_2px_10px_rgba(220,38,38,0.22)] font-bold",
        textClass: "text-red-800",
        icon: ShieldAlert,
        description: "Confirmed malicious campaign or credential-stealing payload."
      };
    case "inconclusive":
    default:
      return {
        label: "Inconclusive",
        badgeClasses: "bg-[#F0F4FF] text-[#526085] border-[#D4E0F7] shadow-sm",
        textClass: "text-[#526085]",
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
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all",
        meta.badgeClasses,
        className
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{meta.label}</span>
      {score !== undefined && (
        <span className="opacity-80 font-mono text-[11px] font-bold">({score})</span>
      )}
    </span>
  );
}
