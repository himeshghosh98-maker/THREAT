import * as React from "react";
import { OnchainDetails } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Link2, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ChainStatusProps {
  reportId: string;
  onchain: OnchainDetails;
  onPublish?: () => void;
  isPublishing?: boolean;
}

export function ChainStatus({
  reportId,
  onchain,
  onPublish,
  isPublishing = false
}: ChainStatusProps) {
  const isPublished =
    onchain.status === "published" ||
    onchain.status === "validated" ||
    onchain.status === "disputed";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          <h4 className="font-semibold text-sm text-zinc-100">
            Digital Trust & Onchain Proof
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {onchain.status === "published" && (
            <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-mono text-[11px]">
              ANCHORED ON-CHAIN
            </Badge>
          )}
          {onchain.status === "validated" && (
            <Badge className="bg-emerald-900/80 text-emerald-200 border-emerald-600 font-mono text-[11px]">
              VALIDATED
            </Badge>
          )}
          {onchain.status === "disputed" && (
            <Badge className="bg-amber-950/80 text-amber-300 border-amber-700/60 font-mono text-[11px]">
              DISPUTED
            </Badge>
          )}
          {onchain.status === "not_published" && (
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono text-[11px]">
              NOT PUBLISHED
            </Badge>
          )}
        </div>
      </div>

      {isPublished ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 font-mono">Report Hash</span>
              <div className="font-mono text-cyan-400 text-[11px] break-all select-all">
                {onchain.report_hash || "N/A"}
              </div>
            </div>

            <div className="p-3 rounded bg-zinc-950/70 border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 font-mono">Transaction Hash</span>
              <div className="font-mono text-zinc-300 text-[11px] break-all select-all">
                {onchain.tx_hash || "N/A"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-1">
            <div className="flex items-center gap-3">
              <span>Network: <strong className="text-zinc-200">{onchain.network || "Not published"}</strong></span>
              {onchain.chain_report_id !== null && (
                <span>ID: <strong className="text-zinc-200">#{onchain.chain_report_id}</strong></span>
              )}
            </div>

            <Link href={`/verify?report_id=${encodeURIComponent(reportId)}`}>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-cyan-800/50 hover:border-cyan-600 text-cyan-300">
                <ShieldCheck className="w-3.5 h-3.5" /> Verify Integrity
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
          <div className="text-xs text-zinc-400">
            Publish this scan digest on-chain to create an immutable cryptographic timestamp and proof of detection.
          </div>
          {onPublish && (
            <Button
              size="sm"
              onClick={onPublish}
              disabled={isPublishing}
              className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs h-8"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Publishing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Publish to Chain
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
