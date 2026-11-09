"use client";

import * as React from "react";
import Link from "next/link";
import { ScanReport } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Copy,
  UploadCloud,
  ChevronRight,
  Clock,
  Radio,
  Globe
} from "lucide-react";

interface ReportHeaderProps {
  report: ScanReport;
  onCopyTarget: () => void;
  onOpenPublishModal?: () => void;
  isPublishing?: boolean;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
}

export function ReportHeader({
  report,
  onCopyTarget,
  onOpenPublishModal,
  isPublishing = false
}: ReportHeaderProps) {
  const shortId = report.id.slice(0, 8);
  const formattedAbsolute = new Date(report.created_at).toUTCString();
  const relativeTime = formatRelativeTime(report.created_at);
  const isNotPublished = report.onchain.status === "not_published";

  return (
    <div className="space-y-4 pb-2">
      {/* Breadcrumb & Global Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/60 pb-3">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
          <Link
            href="/"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <span>Reports</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          <span className="text-on-surface font-semibold">
            case-{shortId}
          </span>
          <span className="text-[11px] opacity-70 ml-1">
            ({report.input_type.toUpperCase()})
          </span>
        </nav>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 text-xs gap-1.5 bg-surface-container border-surface-container-high text-on-surface hover:bg-surface-container-high hover:text-white"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Print Report</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCopyTarget}
            className="h-8 text-xs gap-1.5 bg-surface-container border-surface-container-high text-on-surface hover:bg-surface-container-high hover:text-white"
          >
            <Copy className="w-3.5 h-3.5 text-secondary" />
            <span>Copy Defanged Target</span>
          </Button>

          {isNotPublished && onOpenPublishModal && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenPublishModal}
              disabled={isPublishing}
              className="h-8 text-xs gap-1.5 bg-primary text-on-primary hover:bg-primary-container font-medium shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isPublishing ? "Publishing..." : "Publish to blockchain"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Target Monospace Display & Telemetry Header */}
      <div className="rounded-xl border border-surface-container-high/80 bg-surface-container-low p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/30 flex items-center gap-1">
              {report.input_type === "url" ? (
                <>
                  <Globe className="w-3 h-3 text-primary" /> Scanned URL Target
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3 text-secondary" /> Analyzed Message Payload
                </>
              )}
            </span>
            {report.domain && (
              <span className="text-xs font-mono text-on-surface-variant">
                Domain: <strong className="text-on-surface">{report.domain}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
            <Clock className="w-3.5 h-3.5 opacity-70" />
            <span>{formattedAbsolute}</span>
            {relativeTime && (
              <span className="text-[11px] opacity-75">({relativeTime})</span>
            )}
          </div>
        </div>

        {/* Defanged input_display in monospace plain text (strictly non-clickable) */}
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-on-surface-variant/80 uppercase tracking-wider flex items-center justify-between">
            <span>Defanged Target (Plain Text):</span>
            <span className="text-[10px] text-primary/80 lowercase">non-clickable plain text</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high font-mono text-xs sm:text-sm text-primary break-all select-all leading-relaxed shadow-inner">
            {report.input_display}
          </div>
        </div>
      </div>
    </div>
  );
}
