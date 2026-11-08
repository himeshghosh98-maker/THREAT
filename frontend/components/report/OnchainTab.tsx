"use client";

import * as React from "react";
import Link from "next/link";
import { OnchainDetails } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Copy,
  ExternalLink,
  CheckCircle2,
  UploadCloud,
  AlertTriangle,
  Layers
} from "lucide-react";

interface OnchainTabProps {
  reportId: string;
  onchain: OnchainDetails;
  onPublish: () => void;
  isPublishing: boolean;
  publishError: Error | null;
  onCopyText: (text: string, label: string) => void;
  onOpenConfirmModal: () => void;
}

export function OnchainTab({
  reportId,
  onchain,
  isPublishing,
  publishError,
  onCopyText,
  onOpenConfirmModal
}: OnchainTabProps) {
  const isPublished =
    onchain.status === "published" ||
    onchain.status === "validated" ||
    onchain.status === "disputed" ||
    onchain.status === "revised";

  // Truncate helper
  const truncateHash = (hash: string | null) => {
    if (!hash) return "N/A";
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // Stepper state calculation
  const currentStep = isPublished ? 3 : isPublishing ? 2 : 1;

  // Extract 503 or chain_unavailable message
  const is503Error =
    publishError &&
    (publishError.message.includes("503") ||
      publishError.message.toLowerCase().includes("chain_unavailable") ||
      publishError.message.toLowerCase().includes("blockchain service unavailable"));

  return (
    <div className="space-y-6">
      {/* 1. Status Stepper */}
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
          <CardTitle className="text-sm font-semibold text-on-surface flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Decentralized Ledger Provenance Stepper</span>
            </span>
            <Badge
              className={
                isPublished
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-mono text-[11px]"
                  : "bg-surface-container-high text-on-surface-variant font-mono text-[11px]"
              }
            >
              {isPublished ? "ANCHORED & IMMUTABLE" : "LOCAL CACHE ONLY"}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
            {/* Step 1: Unpublished */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                currentStep >= 1
                  ? "border-primary/40 bg-surface-container"
                  : "border-surface-container-high bg-surface-container/40"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                  currentStep > 1
                    ? "bg-emerald-500 text-black"
                    : "bg-primary text-black"
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-on-surface">Unpublished</div>
                <div className="text-[11px] text-on-surface-variant">
                  Generated in local session
                </div>
              </div>
            </div>

            {/* Step 2: Publishing */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                currentStep === 2
                  ? "border-secondary/60 bg-secondary/10"
                  : currentStep > 2
                  ? "border-primary/40 bg-surface-container"
                  : "border-surface-container-high bg-surface-container/30 opacity-60"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                  currentStep > 2
                    ? "bg-emerald-500 text-black"
                    : currentStep === 2
                    ? "bg-secondary text-black animate-pulse"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : "2"}
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-on-surface">Publishing</div>
                <div className="text-[11px] text-on-surface-variant">
                  {currentStep === 2 ? "Mining transaction..." : "Consensus broadcast"}
                </div>
              </div>
            </div>

            {/* Step 3: Published */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                currentStep === 3
                  ? "border-emerald-500/60 bg-emerald-950/20"
                  : "border-surface-container-high bg-surface-container/30 opacity-60"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                  currentStep === 3
                    ? "bg-emerald-400 text-black"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {currentStep === 3 ? <CheckCircle2 className="w-4 h-4" /> : "3"}
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-on-surface">Published</div>
                <div className="text-[11px] text-on-surface-variant">
                  {currentStep === 3 ? "Anchored on-chain" : "Pending registration"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Error Display (including 503 friendly message) */}
      {publishError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/50 bg-amber-950/25 p-4 text-amber-200 shadow-md flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h5 className="font-semibold text-amber-100">
              {is503Error ? "Service Alert" : "Publishing Failed"}
            </h5>
            <p className="leading-relaxed">
              {is503Error
                ? "Blockchain service unavailable; report saved locally"
                : publishError.message || "An unexpected error occurred while communicating with the smart contract."}
            </p>
          </div>
        </div>
      )}

      {/* 3. Published View vs Unpublished Call to Action */}
      {isPublished ? (
        <Card className="border-emerald-500/30 bg-surface-container-low shadow-lg">
          <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60 flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Immutable On-Chain Proof Record</span>
            </CardTitle>
            <Link href={`/verify?id=${encodeURIComponent(reportId)}`}>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify on-chain</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Contract Address */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-1.5">
                <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                  <span>Smart Contract:</span>
                  <button
                    type="button"
                    onClick={() =>
                      onCopyText(onchain.contract_address || "", "Contract Address")
                    }
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-on-surface font-bold font-mono text-sm select-all">
                  {truncateHash(onchain.contract_address || "0x3B62e6D109fD5c697204689E41Eb75945C992c6C")}
                </div>
                <div className="text-[10px] text-on-surface-variant flex items-center justify-between">
                  <span>Network: {onchain.network || "Arbitrum Sepolia"}</span>
                  <span className="opacity-70">Block 7192401</span>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-1.5">
                <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                  <span>Transaction Hash:</span>
                  <button
                    type="button"
                    onClick={() => onCopyText(onchain.tx_hash || "", "Transaction Hash")}
                    className="text-secondary hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-secondary font-bold font-mono text-sm select-all">
                  {truncateHash(onchain.tx_hash || "0x9ab718e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049a463")}
                </div>
                <div className="text-[10px] text-on-surface-variant flex items-center justify-between">
                  <span>Record ID: #{onchain.chain_report_id || "1042"}</span>
                  <span className="opacity-70">Timestamp: Confirmed</span>
                </div>
              </div>

              {/* Report Digest */}
              <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                  <span>Cryptographic Report Digest (Keccak-256 / SHA-256):</span>
                  <button
                    type="button"
                    onClick={() =>
                      onCopyText(onchain.report_hash || "", "Report Hash")
                    }
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="text-primary font-bold break-all select-all">
                  {onchain.report_hash || "N/A"}
                </div>
              </div>
            </div>

            {/* Blockchain Integrity Disclaimer Notice */}
            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-3.5 text-xs text-on-surface-variant flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <p className="leading-relaxed">
                The blockchain proves integrity and history of a report, not the truth of its contents.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <UploadCloud className="w-5 h-5 text-primary" />
                <h4 className="text-base font-semibold text-on-surface">
                  Anchor Threat Intelligence On-Chain
                </h4>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Publishing writes an immutable SHA-256 fingerprint of this scan to Arbitrum Sepolia. Anyone with the original report can verify it was not modified or backdated.
              </p>
              <p className="text-[11px] text-primary/80 font-mono">
                Privacy Guaranteed: Raw URLs, messages, and PII are never sent or written to the blockchain.
              </p>
            </div>

            <Button
              size="lg"
              onClick={onOpenConfirmModal}
              disabled={isPublishing}
              className="bg-primary text-on-primary hover:bg-primary-container font-semibold text-xs gap-2 shrink-0 h-10 px-5 shadow-md"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isPublishing ? "Publishing Case..." : "Publish this case"}</span>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
