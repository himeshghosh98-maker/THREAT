import * as React from "react";
import { RedirectHop } from "@/lib/types";
import { ArrowDown, CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RedirectTimelineProps {
  chain: RedirectHop[];
}

export function RedirectTimeline({ chain }: RedirectTimelineProps) {
  if (!chain || chain.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4 text-center text-sm text-zinc-400">
        No redirect hops recorded. Direct single-hop request.
      </div>
    );
  }

  const getStatusBadge = (status: number) => {
    if (status >= 300 && status < 400) {
      return (
        <Badge className="bg-amber-950/70 text-amber-300 border-amber-800 font-mono text-xs">
          HTTP {status} Redirect
        </Badge>
      );
    }
    if (status >= 200 && status < 300) {
      return (
        <Badge className="bg-emerald-950/70 text-emerald-300 border-emerald-800 font-mono text-xs">
          HTTP {status} OK
        </Badge>
      );
    }
    return (
      <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-xs">
        HTTP {status}
      </Badge>
    );
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:bottom-3 before:top-3 before:left-2.5 before:w-0.5 before:bg-zinc-800">
      {chain.map((hop, idx) => {
        const isLast = idx === chain.length - 1;
        return (
          <div key={idx} className="relative group">
            {/* Dot indicator */}
            <div
              className={`absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                isLast
                  ? "border-cyan-500 bg-cyan-950 text-cyan-400"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              {isLast ? (
                <CornerDownRight className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500 uppercase">
                    Step {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-zinc-200">
                    {hop.domain || "Unknown Domain"}
                  </span>
                </div>
                {getStatusBadge(hop.status)}
              </div>

              {/* Defanged / non-clickable plain text URL */}
              <div className="rounded bg-zinc-950 p-2 font-mono text-xs text-zinc-300 break-all select-all border border-zinc-800/80">
                {hop.url}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
