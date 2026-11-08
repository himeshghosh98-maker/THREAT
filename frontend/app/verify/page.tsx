"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { verifyReport, ApiClientError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2,
  Copy,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Check
} from "lucide-react";
import Link from "next/link";

// Hash Visual Differ: Highlights mismatching characters in monospace
function DiffHashView({
  hash,
  compareWith,
  isMismatch
}: {
  hash: string | null;
  compareWith: string | null;
  isMismatch: boolean;
}) {
  if (!hash) {
    return <span className="font-mono text-xs text-red-400">NULL (No on-chain record)</span>;
  }
  if (!isMismatch || !compareWith) {
    return <span className="font-mono text-xs break-all select-all">{hash}</span>;
  }

  return (
    <span className="font-mono text-xs break-all select-all leading-relaxed">
      {hash.split("").map((char, idx) => {
        const isDifferent = idx >= compareWith.length || char !== compareWith[idx];
        return (
          <span
            key={idx}
            className={
              isDifferent
                ? "bg-red-500/40 text-red-200 font-bold underline px-0.5 rounded-xs"
                : ""
            }
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || searchParams.get("report_id") || "";
  const [reportIdInput, setReportIdInput] = React.useState(initialId);
  const [activeSearchId, setActiveSearchId] = React.useState(initialId);

  // Toast feedback state
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const {
    data: verifyResult,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["verify", activeSearchId],
    queryFn: () => verifyReport(activeSearchId),
    enabled: !!activeSearchId,
    retry: false
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportIdInput.trim()) return;
    setActiveSearchId(reportIdInput.trim());
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  // Preset IDs for testing
  const samplePublishedId = "c3d4e5f6-a7b8-9c0d-1e2f-333333333333";
  const sampleMismatchId = "a1b2c3d4-e5f6-7a8b-9c0d-111111111111";
  const sampleUnpublishedId = "d4e5f6a7-b8c9-0d1e-2f3a-444444444444";
  const sample503Id = "mock-503-chain-unavailable";

  // Error status extraction
  const errorObj = error as ApiClientError | Error | null;
  const statusCode =
    errorObj && "statusCode" in errorObj ? errorObj.statusCode : undefined;
  const errorCode =
    errorObj && "code" in errorObj ? errorObj.code : "";
  const is409 = statusCode === 409 || errorCode === "not_published";
  const is404 = statusCode === 404 || errorCode === "not_found";
  const is503 = statusCode === 503 || errorCode === "chain_unavailable";

  const isSepolia =
    verifyResult?.network?.toLowerCase().includes("sepolia") ?? false;

  return (
    <div className="space-y-6 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-primary/10 border border-primary/30 text-primary">
          <FileCheck className="w-3.5 h-3.5" />
          Cryptographic Integrity Audit
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
          Verify Scan Authenticity On-Chain
        </h1>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Cryptographically recompute the SHA-256 state tree of any report and compare against immutable smart contract records.
        </p>
      </div>

      {/* Query Search Box */}
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardContent className="p-4 sm:p-6 space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter Report UUID (e.g. c3d4e5f6-a7b8-9c0d-1e2f-333333333333)"
              value={reportIdInput}
              onChange={(e) => setReportIdInput(e.target.value)}
              className="font-mono text-xs h-10 bg-surface-container border-surface-container-high text-on-surface placeholder:text-on-surface-variant/60"
            />
            <Button
              type="submit"
              disabled={isLoading || !reportIdInput.trim()}
              className="sm:w-36 h-10 bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs shrink-0 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Audit Proof
                </>
              )}
            </Button>
          </form>

          {/* Quick presets for testing */}
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">
              Test Presets:
            </span>
            <button
              type="button"
              onClick={() => {
                setReportIdInput(samplePublishedId);
                setActiveSearchId(samplePublishedId);
              }}
              className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-emerald-400 border border-emerald-500/30 transition-colors"
            >
              Match Verified (Sepolia)
            </button>
            <button
              type="button"
              onClick={() => {
                setReportIdInput(sampleMismatchId);
                setActiveSearchId(sampleMismatchId);
              }}
              className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-red-400 border border-red-500/30 transition-colors"
            >
              Hash Mismatch (Tampered)
            </button>
            <button
              type="button"
              onClick={() => {
                setReportIdInput(sampleUnpublishedId);
                setActiveSearchId(sampleUnpublishedId);
              }}
              className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-amber-400 border border-amber-500/30 transition-colors"
            >
              Unpublished (409)
            </button>
            <button
              type="button"
              onClick={() => {
                setReportIdInput(sample503Id);
                setActiveSearchId(sample503Id);
              }}
              className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-surface-container-high transition-colors"
            >
              Chain Offline (503)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <Skeleton className="h-28 w-full bg-surface-container" />
          <Skeleton className="h-48 w-full bg-surface-container" />
        </div>
      ) : isError ? (
        /* Friendly Error States for 409, 404, 503 */
        <div className="space-y-4">
          {is409 ? (
            <Alert className="border-amber-500/50 bg-amber-950/25 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <AlertTitle className="text-sm font-bold text-amber-100">
                Report Not Published On-Chain (409)
              </AlertTitle>
              <AlertDescription className="text-xs leading-relaxed space-y-3 mt-1">
                <p>
                  This scan assessment exists in the threat intelligence engine, but its cryptographic fingerprint has not yet been registered to the blockchain ledger.
                </p>
                <div>
                  <Link href={`/report/${encodeURIComponent(activeSearchId)}`}>
                    <Button
                      size="sm"
                      className="text-xs gap-1.5 bg-primary text-on-primary hover:bg-primary-container font-semibold"
                    >
                      <span>Open Report to Publish</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          ) : is404 ? (
            <Alert variant="destructive" className="border-red-500 bg-red-950/40">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <AlertTitle className="text-sm font-bold">
                Report Not Found (404)
              </AlertTitle>
              <AlertDescription className="text-xs leading-relaxed space-y-3 mt-1">
                <p>
                  No scan report found matching ID &apos;{activeSearchId}&apos;. Please verify the UUID or run a new scan.
                </p>
                <div>
                  <Link href="/">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 border-red-500/40 text-red-200 hover:bg-red-950/50"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Scanner</span>
                    </Button>
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          ) : is503 ? (
            <Alert className="border-amber-500/50 bg-amber-950/25 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <AlertTitle className="text-sm font-bold text-amber-100">
                Blockchain Service Unavailable (503)
              </AlertTitle>
              <AlertDescription className="text-xs leading-relaxed space-y-3 mt-1">
                <p>
                  Blockchain service unavailable; report saved locally. The decentralized ledger node is unreachable or experiencing network congestion.
                </p>
                <div>
                  <Button
                    size="sm"
                    onClick={() => refetch()}
                    className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Verification</span>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <ShieldAlert className="w-5 h-5" />
              <AlertTitle className="text-sm font-bold">Verification Error</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {error?.message || "An unexpected error occurred during verification."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : verifyResult ? (
        <div className="space-y-6">
          {/* Main Verdict Banner: Green "Integrity verified" or Red "Mismatch: report differs from on-chain record" */}
          <div
            role="alert"
            className={`rounded-2xl border p-5 shadow-xl transition-all ${
              verifyResult.match
                ? "border-emerald-500/60 bg-emerald-950/25 text-emerald-200"
                : "border-red-500/60 bg-red-950/25 text-red-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border shrink-0 ${
                    verifyResult.match
                      ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-400"
                      : "border-red-500/40 bg-red-950/80 text-red-400"
                  }`}
                >
                  {verifyResult.match ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {verifyResult.match
                      ? "Integrity verified"
                      : "Mismatch: report differs from on-chain record"}
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5">
                    {verifyResult.match
                      ? `Cryptographic state tree identically matches on-chain registration on ${verifyResult.network}.`
                      : `Recomputed state differs from ledger record. Report may have been tampered, altered, or backdated.`}
                  </p>
                </div>
              </div>

              <Badge
                className={`font-mono text-xs uppercase px-3 py-1 ${
                  verifyResult.match
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : "bg-red-950 text-red-300 border-red-700"
                }`}
              >
                Status: {verifyResult.status}
              </Badge>
            </div>
          </div>

          {/* Recomputed Hash vs On-Chain Hash Side-by-Side (Diffing highlighted) */}
          <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
            <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60 flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                <span>Cryptographic Digest Comparison</span>
              </CardTitle>
              <span className="text-xs font-mono text-on-surface-variant">
                Report ID: <strong className="text-on-surface">{verifyResult.report_id}</strong>
              </span>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recomputed Hash Box */}
                <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-primary font-bold uppercase tracking-wider text-[11px]">
                      Recomputed SHA-256 Digest
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(verifyResult.recomputed_hash, "Recomputed Hash")}
                      className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-cyan-300">
                    <DiffHashView
                      hash={verifyResult.recomputed_hash}
                      compareWith={verifyResult.onchain_hash}
                      isMismatch={!verifyResult.match}
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-mono">
                    Calculated over canonical canonicalized scan state.
                  </p>
                </div>

                {/* On-Chain Hash Box */}
                <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span
                      className={`font-bold uppercase tracking-wider text-[11px] ${
                        verifyResult.match ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      On-Chain Anchored Digest
                    </span>
                    {verifyResult.onchain_hash && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(verifyResult.onchain_hash || "", "On-chain Hash")
                        }
                        className="text-secondary hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high">
                    <DiffHashView
                      hash={verifyResult.onchain_hash}
                      compareWith={verifyResult.recomputed_hash}
                      isMismatch={!verifyResult.match}
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-mono">
                    Retrieved from smart contract state tree.
                  </p>
                </div>
              </div>

              {/* Contract & Network Meta Bar */}
              <div className="pt-2 border-t border-surface-container-high/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-on-surface-variant">
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    Network: <strong className="text-on-surface">{verifyResult.network}</strong>
                  </span>
                  <span>
                    Contract:{" "}
                    <strong className="text-on-surface select-all">
                      {verifyResult.contract_address}
                    </strong>
                  </span>
                </div>
                <Link href={`/report/${verifyResult.report_id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-surface-container border-surface-container-high text-primary hover:bg-surface-container-high"
                  >
                    <span>View Scanned Case Report</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Audit History Timeline with Copy Buttons and Explorer Links */}
          {verifyResult.history && verifyResult.history.length > 0 && (
            <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
              <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Immutable On-Chain Transaction Audit Log</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2.5">
                {verifyResult.history.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-surface-container border border-surface-container-high text-xs font-mono gap-2 hover:border-surface-container-highest transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface uppercase font-bold">
                        {item.status}
                      </span>
                      <span className="text-primary truncate select-all">
                        {item.tx_hash}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-on-surface-variant">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>

                      {/* Copy Tx Hash Button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.tx_hash, "Transaction Hash")}
                        className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-white transition-colors"
                        title="Copy Transaction Hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Explorer Link only for Sepolia */}
                      {isSepolia && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${item.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-secondary hover:underline"
                          title="View on Sepolia Etherscan"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ALWAYS show VerifyResult.note in an alert */}
          <Alert className="border-surface-container-high bg-surface-container-low text-on-surface">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <AlertTitle className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
              Decentralized Cryptographic Audit Notice
            </AlertTitle>
            <AlertDescription className="text-xs text-on-surface-variant leading-relaxed mt-1">
              {verifyResult.note}
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-12 text-center text-xs text-on-surface-variant">
          Enter a report UUID or select a test preset above to perform on-chain cryptographic integrity verification.
        </div>
      )}

      {/* Copy Toast Pill */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-primary/50 bg-surface-container-high px-4 py-3 text-xs font-mono font-medium text-primary shadow-2xl animate-in fade-in slide-in-from-bottom-3"
        >
          <Check className="w-4 h-4 text-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4 py-8 max-w-4xl mx-auto animate-pulse">
          <Skeleton className="h-10 w-48 mx-auto bg-surface-container" />
          <Skeleton className="h-32 w-full bg-surface-container" />
        </div>
      }
    >
      <VerifyContent />
    </React.Suspense>
  );
}
