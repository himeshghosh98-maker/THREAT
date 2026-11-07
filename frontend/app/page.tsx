"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scanUrl, scanMessage, listReports, ApiClientError } from "@/lib/api";
import { ScanReport } from "@/lib/types";
import { RiskBadge } from "@/components/RiskBadge";
import { StepProgress, DEFAULT_SCAN_STAGES } from "@/components/StepProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MessageSquare,
  AlertCircle,
  Shield,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

const URL_MAX_LENGTH = 2048;
const MESSAGE_MAX_LENGTH = 5000;

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

export default function ScanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<"url" | "message">("url");
  const [urlInput, setUrlInput] = React.useState("");
  const [messageInput, setMessageInput] = React.useState("");
  const [urlValidationError, setUrlValidationError] = React.useState<string | null>(null);
  const [messageValidationError, setMessageValidationError] = React.useState<string | null>(null);

  // Scan pipeline stage state
  const [currentStageIndex, setCurrentStageIndex] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [apiError, setApiError] = React.useState<{ code: string; message: string; lastAction: () => void } | null>(null);

  // Timer reference for the staged progress animation
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

    // Stage 0: Submit (immediate)
    // Stage 1: Investigate (~450ms)
    // Stage 2: Analyse (~950ms)
    // Stage 3: Assess Risk (~1500ms)
    // Stage 4: Report (~2000ms)
    const delays = [450, 950, 1500, 2000];
    delays.forEach((delay, idx) => {
      const timer = setTimeout(() => {
        setCurrentStageIndex(idx + 1);
      }, delay);
      timerRef.current.push(timer);
    });
  };

  // Recent scans query (limit 5)
  const {
    data: reportsData,
    isLoading: isReportsLoading,
    isError: isReportsError,
    error: reportsError,
    refetch: refetchReports
  } = useQuery({
    queryKey: ["reports", "recent-5"],
    queryFn: () => listReports({ limit: 5, offset: 0 })
  });

  // URL Scan mutation
  const urlMutation = useMutation({
    mutationFn: (url: string) => scanUrl(url),
    onSuccess: (report: ScanReport) => {
      clearProgressTimers();
      setCurrentStageIndex(DEFAULT_SCAN_STAGES.length - 1);
      setIsCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      // Brief pause to allow user to see 100% completion before navigating
      setTimeout(() => {
        router.push(`/report/${report.id}`);
      }, 400);
    },
    onError: (err: unknown) => {
      clearProgressTimers();
      const code = err instanceof ApiClientError ? err.code : "SCAN_ERROR";
      const message = err instanceof Error ? err.message : "Failed to analyze URL. Please check network connectivity.";
      setApiError({
        code,
        message,
        lastAction: () => urlMutation.mutate(urlInput.trim())
      });
    }
  });

  // Message Scan mutation
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
  const handleSelectExample = (
    type: "typosquat" | "benign" | "sms"
  ) => {
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
        "[USPS Alert]: Your package #94001118982 cannot be delivered due to an unpaid $1.99 customs fee. Update your address at hxxp://usps-redelivery-portal[.]info/fee within 24 hours or your parcel will be returned."
      );
    }
  };

  return (
    <div className="space-y-8 py-2 max-w-4xl mx-auto w-full">
      {/* 1. Hero Purpose Statement */}
      <div className="space-y-2 text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/70 border border-cyan-800 text-cyan-300">
          <Shield className="w-3.5 h-3.5" />
          Web Threat Intelligence Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          Detect phishing links, typosquats, and social engineering lures with cryptographic trust.
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto">
          Deep heuristic deconstruction of URLs, TLS chains, and smishing text backed by immutable on-chain verification.
        </p>
      </div>

      {/* 5. Three "Try an example" Chips */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
        <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Try an example:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectExample("typosquat")}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-full bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Typosquat URL (paypa1-secure-login)
          </button>
          <button
            type="button"
            onClick={() => handleSelectExample("benign")}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-full bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Benign URL (github.com)
          </button>
          <button
            type="button"
            onClick={() => handleSelectExample("sms")}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-full bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 text-xs font-medium transition-colors disabled:opacity-50"
          >
            Scam SMS (USPS parcel fee lure)
          </button>
        </div>
      </div>

      {/* Main Form Card with Two Tabs */}
      <Card className="border-zinc-800 bg-zinc-900/70 shadow-xl backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Threat Analysis Console
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Choose whether to inspect a target web address or deconstruct raw communication text.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as "url" | "message");
              setUrlValidationError(null);
              setMessageValidationError(null);
              setApiError(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-zinc-950 border border-zinc-800">
              <TabsTrigger
                value="url"
                disabled={isScanning}
                className="text-xs gap-1.5 focus-visible:ring-1 focus-visible:ring-cyan-500"
              >
                <Search className="w-3.5 h-3.5" /> URL / Domain
              </TabsTrigger>
              <TabsTrigger
                value="message"
                disabled={isScanning}
                className="text-xs gap-1.5 focus-visible:ring-1 focus-visible:ring-cyan-500"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message / Email
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: URL / Domain */}
            <TabsContent value="url" className="space-y-3">
              <form onSubmit={handleUrlSubmit} className="space-y-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="url-input"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    Target Web Address or Hostname:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="url-input"
                      type="text"
                      placeholder="e.g. https://paypa1-security-login.com/verify or target domain..."
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (urlValidationError) setUrlValidationError(null);
                      }}
                      disabled={isScanning}
                      aria-invalid={!!urlValidationError}
                      aria-describedby={urlValidationError ? "url-error" : undefined}
                      className="font-mono text-xs h-10 bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-500"
                    />
                    <Button
                      type="submit"
                      disabled={isScanning}
                      className="sm:w-32 h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shrink-0 transition-colors"
                    >
                      {urlMutation.isPending ? "Analyzing..." : "Analyze"}
                    </Button>
                  </div>
                </div>

                {/* Inline URL Validation Error */}
                {urlValidationError && (
                  <p
                    id="url-error"
                    role="alert"
                    className="text-xs text-red-400 font-medium flex items-center gap-1 pt-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{urlValidationError}</span>
                  </p>
                )}
              </form>
            </TabsContent>

            {/* Tab 2: Message / Email */}
            <TabsContent value="message" className="space-y-3">
              <form onSubmit={handleMessageSubmit} className="space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="message-input"
                      className="font-medium text-zinc-300"
                    >
                      Communication Text / Smishing Lure:
                    </label>
                    {/* Live Character Counter */}
                    <span
                      className={`font-mono text-[11px] ${
                        messageInput.length > MESSAGE_MAX_LENGTH
                          ? "text-red-400 font-bold"
                          : messageInput.length > MESSAGE_MAX_LENGTH - 500
                          ? "text-amber-400"
                          : "text-zinc-500"
                      }`}
                      aria-live="polite"
                    >
                      {messageInput.length.toLocaleString()} / {MESSAGE_MAX_LENGTH.toLocaleString()} characters
                    </span>
                  </div>

                  <Textarea
                    id="message-input"
                    rows={4}
                    placeholder="Paste full text of suspicious SMS, fraudulent KYC notification, or delivery fee notice here..."
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      if (messageValidationError) setMessageValidationError(null);
                    }}
                    disabled={isScanning}
                    aria-invalid={!!messageValidationError}
                    aria-describedby={messageValidationError ? "message-error" : undefined}
                    className="font-mono text-xs bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none focus-visible:border-cyan-500"
                  />
                </div>

                {/* Inline Message Validation Error */}
                {messageValidationError && (
                  <p
                    id="message-error"
                    role="alert"
                    className="text-xs text-red-400 font-medium flex items-center gap-1 pt-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{messageValidationError}</span>
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={isScanning}
                    className="w-full sm:w-32 h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shrink-0 transition-colors"
                  >
                    {messageMutation.isPending ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {/* 3. StepProgress Animated Pipeline Display while scanning */}
          {isScanning && (
            <div className="pt-2">
              <StepProgress
                currentStageIndex={currentStageIndex}
                isCompleted={isCompleted}
                isError={!!apiError}
              />
            </div>
          )}

          {/* 6. API Error Alert with Contract Shape and Retry Button */}
          {apiError && (
            <Alert variant="destructive" className="mt-3 bg-red-950/40 border-red-800 text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div>
                  <AlertTitle className="text-xs font-mono font-bold uppercase tracking-wider text-red-300">
                    Error [{apiError.code}]
                  </AlertTitle>
                  <AlertDescription className="text-xs text-red-200 mt-0.5">
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
                  className="shrink-0 h-8 text-xs border-red-700 bg-red-900/40 text-red-100 hover:bg-red-800 gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 4. Recent Scans List (limit 5) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Recent Scans
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            Showing latest 5 reports
          </span>
        </div>

        {isReportsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <Skeleton key={idx} className="h-16 w-full rounded-lg bg-zinc-900/80" />
            ))}
          </div>
        ) : isReportsError ? (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <div className="flex items-center justify-between w-full">
              <div>
                <AlertTitle className="text-xs">Failed to load recent scans</AlertTitle>
                <AlertDescription className="text-xs">
                  {(reportsError as Error)?.message || "Could not retrieve scan reports."}
                </AlertDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchReports()}
                className="h-7 text-xs border-zinc-700"
              >
                Retry
              </Button>
            </div>
          </Alert>
        ) : reportsData && reportsData.items.length > 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/80 overflow-hidden shadow-sm">
            {reportsData.items.slice(0, 5).map((report) => (
              <div
                key={report.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-zinc-800/30 transition-colors gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge
                      classification={report.risk.classification}
                      score={report.risk.score}
                    />
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                      {report.input_type}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {getRelativeTime(report.created_at)}
                    </span>
                  </div>

                  {/* Defanged Scanned Input Display - non-clickable plain text */}
                  <div className="font-mono text-xs text-zinc-200 truncate select-all">
                    {report.input_display}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Link href={`/report/${report.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 border-zinc-700 hover:border-zinc-500 text-zinc-200"
                    >
                      <span>View Report</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-xs text-zinc-500">
            No recent scans recorded yet. Enter a target above to start scanning.
          </div>
        )}
      </div>
    </div>
  );
}
