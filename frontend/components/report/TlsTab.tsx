"use client";

import * as React from "react";
import { TlsDetails } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Key,
  Calendar,
  Layers,
  FileCheck2,
  AlertOctagon
} from "lucide-react";

interface TlsTabProps {
  tls: TlsDetails | null;
}

export function TlsTab({ tls }: TlsTabProps) {
  if (!tls) {
    return (
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardContent className="p-8 text-center space-y-3">
          <Unlock className="w-10 h-10 text-on-surface-variant mx-auto opacity-50" />
          <h4 className="text-base font-semibold text-on-surface">
            TLS analysis unavailable
          </h4>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            The target connection was unencrypted (HTTP), the cryptographic handshake failed, or the scan was performed on raw message content without an active TLS endpoint.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate validity period & visual days remaining bar using pure math on certificate dates
  const notBeforeTime = new Date(tls.not_before).getTime();
  const notAfterTime = new Date(tls.not_after).getTime();
  const totalDurationDays = Math.max(
    1,
    Math.round((notAfterTime - notBeforeTime) / (1000 * 60 * 60 * 24))
  );
  const percentageRemaining = Math.max(
    0,
    Math.min(100, Math.round((tls.days_remaining / totalDurationDays) * 100))
  );

  return (
    <div className="space-y-6">
      {/* Compromised CA Warning (if present) */}
      {tls.compromised_ca_flag && (
        <div
          role="alert"
          className="rounded-xl border border-red-500 bg-red-950/40 p-4 text-red-200 shadow-lg flex items-start gap-3.5 animate-in fade-in"
        >
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-red-100 flex items-center gap-2">
              <span>Compromised Certificate Authority Warning</span>
              <Badge className="bg-red-900 text-red-200 border-red-700 text-[10px] font-mono">
                REVOKED / UNTRUSTED ROOT
              </Badge>
            </h4>
            <p className="text-xs text-red-200 leading-relaxed">
              This certificate was issued by an untrusted, compromised, or rogue Certificate Authority. Traffic interception, credential harvesting, or man-in-the-middle attacks may be occurring.
            </p>
          </div>
        </div>
      )}

      {/* Main TLS Card */}
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-xl border ${
                  tls.valid
                    ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-400"
                    : "border-red-500/40 bg-red-950/60 text-red-400"
                }`}
              >
                {tls.valid ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-on-surface flex items-center gap-2">
                  <span>{tls.valid ? "Valid X.509 Certificate" : "Invalid / Untrusted Certificate"}</span>
                  {tls.hostname_match ? (
                    <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/60 text-[10px] font-mono gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Hostname Matched
                    </Badge>
                  ) : (
                    <Badge className="bg-red-950/80 text-red-300 border-red-700/60 text-[10px] font-mono gap-1">
                      <AlertTriangle className="w-3 h-3" /> Hostname Mismatch
                    </Badge>
                  )}
                </CardTitle>
                <div className="text-xs text-on-surface-variant font-mono mt-0.5">
                  Issued by: <strong className="text-on-surface">{tls.issuer}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={
                  tls.days_remaining > 30
                    ? "bg-surface-container-high text-on-surface border-surface-container-highest font-mono text-xs"
                    : "bg-amber-950 text-amber-300 border-amber-800 font-mono text-xs"
                }
              >
                {tls.days_remaining} days remaining
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Visual Days Remaining Bar */}
          <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-on-surface-variant uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Certificate Validity Period
              </span>
              <span className="text-primary font-bold">
                {tls.days_remaining} days left ({percentageRemaining}% duration)
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-surface-container-highest h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tls.days_remaining > 30 ? "bg-primary" : "bg-amber-500"
                }`}
                style={{ width: `${percentageRemaining}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant pt-1">
              <span>Valid From: {new Date(tls.not_before).toLocaleDateString()}</span>
              <span>Expires: {new Date(tls.not_after).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Subject & Cryptographic Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2 text-xs">
              <div className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                Subject Distinguished Name
              </div>
              <div className="font-mono text-on-surface break-all bg-surface-container-lowest p-2 rounded border border-surface-container-high">
                {tls.subject}
              </div>
              <div className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold pt-1">
                Cryptographic Key Specs
              </div>
              <div className="font-mono text-on-surface flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-secondary" />
                <span>
                  {tls.key_type} {tls.key_size}-bit ({tls.signature_algorithm})
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2 text-xs">
              <div className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-primary" /> Certificate Transparency (CT)
              </div>
              <div className="p-2 rounded bg-surface-container-lowest font-mono text-on-surface border border-surface-container-high">
                <div className="font-semibold text-primary">
                  {tls.ct_records_count} CT Audit Logs Present
                </div>
                {tls.ct_notes && tls.ct_notes.length > 0 && (
                  <ul className="text-[11px] text-on-surface-variant space-y-0.5 mt-1 list-disc list-inside">
                    {tls.ct_notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Certificate Chain */}
          {tls.chain && tls.chain.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-secondary" /> Certificate Trust Chain ({tls.chain.length} certificates)
              </div>
              <div className="space-y-1.5">
                {tls.chain.map((cert, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-surface-container border border-surface-container-high font-mono text-xs text-on-surface flex items-center gap-2"
                  >
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      Level {i}
                    </span>
                    <span className="truncate">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SAN List (Subject Alternative Names) */}
          {tls.san && tls.san.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                Subject Alternative Names ({tls.san.length} SANs):
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-surface-container border border-surface-container-high">
                {tls.san.map((name, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container-high text-on-surface border border-surface-container-highest select-all"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          {tls.findings && tls.findings.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-surface-container-high/60">
              <div className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                TLS Inspection Findings:
              </div>
              <ul className="space-y-1 text-xs text-on-surface font-mono">
                {tls.findings.map((f, i) => (
                  <li
                    key={i}
                    className="p-2 rounded bg-surface-container border border-surface-container-high flex items-start gap-2"
                  >
                    <span className="text-primary font-bold">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prominent Callout: tls.disclaimer */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-300">
                Security Notice:
              </span>
              <p className="leading-relaxed">
                {tls.disclaimer || "A valid certificate is not proof that the site is safe."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
