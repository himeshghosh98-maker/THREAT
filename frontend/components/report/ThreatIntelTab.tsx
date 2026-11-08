"use client";

import * as React from "react";
import { ThreatIntelItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Database
} from "lucide-react";

interface ThreatIntelTabProps {
  threatIntel: ThreatIntelItem[];
}

export function ThreatIntelTab({ threatIntel }: ThreatIntelTabProps) {
  const getSourceStatus = (item: ThreatIntelItem) => {
    const detailLower = (item.detail || "").toLowerCase();
    const isUnavailable =
      detailLower.includes("unavailable") ||
      detailLower.includes("timeout") ||
      detailLower.includes("rate limit") ||
      detailLower.includes("offline");

    if (item.matched) {
      return {
        badge: (
          <Badge className="bg-error-container/80 text-error border-error-container font-mono text-xs uppercase px-2.5 py-0.5 gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Matched Threat
          </Badge>
        ),
        cardClass: "border-red-500/40 bg-red-950/15"
      };
    }

    if (isUnavailable) {
      return {
        badge: (
          <Badge className="bg-amber-950/80 text-amber-300 border-amber-700/60 font-mono text-xs uppercase px-2.5 py-0.5 gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Unavailable
          </Badge>
        ),
        cardClass: "border-amber-500/30 bg-amber-950/10"
      };
    }

    // Default: No match found (gray badge, backend text, NEVER implying safety)
    return {
      badge: (
        <Badge className="bg-surface-container-high text-on-surface-variant border-outline-variant/30 font-mono text-xs uppercase px-2.5 py-0.5 gap-1">
          <HelpCircle className="w-3.5 h-3.5 opacity-60" /> No match found
        </Badge>
      ),
      cardClass: "border-surface-container-high bg-surface-container/50"
    };
  };

  return (
    <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
      <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
        <CardTitle className="text-sm font-semibold text-on-surface flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span>Threat Intelligence Feeds & Reputation Sources ({threatIntel.length} feeds)</span>
          </span>
          <span className="text-xs font-mono text-on-surface-variant font-normal">
            Multi-Source Correlated
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 space-y-3">
        {threatIntel.length === 0 ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            No threat intelligence feed telemetry recorded.
          </div>
        ) : (
          threatIntel.map((item, idx) => {
            const status = getSourceStatus(item);

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-colors space-y-2 ${status.cardClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold font-mono text-on-surface">
                      {item.source}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      Global Feed
                    </span>
                  </div>

                  <div>{status.badge}</div>
                </div>

                {/* Backend detail text - strictly plain text, never implying safety */}
                <div className="text-xs text-on-surface leading-relaxed p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high font-mono">
                  {item.detail}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
