"use client";

import * as React from "react";
import { ScanReport } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Copy,
  Calendar,
  Globe,
  Radio,
  Hash,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

interface SidePanelProps {
  report: ScanReport;
  onCopyText: (text: string, label: string) => void;
}

export function SidePanel({ report, onCopyText }: SidePanelProps) {
  const absoluteTime = new Date(report.created_at).toUTCString();
  const isoTime = report.created_at;

  return (
    <aside className="w-full space-y-4">
      {/* Case Metadata Card */}
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardHeader className="p-4 pb-2 border-b border-surface-container-high/60">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" /> Case Metadata
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3.5 text-xs">
          {/* Report ID */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-on-surface-variant font-mono text-[11px]">
              <span>Report UUID:</span>
              <button
                type="button"
                onClick={() => onCopyText(report.id, "Report ID")}
                className="text-primary hover:underline flex items-center gap-1"
                title="Copy full Report ID"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <div className="p-2 rounded bg-surface-container font-mono text-[11px] text-on-surface break-all select-all border border-surface-container-high">
              {report.id}
            </div>
          </div>

          {/* Timestamp */}
          <div className="space-y-1 pt-1 border-t border-surface-container-high/40">
            <span className="text-on-surface-variant font-mono text-[11px] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-secondary" /> Scan Executed At:
            </span>
            <div className="font-mono text-xs text-on-surface">
              {absoluteTime}
            </div>
            <div className="text-[11px] font-mono text-on-surface-variant opacity-75">
              ISO: {isoTime}
            </div>
          </div>

          {/* Target Type & Canonical Domain */}
          <div className="space-y-2 pt-1 border-t border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-mono text-[11px]">Input Classification:</span>
              <span className="uppercase font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-container text-primary border border-primary/20 flex items-center gap-1">
                {report.input_type === "url" ? (
                  <>
                    <Globe className="w-3 h-3" /> URL
                  </>
                ) : (
                  <>
                    <Radio className="w-3 h-3" /> Message
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-mono text-[11px]">Canonical Domain:</span>
              <span className="font-mono text-xs text-on-surface font-medium truncate max-w-[150px]">
                {report.domain || "N/A (Raw Message)"}
              </span>
            </div>
          </div>

          {/* Telemetry Breakdown */}
          <div className="space-y-1.5 pt-1 border-t border-surface-container-high/40">
            <span className="text-on-surface-variant font-mono text-[11px]">
              Engine Telemetry Execution:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-surface-container border border-surface-container-high flex items-center justify-between text-emerald-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Completed:
                </span>
                <span className="font-bold">{report.risk.checks_completed.length}</span>
              </div>
              <div className="p-2 rounded bg-surface-container border border-surface-container-high flex items-center justify-between text-amber-400">
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Failed:
                </span>
                <span className="font-bold">{report.risk.checks_failed.length}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Hash */}
          {report.onchain.report_hash && (
            <div className="space-y-1 pt-1 border-t border-surface-container-high/40">
              <div className="flex items-center justify-between text-on-surface-variant font-mono text-[11px]">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3 text-primary" /> Keccak-256 Digest:
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(report.onchain.report_hash || "", "Report Hash")}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <div className="p-2 rounded bg-surface-container-lowest font-mono text-[10px] text-primary break-all select-all border border-surface-container-high">
                {report.onchain.report_hash}
              </div>
            </div>
          )}

          {/* Quick Verify Link if anchored */}
          {report.onchain.status !== "not_published" && (
            <div className="pt-2">
              <Link href={`/verify?id=${encodeURIComponent(report.id)}`} className="w-full block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify On-Chain Integrity</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
