import * as React from "react";
import { AiExplanation as AiExplanationType } from "@/lib/types";
import { CheckCircle, Crosshair, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AiExplanationProps {
  explanation: AiExplanationType | null;
}

export function AiExplanation({ explanation }: AiExplanationProps) {
  if (!explanation) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
        AI explanation synthesis was not generated for this scan.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-cyan-900/40 bg-zinc-900/60 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Sparkles className="w-4 h-4" />
          <h4 className="font-semibold text-sm tracking-wide text-zinc-100">
            AI Threat Explanation & Synthesis
          </h4>
        </div>
        <Badge className="bg-cyan-950/60 text-cyan-300 border-cyan-800 font-mono text-[11px]">
          Model: {explanation.model}
        </Badge>
      </div>

      {/* Summary */}
      <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/50 p-3 rounded border border-zinc-800/80">
        {explanation.summary}
      </p>

      {/* Tactics */}
      {explanation.tactics && explanation.tactics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            <Crosshair className="w-3.5 h-3.5 text-red-400" /> Detected Adversary Tactics:
          </div>
          <ul className="space-y-1.5">
            {explanation.tactics.map((tactic, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-300 bg-zinc-950/40 px-3 py-2 rounded border border-zinc-800/60 flex items-start gap-2"
              >
                <span className="text-red-400 font-mono font-bold">•</span>
                <span>{tactic}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {explanation.recommended_actions && explanation.recommended_actions.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Recommended Mitigations:
          </div>
          <ul className="space-y-1.5">
            {explanation.recommended_actions.map((act, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-300 bg-emerald-950/20 px-3 py-2 rounded border border-emerald-900/40 flex items-start gap-2"
              >
                <span className="text-emerald-400 font-bold">&check;</span>
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
