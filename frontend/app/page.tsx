"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scanUrl, scanMessage, listReports, ApiClientError } from "@/lib/api";
import { ScanReport } from "@/lib/types";
import { RiskBadge } from "@/components/RiskBadge";
import { StepProgress, DEFAULT_SCAN_STAGES } from "@/components/StepProgress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radar,
  Link as LinkIcon,
  Mail,
  Delete,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Layers,
  Database
} from "lucide-react";
import Link from "next/link";

const URL_MAX_LENGTH = 2048;
const MESSAGE_MAX_LENGTH = 5000;
const PAGE_SIZE = 5;

function getRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (isNaN(diffSec) || diffSec < 45) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return isoString;
  }
}

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<"url" | "message">("url");
  const [urlInput, setUrlInput] = React.useState(queryParam);
  const [messageInput, setMessageInput] = React.useState("");
  const [urlValidationError, setUrlValidationError] = React.useState<string | null>(null);
  const [messageValidationError, setMessageValidationError] = React.useState<string | null>(null);

  // Pagination state for recent scans table
  const [currentPage, setCurrentPage] = React.useState(0);

  // Copy feedback state for defanged targets
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Pipeline animation stage state
  const [currentStageIndex, setCurrentStageIndex] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [apiError, setApiError] = React.useState<{ code: string; message: string; lastAction: () => void } | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout[]>([]);

  const clearProgressTimers = () => {
    timerRef.current.forEach((t) => clearTimeout(t));
    timerRef.current = [];
  };

  React.useEffect(() => {
    return () => {
      clearProgressTimers();
    };
  }, []);

  const startProgressAnimation = () => {
    clearProgressTimers();
    setCurrentStageIndex(0);
    setIsCompleted(false);

    // Progression through: 1. Submit -> 2. Investigate -> 3. Analyse -> 4. Assess Risk -> 5. Report
    const delays = [450, 950, 1500, 2000];
    delays.forEach((delay, idx) => {
      const timer = setTimeout(() => {
        setCurrentStageIndex(idx + 1);
      }, delay);
      timerRef.current.push(timer);
    });
  };

  // Query paginated recent scans
  const offset = currentPage * PAGE_SIZE;
  const {
    data: reportsData,
    isLoading: isReportsLoading,
    isError: isReportsError,
    error: reportsError,
    refetch: refetchReports
  } = useQuery({
    queryKey: ["reports", "paginated", offset],
    queryFn: () => listReports({ limit: PAGE_SIZE, offset })
  });

  // Query all reports for calculating genuine statistics
  const { data: allReportsData } = useQuery({
    queryKey: ["reports", "metrics-all"],
    queryFn: () => listReports({ limit: 100, offset: 0 })
  });

  // URL scan mutation
  const urlMutation = useMutation({
    mutationFn: (url: string) => scanUrl(url),
    onSuccess: (report: ScanReport) => {
      clearProgressTimers();
      setCurrentStageIndex(DEFAULT_SCAN_STAGES.length - 1);
      setIsCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setTimeout(() => {
        router.push(`/report/${report.id}`);
      }, 400);
    },
    onError: (err: unknown) => {
      clearProgressTimers();
      const code = err instanceof ApiClientError ? err.code : "SCAN_ERROR";
      const message = err instanceof Error ? err.message : "Failed to analyze target. Please try again.";
      setApiError({
        code,
        message,
        lastAction: () => urlMutation.mutate(urlInput.trim())
      });
    }
  });

  // Message scan mutation
  const messageMutation = useMutation({
    mutationFn: (msg: string) => scanMessage(msg),
    onSuccess: (report: ScanReport) => {
      clearProgressTimers();
      setCurrentStageIndex(DEFAULT_SCAN_STAGES.length - 1);
      setIsCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setTimeout(() => {
        router.push(`/report/${report.id}`);
      }, 400);
    },
    onError: (err: unknown) => {
      clearProgressTimers();
      const code = err instanceof ApiClientError ? err.code : "SCAN_ERROR";
      const message = err instanceof Error ? err.message : "Failed to analyze message content. Please try again.";
      setApiError({
        code,
        message,
        lastAction: () => messageMutation.mutate(messageInput.trim())
      });
    }
  });

  const isScanning = urlMutation.isPending || messageMutation.isPending;

  // Validation handlers
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlValidationError("Please enter a URL or domain to analyze.");
      return;
    }
    if (trimmed.length > URL_MAX_LENGTH) {
      setUrlValidationError(`URL exceeds maximum length of ${URL_MAX_LENGTH.toLocaleString()} characters.`);
      return;
    }
    setUrlValidationError(null);
    startProgressAnimation();
    urlMutation.mutate(trimmed);
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const trimmed = messageInput.trim();
    if (!trimmed) {
      setMessageValidationError("Please enter message content to analyze.");
      return;
    }
    if (trimmed.length > MESSAGE_MAX_LENGTH) {
      setMessageValidationError(`Message exceeds maximum length of ${MESSAGE_MAX_LENGTH.toLocaleString()} characters.`);
      return;
    }
    setMessageValidationError(null);
    startProgressAnimation();
    messageMutation.mutate(trimmed);
  };

  // Example chips presets
  const handleSelectExample = (type: "typosquat" | "benign" | "sms") => {
    setApiError(null);
    setUrlValidationError(null);
    setMessageValidationError(null);

    if (type === "typosquat") {
      setActiveTab("url");
      setUrlInput("https://paypa1-security-login.com/verify?account=9824");
    } else if (type === "benign") {
      setActiveTab("url");
      setUrlInput("https://github.com");
    } else if (type === "sms") {
      setActiveTab("message");
      setMessageInput(
        "[USPS Alert]: Your package #94001118982 cannot be delivered due to an unpaid $1.99 customs fee. Update your address at hxxp://usps-redelivery-portal[.]info/fee or your parcel will be returned."
      );
    }
  };

  const handleCopyTarget = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  };

  // Compute real metrics from allReportsData
  const allItems = allReportsData?.items || [];
  const totalScans = allReportsData?.total ?? allItems.length;
  const flaggedCount = allItems.filter((r) =>
    r.risk.classification === "suspicious" ||
    r.risk.classification === "high_risk" ||
    r.risk.classification === "confirmed_malicious"
  ).length;
  const onchainCount = allItems.filter((r) =>
    r.onchain.status === "published" || r.onchain.status === "validated"
  ).length;
  const lowRiskCount = allItems.filter((r) => r.risk.classification === "low_risk").length;

  const totalPages = Math.ceil((reportsData?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-8 w-full">
      {/* Background radial glow */}
      <div className="relative">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[340px] bg-gradient-to-b from-primary/10 via-secondary/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-6">
          {/* One-Line Purpose Hero Header */}
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              Detect phishing links, typosquats, and social engineering lures with cryptographic trust.
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant font-normal">
              Deep heuristic telemetry and threat intelligence correlation with on-chain verification.
            </p>
          </div>

          {/* HERO SCANNER CARD (Matching Stitch design) */}
          <section className="w-full bg-surface-container-low rounded-xl border border-surface-container-high/80 shadow-2xl relative overflow-hidden">
            {/* Top gradient accent line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

            <div className="p-5 sm:p-6 lg:p-7 flex flex-col gap-5">
              {/* Top Row: Segmented Tabs & Operational Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg border border-surface-container-high/60">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("url");
                      setUrlValidationError(null);
                      setMessageValidationError(null);
                    }}
                    disabled={isScanning}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === "url"
                        ? "bg-surface-container-high text-primary shadow-sm font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>URL / Domain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("message");
                      setUrlValidationError(null);
                      setMessageValidationError(null);
                    }}
                    disabled={isScanning}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === "message"
                        ? "bg-surface-container-high text-primary shadow-sm font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Message / Email</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-surface-container-high/60 text-primary font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>[ Defanging: Active ]</span>
                  </div>
                </div>
              </div>

              {/* Central Scanner Input */}
              {activeTab === "url" ? (
                <form onSubmit={handleUrlSubmit} className="space-y-2">
                  <div className="relative flex flex-col sm:flex-row items-stretch gap-2 bg-surface-container rounded-xl p-1.5 border border-surface-container-high/80 shadow-inner focus-within:border-primary/50 transition-all">
                    <div className="hidden sm:flex items-center pl-3 text-primary select-none font-mono text-sm font-bold opacity-80">
                      &gt;
                    </div>
                    <div className="relative flex-1 flex items-center min-w-0">
                      <input
                        type="text"
                        autoComplete="off"
                        spellCheck="false"
                        placeholder="hxxps[://]domain[.]com/endpoint or target host..."
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          if (urlValidationError) setUrlValidationError(null);
                        }}
                        disabled={isScanning}
                        aria-label="Target Web Address or Domain"
                        aria-invalid={!!urlValidationError}
                        className="w-full bg-transparent border-0 outline-none px-3 py-2.5 font-mono text-xs sm:text-sm text-on-surface placeholder:text-outline-variant font-normal tracking-wide selection:bg-primary-container selection:text-on-primary-container"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pr-1 self-end sm:self-auto shrink-0">
                      {urlInput && (
                        <button
                          type="button"
                          onClick={() => setUrlInput("")}
                          disabled={isScanning}
                          title="Clear input"
                          aria-label="Clear input"
                          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      )}
                      <Button
                        type="submit"
                        disabled={isScanning}
                        className="px-6 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(20,184,166,0.25)] hover:shadow-[0_0_24px_rgba(79,219,200,0.4)] active:scale-[0.99]"
                      >
                        <Radar className="w-4 h-4" />
                        <span>{urlMutation.isPending ? "Analyzing..." : "Analyze"}</span>
                      </Button>
                    </div>
                  </div>

                  {urlValidationError && (
                    <p role="alert" className="text-xs text-error font-medium flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{urlValidationError}</span>
                    </p>
                  )}
                </form>
              ) : (
                <form onSubmit={handleMessageSubmit} className="space-y-2">
                  <div className="relative flex flex-col gap-2 bg-surface-container rounded-xl p-3 border border-surface-container-high/80 shadow-inner focus-within:border-primary/50 transition-all">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant pb-1 border-b border-surface-container-high/40">
                      <span className="font-mono text-[11px] text-primary flex items-center gap-1">
                        &gt; Communication Text / Smishing Lure:
                      </span>
                      <span
                        aria-live="polite"
                        className={`font-mono text-[11px] ${
                          messageInput.length > MESSAGE_MAX_LENGTH
                            ? "text-error font-bold"
                            : messageInput.length > MESSAGE_MAX_LENGTH - 500
                            ? "text-amber-400 font-semibold"
                            : "text-on-surface-variant"
                        }`}
                      >
                        {messageInput.length.toLocaleString()} / {MESSAGE_MAX_LENGTH.toLocaleString()} characters
                      </span>
                    </div>

                    <textarea
                      rows={4}
                      placeholder="Paste suspicious SMS body, fake verification notification, or delivery fee alert here..."
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        if (messageValidationError) setMessageValidationError(null);
                      }}
                      disabled={isScanning}
                      aria-label="Message / Email text"
                      aria-invalid={!!messageValidationError}
                      className="w-full bg-transparent border-0 outline-none p-1 font-mono text-xs sm:text-sm text-on-surface placeholder:text-outline-variant font-normal resize-none selection:bg-primary-container selection:text-on-primary-container"
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/40">
                      {messageInput ? (
                        <button
                          type="button"
                          onClick={() => setMessageInput("")}
                          disabled={isScanning}
                          className="text-[11px] text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          Clear
                        </button>
                      ) : <span />}
                      <Button
                        type="submit"
                        disabled={isScanning}
                        className="px-6 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(20,184,166,0.25)] hover:shadow-[0_0_24px_rgba(79,219,200,0.4)]"
                      >
                        <Radar className="w-4 h-4" />
                        <span>{messageMutation.isPending ? "Analyzing..." : "Analyze"}</span>
                      </Button>
                    </div>
                  </div>

                  {messageValidationError && (
                    <p role="alert" className="text-xs text-error font-medium flex items-center gap-1 pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{messageValidationError}</span>
                    </p>
                  )}
                </form>
              )}

              {/* 5-Step Strip Progress component */}
              {isScanning && (
                <StepProgress
                  currentStageIndex={currentStageIndex}
                  isCompleted={isCompleted}
                  isError={!!apiError}
                />
              )}

              {/* Quick Fill Example Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-container-high/60">
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                  Try an example:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectExample("typosquat")}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors font-mono text-xs border border-surface-container-high/60"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0" />
                  <span>paypa1-security-login[.]com</span>
                  <span className="text-error/90 text-[11px] font-sans font-medium">(Typosquat)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectExample("benign")}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors font-mono text-xs border border-surface-container-high/60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>github[.]com</span>
                  <span className="text-primary/90 text-[11px] font-sans font-medium">(Low Risk)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectExample("sms")}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors font-mono text-xs border border-surface-container-high/60"
                >
                  <Mail className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span>USPS Customs Fee Lure</span>
                  <span className="text-secondary/90 text-[11px] font-sans font-medium">(Scam SMS)</span>
                </button>
              </div>

              {/* Error Alert with Contract Shape & Retry */}
              {apiError && (
                <Alert variant="destructive" className="bg-error-container/30 border-error-container text-on-error-container">
                  <AlertCircle className="w-4 h-4 text-error" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div>
                      <AlertTitle className="text-xs font-mono font-bold uppercase tracking-wider text-error">
                        Error [{apiError.code}]
                      </AlertTitle>
                      <AlertDescription className="text-xs text-on-error-container mt-0.5">
                        {apiError.message}
                      </AlertDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setApiError(null);
                        startProgressAnimation();
                        apiError.lastAction();
                      }}
                      className="shrink-0 h-8 text-xs border-error/50 bg-error-container/40 text-on-error-container hover:bg-error-container gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </Button>
                  </div>
                </Alert>
              )}
            </div>
          </section>

          {/* REAL METRIC STRIP (Replacing fake 4289 / 182 / 1.84s / 19/19) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-surface-container-high/70 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                  Total Scans
                </span>
                <span className="text-2xl font-bold font-mono text-on-surface mt-1 block">
                  {totalScans}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <Database className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-surface-container-high/70 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                  Threats Flagged
                </span>
                <span className="text-2xl font-bold font-mono text-error mt-1 block">
                  {flaggedCount}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-error">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-surface-container-high/70 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                  Anchored On-Chain
                </span>
                <span className="text-2xl font-bold font-mono text-primary mt-1 block">
                  {onchainCount}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-surface-container-high/70 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider block">
                  Verified Low Risk
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {lowRiskCount}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </section>

          {/* RECENT SCANS TABLE SECTION */}
          <section id="recent-scans" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
                  Recent scans
                </h2>
                <p className="text-[11px] font-mono text-on-surface-variant tracking-wider uppercase mt-0.5">
                  CACHED TELEMETRY AUDIT LOG
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetchReports()}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high border border-surface-container-high/60 transition-colors self-start sm:self-auto flex items-center gap-1.5 text-xs font-mono"
                title="Refresh reports"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Telemetry Table Card */}
            <div className="w-full bg-surface-container-low rounded-xl border border-surface-container-high/80 shadow-md overflow-hidden">
              {isReportsLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-surface-container rounded-lg" />
                  ))}
                </div>
              ) : isReportsError ? (
                <div className="p-6">
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertTitle>Failed to load recent scans</AlertTitle>
                    <AlertDescription className="text-xs">
                      {(reportsError as Error)?.message || "Could not retrieve cached telemetry."}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : reportsData && reportsData.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container text-on-surface-variant font-mono text-[11px] uppercase tracking-wider border-b border-surface-container-high/60">
                        <th className="py-3 px-4 font-semibold" scope="col">
                          Target (Defanged Monospace)
                        </th>
                        <th className="py-3 px-4 font-semibold" scope="col">
                          Verdict / Risk Assessment
                        </th>
                        <th className="py-3 px-4 font-semibold" scope="col">
                          Checks Summary
                        </th>
                        <th className="py-3 px-4 font-semibold" scope="col">
                          Timestamp
                        </th>
                        <th className="py-3 px-4 font-semibold text-right" scope="col">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/40 text-xs">
                      {reportsData.items.map((report) => {
                        const completedChecks = report.risk.checks_completed.length;
                        const failedChecks = report.risk.checks_failed.length;
                        const indicatorCount = report.indicators.length;
                        const isLowRisk = report.risk.classification === "low_risk";

                        return (
                          <tr
                            key={report.id}
                            className="hover:bg-surface-container/60 transition-colors"
                          >
                            {/* Target Column: Defanged, non-clickable plain text */}
                            <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-on-surface select-all truncate">
                                  {report.input_display}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyTarget(report.input_display, report.id)}
                                  className="text-on-surface-variant hover:text-primary transition-colors shrink-0 p-1 rounded hover:bg-surface-container-high"
                                  title="Copy defanged string"
                                  aria-label="Copy defanged target"
                                >
                                  {copiedId === report.id ? (
                                    <Check className="w-3.5 h-3.5 text-primary" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Verdict Column */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-0.5">
                                <RiskBadge
                                  classification={report.risk.classification}
                                  score={report.risk.score}
                                />
                                {isLowRisk && (
                                  <span className="text-[11px] text-on-surface-variant leading-tight mt-0.5 max-w-xs">
                                    No significant indicators found in the available checks.
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Checks Summary Column */}
                            <td className="py-3.5 px-4">
                              {indicatorCount > 0 ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-error font-medium">
                                  <AlertCircle className="w-3 h-3 text-error shrink-0" />
                                  {indicatorCount} Anomaly {indicatorCount === 1 ? "Warning" : "Warnings"}
                                </span>
                              ) : completedChecks > 0 && failedChecks === 0 ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary font-medium">
                                  <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                                  {completedChecks} Checks Passed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-on-surface-variant">
                                  {completedChecks} checks ({failedChecks} partial)
                                </span>
                              )}
                            </td>

                            {/* Timestamp Column */}
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-[11px] text-on-surface-variant">
                                {getRelativeTime(report.created_at)}
                              </span>
                            </td>

                            {/* Action Column */}
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                href={`/report/${report.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-primary hover:bg-surface-container font-medium text-xs transition-colors"
                              >
                                <span>View report</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-on-surface-variant font-mono">
                  No scan reports indexed yet. Enter a target above to start scanning.
                </div>
              )}

              {/* Pagination Bar */}
              {reportsData && reportsData.total > 0 && (
                <div className="px-4 py-3 bg-surface-container border-t border-surface-container-high/60 flex items-center justify-between text-on-surface-variant text-xs">
                  <span className="font-mono text-[11px]">
                    Displaying {Math.min(offset + 1, reportsData.total)} - {Math.min(offset + PAGE_SIZE, reportsData.total)} of {reportsData.total} items
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-mono text-[11px] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Prev
                    </button>
                    <span className="font-mono text-[11px] text-primary px-1.5 font-bold">
                      {String(currentPage + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                      disabled={currentPage + 1 >= totalPages}
                      className="px-2.5 py-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-mono text-[11px] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 py-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64 bg-surface-container" />
          <Skeleton className="h-64 w-full bg-surface-container-low rounded-xl" />
        </div>
      }
    >
      <ScanPageContent />
    </React.Suspense>
  );
}
