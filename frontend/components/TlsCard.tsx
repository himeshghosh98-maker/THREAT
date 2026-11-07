import * as React from "react";
import { TlsDetails } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

interface TlsCardProps {
  tls: TlsDetails | null;
}

export function TlsCard({ tls }: TlsCardProps) {
  if (!tls) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-400">
        <Unlock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        No TLS certificate data available (Connection unencrypted, failed handshake, or scan error).
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
      {/* Header status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          {tls.valid ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-950/80 border border-red-700/60 text-red-400">
              <Unlock className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
              <span>{tls.valid ? "Valid Certificate" : "Invalid / Untrusted Certificate"}</span>
              {tls.hostname_match ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Hostname Matched
                </span>
              ) : (
                <span className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Hostname Mismatch
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-400">
              Issued by: <strong className="text-zinc-200">{tls.issuer}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tls.compromised_ca_flag && (
            <Badge className="bg-red-950 text-red-300 border-red-800">
              Compromised CA
            </Badge>
          )}
          <Badge
            className={
              tls.days_remaining > 30
                ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                : "bg-amber-950 text-amber-300 border-amber-800"
            }
          >
            {tls.days_remaining} days remaining
          </Badge>
        </div>
      </div>

      {/* Certificate Technical Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1.5 p-3 rounded bg-zinc-950/60 border border-zinc-800/80">
          <div className="text-zinc-500 font-mono">Subject</div>
          <div className="text-zinc-300 font-mono truncate">{tls.subject}</div>
          <div className="text-zinc-500 font-mono pt-1">Key Specification</div>
          <div className="text-zinc-300 font-mono">
            {tls.key_type} {tls.key_size} bit ({tls.signature_algorithm})
          </div>
        </div>

        <div className="space-y-1.5 p-3 rounded bg-zinc-950/60 border border-zinc-800/80">
          <div className="text-zinc-500 font-mono">Validity Window</div>
          <div className="text-zinc-300 font-mono">
            {new Date(tls.not_before).toLocaleDateString()} &rarr;{" "}
            {new Date(tls.not_after).toLocaleDateString()}
          </div>
          <div className="text-zinc-500 font-mono pt-1">Certificate Transparency</div>
          <div className="text-zinc-300 font-mono">
            {tls.ct_records_count} CT logs recorded
          </div>
        </div>
      </div>

      {/* SAN entries */}
      {tls.san && tls.san.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-mono text-zinc-400">Subject Alternative Names (SAN):</div>
          <div className="flex flex-wrap gap-1.5">
            {tls.san.map((name, i) => (
              <span
                key={i}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      {tls.findings && tls.findings.length > 0 && (
        <div className="space-y-1 border-t border-zinc-800/80 pt-3">
          <div className="text-xs font-semibold text-zinc-300">TLS Inspection Findings:</div>
          <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
            {tls.findings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="rounded border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs text-amber-300/90 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <span>
          <strong>Security Notice:</strong> {tls.disclaimer || "A valid certificate is not proof that the site is safe."}
        </span>
      </div>
    </div>
  );
}
