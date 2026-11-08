"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckSquare, Info } from "lucide-react";

interface DisclaimerSectionProps {
  precautions?: string[];
  limitations?: string[];
}

export function DisclaimerSection({
  precautions,
  limitations
}: DisclaimerSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-surface-container-high/60">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommended Precautions Card */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-emerald-400">
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span>Recommended Defensive Precautions:</span>
            </div>

            {precautions && precautions.length > 0 ? (
              <ul className="space-y-2 text-xs text-on-surface">
                {precautions.map((pre, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-container border border-surface-container-high flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="text-emerald-400 font-bold leading-none mt-0.5">&check;</span>
                    <span>{pre}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-on-surface-variant italic">
                Standard operational hygiene applies. Always verify domains via out-of-band channels.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Scan Limitations Card */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Inspection Scope & Known Limitations:</span>
            </div>

            {limitations && limitations.length > 0 ? (
              <ul className="space-y-2 text-xs text-on-surface">
                {limitations.map((lim, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-container border border-surface-container-high flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="text-amber-400 font-bold leading-none mt-0.5">•</span>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-on-surface-variant italic">
                Point-in-time heuristic scan. Adversaries frequently rotate infrastructure and obfuscate payloads.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mandatory SOC Notice */}
      <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-4 text-xs text-on-surface-variant flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <p className="leading-relaxed">
            Automated classifications reflect observable technical signals at scan execution. <strong>Low Risk</strong> confirms <em>no significant indicators found in available checks</em> and is not a warranty of safety.
          </p>
        </div>
        <div className="text-[11px] font-mono text-on-surface-variant/80 shrink-0 hidden sm:block">
          AUDIT ID: SOC-2026-v1
        </div>
      </div>
    </div>
  );
}
