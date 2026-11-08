"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  X,
  Lock,
  CheckCircle2
} from "lucide-react";

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPublishing: boolean;
}

export function PublishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isPublishing
}: PublishConfirmModalProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPublishing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPublishing, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-surface-container-high bg-surface-container-low p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPublishing}
          aria-label="Close dialog"
          className="absolute right-4 top-4 text-on-surface-variant hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 text-primary border border-primary/30 shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 id="publish-modal-title" className="text-base font-bold text-on-surface">
              Publish Case to Blockchain
            </h3>
            <p className="text-xs text-on-surface-variant font-mono">
              Network: Arbitrum Sepolia Testnet
            </p>
          </div>
        </div>

        {/* Explanation & Privacy Guarantee */}
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-high space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-primary uppercase text-[11px] font-mono">
              <Lock className="w-3.5 h-3.5" /> What Will Be Recorded On-Chain:
            </div>
            <p className="text-on-surface">
              Only the <strong>SHA-256 cryptographic digest (hash)</strong> of this assessment is recorded on the smart contract to create an immutable tamper-evident proof of discovery.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[11px] font-mono uppercase">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Privacy & Security Guarantee:
            </div>
            <p className="leading-relaxed">
              <strong>NO scanned URLs, message text, email addresses, or Personally Identifiable Information (PII)</strong> will ever be broadcast or written to the blockchain.
            </p>
          </div>

          <p className="text-on-surface-variant text-[11px] italic">
            Note: On-chain anchoring proves the cryptographic integrity and point-in-time existence of this scan, not the subjective truth of its findings.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPublishing}
            className="text-xs text-on-surface-variant hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isPublishing}
            className="text-xs gap-1.5 bg-primary text-on-primary hover:bg-primary-container font-semibold"
          >
            {isPublishing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Publishing On-Chain...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Confirm & Publish</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
