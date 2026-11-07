import * as React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface DisclaimerProps {
  limitations?: string[];
  precautions?: string[];
  className?: string;
}

export function Disclaimer({ limitations, precautions, className = "" }: DisclaimerProps) {
  return (
    <div className={`space-y-4 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 ${className}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-zinc-300">
            Automated Intelligence Notice & Limitations
          </p>
          <p className="leading-relaxed">
            Scan classifications evaluate observable structural signals, cryptographic material, and current threat intelligence telemetry at the time of execution. A classification of <strong>Low Risk</strong> indicates <em>no significant indicators found in the available checks</em> and is never a guarantee of absolute safety. Scanned URLs must never be visited without caution.
          </p>
        </div>
      </div>

      {limitations && limitations.length > 0 && (
        <div className="pl-6 space-y-1">
          <span className="font-medium text-zinc-400 uppercase tracking-wider text-[10px]">
            Scan Limitations:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
            {limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {precautions && precautions.length > 0 && (
        <div className="pl-6 space-y-1">
          <span className="font-medium text-zinc-400 uppercase tracking-wider text-[10px]">
            Recommended Precautions:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
            {precautions.map((pre, idx) => (
              <li key={idx}>{pre}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400 flex items-center gap-1.5 pl-6">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>
          Blockchain anchoring records cryptographic tamper-resistance and audit history of a report, not the subjective truth of its contents.
        </span>
      </div>
    </div>
  );
}

export function FooterDisclaimer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950/80 py-6 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400 text-center md:text-left">
        <div>
          <span className="font-semibold text-zinc-300">
            AI-Powered Web Threat Detection & Digital Trust Intelligence
          </span>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Classifications are point-in-time assessments. Never rely on automated scans as absolute proof of safety.
          </p>
        </div>
        <div className="text-[11px] font-mono text-zinc-400">
          Built with Next.js • Strict API Contract v1
        </div>
      </div>
    </footer>
  );
}
