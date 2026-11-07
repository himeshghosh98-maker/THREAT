"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { RiskDetails } from "@/lib/types";

interface RiskGaugeProps {
  risk: RiskDetails;
}

const emptySubscribe = () => () => {};

export function RiskGauge({ risk }: RiskGaugeProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const score = Math.max(0, Math.min(100, risk.score));
  const remaining = 100 - score;

  const getColor = (classification: string) => {
    switch (classification) {
      case "low_risk":
        return "#10b981"; // emerald-500
      case "suspicious":
        return "#f59e0b"; // amber-500
      case "high_risk":
        return "#ef4444"; // red-500
      case "confirmed_malicious":
        return "#991b1b"; // dark red
      case "inconclusive":
      default:
        return "#71717a"; // zinc-500
    }
  };

  const activeColor = getColor(risk.classification);
  const data = [
    { name: "Score", value: score, color: activeColor },
    { name: "Remaining", value: remaining, color: "#27272a" }
  ];

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center h-48 w-full animate-pulse bg-zinc-900/50 rounded-lg">
        <div className="text-sm text-zinc-500">Loading gauge...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 relative">
      <div className="w-56 h-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="95%"
              startAngle={180}
              endAngle={0}
              innerRadius={62}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              <Cell key="score-cell" fill={activeColor} />
              <Cell key="remaining-cell" fill="#27272a" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-3xl font-bold font-mono tracking-tight text-zinc-100">
            {score}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Score / 100
          </span>
        </div>
      </div>
      <div className="mt-2 text-xs text-zinc-400 flex items-center gap-3">
        <span>Confidence: <strong className="text-zinc-200 font-mono">{(risk.confidence * 100).toFixed(0)}%</strong></span>
        <span>•</span>
        <span>Checks: <strong className="text-zinc-200 font-mono">{risk.checks_completed.length}</strong></span>
      </div>
    </div>
  );
}
