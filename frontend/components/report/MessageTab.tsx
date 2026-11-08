"use client";

import * as React from "react";
import { MessageAnalysis } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  AlertTriangle,
  Link2,
  Mail,
  Phone,
  Building,
  Info
} from "lucide-react";

interface MessageTabProps {
  analysis: MessageAnalysis | null;
}

export function MessageTab({ analysis }: MessageTabProps) {
  if (!analysis) {
    return (
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardContent className="p-8 text-center text-xs text-on-surface-variant">
          No message deconstruction payload recorded for this scan.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Analysis Card */}
      <Card className="border-secondary/40 bg-surface-container-low shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-primary to-secondary" />

        <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
          <CardTitle className="text-sm font-semibold text-on-surface flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-secondary" />
              <span>Message Lure & Social Engineering Deconstruction</span>
            </span>
            <Badge className="bg-secondary/20 text-secondary border-secondary/40 font-mono text-[10px] uppercase">
              NLP Heuristics
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Full Narrative Explanation */}
          <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
              Adversary Synthesis & Tactics:
            </span>
            <p className="text-sm text-on-surface leading-relaxed">
              {analysis.explanation}
            </p>
          </div>

          {/* Urgency & Impersonation Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Urgency Signals */}
            <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Detected Urgency Signals
                </span>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  {analysis.urgency_signals.length} triggers
                </span>
              </div>

              {analysis.urgency_signals.length === 0 ? (
                <div className="text-xs text-on-surface-variant italic">
                  No artificial urgency triggers detected.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analysis.urgency_signals.map((sig, idx) => (
                    <Badge
                      key={idx}
                      className="bg-red-950/80 text-red-300 border-red-700/60 font-mono text-xs"
                    >
                      {sig}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Impersonated Brand / Entity */}
            <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Brand Impersonation
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    analysis.impersonation.detected
                      ? "border-amber-500/50 text-amber-300 bg-amber-950/40"
                      : "border-outline-variant/40 text-on-surface-variant"
                  }`}
                >
                  {analysis.impersonation.detected ? "DETECTED" : "NONE DETECTED"}
                </Badge>
              </div>

              <div className="text-sm font-semibold font-mono text-on-surface pt-1">
                {analysis.impersonation.detected
                  ? analysis.impersonation.target || "Target Identified"
                  : "No recognized brand impersonation found"}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Evaluated against credential-harvesting target dictionaries.
              </p>
            </div>
          </div>

          {/* Extracted Artifacts: URLs, Emails, Phone Numbers (Plain text, never clickable) */}
          <div className="space-y-3 pt-2 border-t border-surface-container-high/60">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
              Extracted Communication Artifacts (Safe Defanged Plain Text):
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Extracted URLs */}
              <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
                <span className="text-[11px] font-mono text-primary flex items-center gap-1 font-semibold uppercase">
                  <Link2 className="w-3.5 h-3.5" /> Extracted URLs ({analysis.extracted_urls.length})
                </span>
                {analysis.extracted_urls.length === 0 ? (
                  <div className="text-xs text-on-surface-variant italic">None</div>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {analysis.extracted_urls.map((url, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded bg-surface-container-lowest font-mono text-[11px] text-primary break-all select-all border border-surface-container-high"
                      >
                        {url}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Emails */}
              <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
                <span className="text-[11px] font-mono text-secondary flex items-center gap-1 font-semibold uppercase">
                  <Mail className="w-3.5 h-3.5" /> Extracted Emails ({analysis.extracted_emails.length})
                </span>
                {analysis.extracted_emails.length === 0 ? (
                  <div className="text-xs text-on-surface-variant italic">None</div>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {analysis.extracted_emails.map((email, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded bg-surface-container-lowest font-mono text-[11px] text-on-surface break-all select-all border border-surface-container-high"
                      >
                        {email}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Phones */}
              <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1 font-semibold uppercase">
                  <Phone className="w-3.5 h-3.5" /> Extracted Phones ({analysis.extracted_phones.length})
                </span>
                {analysis.extracted_phones.length === 0 ? (
                  <div className="text-xs text-on-surface-variant italic">None</div>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {analysis.extracted_phones.map((phone, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded bg-surface-container-lowest font-mono text-[11px] text-on-surface break-all select-all border border-surface-container-high"
                      >
                        {phone}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mandatory Callout */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-300">
                Cognitive Notice:
              </span>
              <p className="leading-relaxed">
                Urgent language alone only raises suspicion and is not conclusive evidence of malice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
