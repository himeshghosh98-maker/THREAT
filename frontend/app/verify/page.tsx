"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { verifyReport } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  Loader2
} from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("report_id") || searchParams.get("id") || "";
  const [reportIdInput, setReportIdInput] = React.useState(initialId);
  const [activeSearchId, setActiveSearchId] = React.useState(initialId);

  const {
    data: verifyResult,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["verify", activeSearchId],
    queryFn: () => verifyReport(activeSearchId),
    enabled: !!activeSearchId
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportIdInput.trim()) return;
    setActiveSearchId(reportIdInput.trim());
  };

  const samplePublishedId = "c3d4e5f6-a7b8-9c0d-1e2f-333333333333";
  const sampleMismatchId = "a1b2c3d4-e5f6-7a8b-9c0d-111111111111";

  return (
    <div className="space-y-6 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
          <FileCheck className="w-3.5 h-3.5" />
          Cryptographic Integrity Audit
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          Verify Scan Authenticity On-Chain
        </h1>
        <p className="text-xs text-zinc-400">
          Cryptographically recompute the SHA-256 state tree of any report and compare against immutable smart contract records.
        </p>
      </div>

      {/* Query Search Box */}
      <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter Report UUID (e.g. c3d4e5f6-a7b8-9c0d-1e2f-333333333333)"
              value={reportIdInput}
              onChange={(e) => setReportIdInput(e.target.value)}
              className="font-mono text-xs h-10 bg-zinc-950/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <Button
              type="submit"
              disabled={isLoading || !reportIdInput.trim()}
              className="sm:w-36 h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Audit Proof
                </>
              )}
            </Button>
          </form>

          {/* Quick presets */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">Try Sample:</span>
            <button
              type="button"
              onClick={() => {
                setReportIdInput(samplePublishedId);
                setActiveSearchId(samplePublishedId);
              }}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-emerald-400 border border-emerald-900/40"
            >
              Valid Hash Match (Chase Bank)
            </button>
            <button
              type="button"
              onClick={() => {
                setReportIdInput(sampleMismatchId);
                setActiveSearchId(sampleMismatchId);
              }}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 border border-amber-900/40"
            >
              Hash Mismatch (Tampered)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Verification State Display */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertTitle>Verification Request Failed</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || "Could not execute on-chain verification check."}
          </AlertDescription>
        </Alert>
      ) : verifyResult ? (
        <div className="space-y-6">
          {/* Main Verdict Card */}
          <Card
            className={`border shadow-lg ${
              verifyResult.match
                ? "border-emerald-800/70 bg-emerald-950/20"
                : "border-red-800/70 bg-red-950/20"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {verifyResult.match ? (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-950 border border-red-700 text-red-400">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base text-zinc-100">
                      {verifyResult.match
                        ? "Cryptographic Integrity Verified"
                        : "Integrity Discrepancy / Tamper Detected"}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400">
                      Report ID: <span className="font-mono text-zinc-300">{verifyResult.report_id}</span>
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  className={
                    verifyResult.match
                      ? "bg-emerald-950 text-emerald-300 border-emerald-700 font-mono text-xs uppercase"
                      : "bg-red-950 text-red-300 border-red-700 font-mono text-xs uppercase"
                  }
                >
                  Status: {verifyResult.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {/* Hash Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">
                    Recomputed SHA-256 Digest
                  </span>
                  <div className="font-mono text-cyan-300 text-[11px] break-all select-all">
                    {verifyResult.recomputed_hash}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-mono uppercase tracking-wider text-[10px]">
                    On-Chain Anchored Digest
                  </span>
                  <div
                    className={`font-mono text-[11px] break-all select-all ${
                      verifyResult.match ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {verifyResult.onchain_hash || "NULL (No on-chain record)"}
                  </div>
                </div>
              </div>

              {/* Chain metadata */}
              <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/80 gap-2">
                <div className="flex items-center gap-4">
                  <span>Network: <strong className="text-zinc-200">{verifyResult.network}</strong></span>
                  <span>Contract: <strong className="font-mono text-zinc-300 truncate max-w-[140px] sm:max-w-none">{verifyResult.contract_address}</strong></span>
                </div>
                <Link href={`/report/${verifyResult.report_id}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-cyan-400 hover:text-cyan-300">
                    View Scanned Report
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Audit History Timeline */}
          {verifyResult.history && verifyResult.history.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Immutable Transaction Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {verifyResult.history.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-zinc-950/70 border border-zinc-800 text-xs font-mono gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                          {item.status}
                        </span>
                        <span className="text-cyan-400 truncate max-w-[200px] sm:max-w-[320px] select-all">
                          {item.tx_hash}
                        </span>
                      </div>
                      <span className="text-zinc-500 text-[11px]">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mandatory Contract Note */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Cryptographic Audit Note:</strong> {verifyResult.note}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-12 text-center text-sm text-zinc-500">
          Enter a report UUID or select a sample above to perform cryptographic integrity verification.
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 py-8">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-32 w-full max-w-4xl mx-auto" />
        </div>
      }
    >
      <VerifyContent />
    </React.Suspense>
  );
}
