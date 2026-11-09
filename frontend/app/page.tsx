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
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Database,
  Cpu,
  Sparkles,
  ChevronRight,
  Plus
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

  const scannerRef = React.useRef<HTMLDivElement>(null);
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
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => {});
  };

  const scrollToScanner = () => {
    scannerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Compute real metrics from allReportsData
  const allItems = allReportsData?.items || [];
  const totalScans = allReportsData?.total ?? allItems.length;
  const flaggedCount = allItems.filter(
    (r) =>
      r.risk.classification === "suspicious" ||
      r.risk.classification === "high_risk" ||
      r.risk.classification === "confirmed_malicious"
  ).length;
  const onchainCount = allItems.filter(
    (r) => r.onchain.status === "published" || r.onchain.status === "validated"
  ).length;
  const lowRiskCount = allItems.filter((r) => r.risk.classification === "low_risk").length;

  const totalPages = Math.ceil((reportsData?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-16 lg:space-y-24 w-full">
      {/* ============================================================ */}
      {/* 1. HERO SECTION (Translucent 3D Graphic + Airy Clean Layout) */}
      {/* ============================================================ */}
      <section className="relative pt-6 sm:pt-10 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Heading, Subtitle, Gradient Pill CTA, Dots */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-sm text-xs font-semibold text-[#4F6BFF]">
              <Sparkles className="w-3.5 h-3.5 text-[#5BC8FF]" />
              <span className="tracking-wide">AI-Powered Web Threat & Digital Trust</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F1E4A] leading-[1.15]">
              Detect phishing lures, typosquats, & fraud with{" "}
              <span className="bg-gradient-to-r from-[#4F6BFF] via-[#7C8CFF] to-[#5BC8FF] bg-clip-text text-transparent">
                cryptographic trust
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#526085] max-w-xl font-normal leading-relaxed">
              Multi-source threat telemetry, contextual AI analysis, and immutable smart contract anchoring to protect your digital perimeter.
            </p>

            {/* Action Buttons & Indicator Dots */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-5">
              <button
                type="button"
                onClick={scrollToScanner}
                className="btn-pill-gradient group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-semibold text-white cursor-pointer"
              >
                <span>Start Threat Scan</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <Link
                href="/verify"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/70 hover:bg-white text-[#0F1E4A] border border-white/90 text-sm font-semibold shadow-[0_4px_16px_rgba(79,107,255,0.06)] hover:shadow-[0_8px_24px_rgba(79,107,255,0.12)] transition-all hover:-translate-y-0.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#4F6BFF]" />
                <span>Verify Proof On-Chain</span>
              </Link>
            </div>

            {/* Carousel Slider Indicator Dots */}
            <div className="flex items-center gap-2 pt-2">
              <span className="w-6 h-2 rounded-full bg-gradient-to-r from-[#4F6BFF] to-[#7C8CFF] transition-all" />
              <span className="w-2 h-2 rounded-full bg-[#D4E0F9]" />
              <span className="w-2 h-2 rounded-full bg-[#D4E0F9]" />
            </div>
          </div>

          {/* Right Column: Glossy 3D-Style Translucent Glass Graphic with Gentle Float */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <div className="w-full max-w-[380px] sm:max-w-[420px] aspect-square relative flex items-center justify-center animate-float-hero">
              {/* Back ambient radial glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#5BC8FF]/30 via-[#7C8CFF]/25 to-[#4F6BFF]/20 blur-2xl transform scale-90 pointer-events-none" />

              {/* 3D Isometric Isometric Graphic Composition */}
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full drop-shadow-[0_30px_60px_rgba(79,107,255,0.22)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Platform Base Gradients */}
                  <linearGradient id="platBase" x1="50" y1="280" x2="350" y2="340" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4F6BFF" />
                    <stop offset="50%" stopColor="#7C8CFF" />
                    <stop offset="100%" stopColor="#5BC8FF" />
                  </linearGradient>
                  <linearGradient id="platTop" x1="100" y1="240" x2="300" y2="280" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6C84FF" />
                    <stop offset="100%" stopColor="#8ED5FF" />
                  </linearGradient>

                  {/* Glass Middle Slab */}
                  <linearGradient id="glassSlab" x1="120" y1="180" x2="280" y2="220" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.35" />
                  </linearGradient>

                  {/* Translucent Floating Cloud Layer */}
                  <linearGradient id="cloudGrad" x1="140" y1="90" x2="260" y2="180" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E0F3FF" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#B3DCFF" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#7EA6FF" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Specular Highlight */}
                  <linearGradient id="shineGrad" x1="130" y1="100" x2="230" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Bottom Base Platform: Layer 1 */}
                <path
                  d="M200 360 L340 280 L200 210 L60 280 Z"
                  fill="url(#platBase)"
                  opacity="0.9"
                />
                <path
                  d="M60 280 L200 360 L200 375 L60 295 Z"
                  fill="#364BC9"
                  opacity="0.7"
                />
                <path
                  d="M340 280 L200 360 L200 375 L340 295 Z"
                  fill="#475AE0"
                  opacity="0.8"
                />

                {/* Middle Glass Platform: Layer 2 */}
                <path
                  d="M200 285 L320 220 L200 165 L80 220 Z"
                  fill="url(#platTop)"
                  opacity="0.85"
                />

                {/* Translucent Floating Crystal Slab: Layer 3 */}
                <path
                  d="M200 240 L300 185 L200 135 L100 185 Z"
                  fill="url(#glassSlab)"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeOpacity="0.8"
                />

                {/* Floating Translucent Cloud Graphic: Top Layer */}
                <g filter="drop-shadow(0 15px 25px rgba(79,107,255,0.25))">
                  {/* Cloud Silhouette */}
                  <path
                    d="M160 145 C145 145 130 135 130 120 C130 106 142 95 156 95 C160 80 178 70 200 70 C225 70 245 84 248 102 C258 103 268 111 268 122 C268 135 256 145 242 145 Z"
                    fill="url(#cloudGrad)"
                  />
                  {/* Cloud Specular Highlight */}
                  <path
                    d="M170 115 C162 115 155 109 155 100 C155 93 162 86 170 86 C173 78 185 73 198 73 C214 73 226 81 228 92 C234 93 240 98 240 105 C240 112 233 115 224 115 Z"
                    fill="url(#shineGrad)"
                  />
                </g>

                {/* Mini Decorative Floating Orbs */}
                <circle cx="280" cy="110" r="14" fill="#9B8CFF" opacity="0.8" />
                <circle cx="282" cy="108" r="5" fill="#FFFFFF" opacity="0.9" />

                <circle cx="120" cy="150" r="9" fill="#5BC8FF" opacity="0.75" />
                <circle cx="121" cy="148" r="3" fill="#FFFFFF" opacity="0.9" />

                <circle cx="295" cy="220" r="7" fill="#7C8CFF" opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. CONNECTED FEATURE CARDS (01 / 02 / 03 with + Connectors) */}
      {/* ============================================================ */}
      <section className="space-y-6">
        <div className="space-y-2 text-left max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold font-mono text-[#4F6BFF] uppercase tracking-wider">
            <span>[ Architecture Modules ]</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1E4A]">
            End-to-End Threat Intelligence & Cryptographic Proof
          </h2>
          <p className="text-sm text-[#526085]">
            Seamless orchestration from raw network ingestion to immutable ledger verification.
          </p>
        </div>

        {/* 3 Connected Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative items-stretch">
          {/* CARD 01 */}
          <div className="glass-card p-6 flex flex-col justify-between relative group hover:border-[#4F6BFF]/40">
            {/* Watermark 01 */}
            <div className="absolute top-4 right-5 text-4xl font-extrabold font-mono text-[#4F6BFF]/15 select-none group-hover:text-[#4F6BFF]/25 transition-colors">
              01
            </div>

            <div className="space-y-4">
              {/* Gradient Banner Accent */}
              <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-[#4F6BFF] to-[#5BC8FF]" />

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F6BFF]/15 to-[#5BC8FF]/20 flex items-center justify-center text-[#4F6BFF]">
                <Cpu className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono text-[#4F6BFF] uppercase tracking-wider font-semibold block">
                  Telemetric Engine
                </span>
                <h3 className="text-lg font-bold text-[#0F1E4A]">
                  Multi-Source Threat Intel
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-[#526085] leading-relaxed">
                Automated TLS certificate chain inspection, SSRF-safe DNS resolution, and correlated multi-engine threat database matching.
              </p>
            </div>

            <div className="pt-6 border-t border-[#E8EFFE]/80 mt-4 flex items-center justify-between text-xs text-[#526085]">
              <span className="font-mono text-[11px]">RFC-compliant defanging</span>
              <span className="text-[#4F6BFF] font-semibold">Active</span>
            </div>

            {/* Connecting + icon (desktop only, between card 1 and 2) */}
            <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white shadow-md border border-[#E2E8F8] items-center justify-center text-[#4F6BFF]">
              <Plus className="w-4 h-4" />
            </div>
          </div>

          {/* CARD 02 */}
          <div className="glass-card p-6 flex flex-col justify-between relative group hover:border-[#7C8CFF]/40">
            {/* Watermark 02 */}
            <div className="absolute top-4 right-5 text-4xl font-extrabold font-mono text-[#7C8CFF]/15 select-none group-hover:text-[#7C8CFF]/25 transition-colors">
              02
            </div>

            <div className="space-y-4">
              {/* Gradient Banner Accent */}
              <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-[#5BC8FF] to-[#7C8CFF]" />

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5BC8FF]/15 to-[#7C8CFF]/20 flex items-center justify-center text-[#7C8CFF]">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono text-[#7C8CFF] uppercase tracking-wider font-semibold block">
                  Heuristic Analysis
                </span>
                <h3 className="text-lg font-bold text-[#0F1E4A]">
                  AI Lure & Smishing Detection
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-[#526085] leading-relaxed">
                Contextual intent classification identifying brand impersonation, urgent financial hooks, and typosquatting vectors.
              </p>
            </div>

            <div className="pt-6 border-t border-[#E8EFFE]/80 mt-4 flex items-center justify-between text-xs text-[#526085]">
              <span className="font-mono text-[11px]">Strict verdict independence</span>
              <span className="text-[#7C8CFF] font-semibold">Enforced</span>
            </div>

            {/* Connecting + icon (desktop only, between card 2 and 3) */}
            <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white shadow-md border border-[#E2E8F8] items-center justify-center text-[#7C8CFF]">
              <Plus className="w-4 h-4" />
            </div>
          </div>

          {/* CARD 03 */}
          <div className="glass-card p-6 flex flex-col justify-between relative group hover:border-[#9B8CFF]/40">
            {/* Watermark 03 */}
            <div className="absolute top-4 right-5 text-4xl font-extrabold font-mono text-[#9B8CFF]/15 select-none group-hover:text-[#9B8CFF]/25 transition-colors">
              03
            </div>

            <div className="space-y-4">
              {/* Gradient Banner Accent */}
              <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-[#7C8CFF] to-[#9B8CFF]" />

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C8CFF]/15 to-[#9B8CFF]/20 flex items-center justify-center text-[#9B8CFF]">
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono text-[#9B8CFF] uppercase tracking-wider font-semibold block">
                  Trust Architecture
                </span>
                <h3 className="text-lg font-bold text-[#0F1E4A]">
                  Smart Contract Anchoring
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-[#526085] leading-relaxed">
                Canonical JSON hashes published to smart contracts, delivering tamper-evident historical verification with zero PII on-chain.
              </p>
            </div>

            <div className="pt-6 border-t border-[#E8EFFE]/80 mt-4 flex items-center justify-between text-xs text-[#526085]">
              <span className="font-mono text-[11px]">EVM Smart Contract</span>
              <span className="text-[#9B8CFF] font-semibold">Anchored</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. HERO SCANNER CARD (Translucent Glassmorphism Console)     */}
      {/* ============================================================ */}
      <section ref={scannerRef} id="scanner" className="w-full relative">
        <div className="glass-card p-6 sm:p-8 lg:p-9 space-y-6 rounded-3xl relative overflow-hidden">
          {/* Top soft accent glow bar */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4F6BFF] via-[#7C8CFF] to-[#5BC8FF] opacity-90" />

          {/* Header Row: Tabs & Defanging Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-[#F0F4FF]/80 rounded-full border border-white/90 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("url");
                  setUrlValidationError(null);
                  setMessageValidationError(null);
                }}
                disabled={isScanning}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "url"
                    ? "bg-white text-[#4F6BFF] shadow-[0_4px_12px_rgba(79,107,255,0.15)]"
                    : "text-[#526085] hover:text-[#0F1E4A]"
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
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "message"
                    ? "bg-white text-[#4F6BFF] shadow-[0_4px_12px_rgba(79,107,255,0.15)]"
                    : "text-[#526085] hover:text-[#0F1E4A]"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Message / Email</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-white/90 text-[#4F6BFF] font-mono text-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#4F6BFF] animate-pulse" />
                <span>Defanging: Active</span>
              </div>
            </div>
          </div>

          {/* Central Scanner Input */}
          {activeTab === "url" ? (
            <form onSubmit={handleUrlSubmit} className="space-y-3">
              <div className="relative flex flex-col sm:flex-row items-stretch gap-2 bg-white/90 rounded-full p-2 border border-white/95 shadow-[0_10px_30px_rgba(79,107,255,0.08)] focus-within:ring-2 focus-within:ring-[#4F6BFF]/40 transition-all">
                <div className="hidden sm:flex items-center pl-4 text-[#4F6BFF] select-none font-mono text-sm font-bold">
                  &gt;
                </div>
                <div className="relative flex-1 flex items-center min-w-0">
                  <input
                    type="text"
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="hxxps[://]domain[.]com/endpoint or suspicious target host..."
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlValidationError) setUrlValidationError(null);
                    }}
                    disabled={isScanning}
                    aria-label="Target Web Address or Domain"
                    aria-invalid={!!urlValidationError}
                    className="w-full bg-transparent border-0 outline-none px-3 py-2.5 font-mono text-xs sm:text-sm text-[#0F1E4A] placeholder:text-[#8896B8] font-normal tracking-wide selection:bg-[#4F6BFF]/20"
                  />
                </div>
                <div className="flex items-center gap-2 pr-1 self-end sm:self-auto shrink-0">
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput("")}
                      disabled={isScanning}
                      title="Clear input"
                      aria-label="Clear input"
                      className="p-2 rounded-full text-[#526085] hover:text-[#0F1E4A] hover:bg-[#F0F4FF] transition-colors cursor-pointer"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="btn-pill-gradient flex items-center justify-center gap-2 px-7 py-3 text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-60"
                  >
                    <Radar className="w-4 h-4" />
                    <span>{urlMutation.isPending ? "Analyzing..." : "Analyze Target"}</span>
                  </button>
                </div>
              </div>

              {urlValidationError && (
                <p role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1.5 pt-1 pl-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{urlValidationError}</span>
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleMessageSubmit} className="space-y-3">
              <div className="relative flex flex-col gap-2 bg-white/90 rounded-2xl p-4 border border-white/95 shadow-[0_10px_30px_rgba(79,107,255,0.08)] focus-within:ring-2 focus-within:ring-[#4F6BFF]/40 transition-all">
                <div className="flex items-center justify-between text-xs text-[#526085] pb-2 border-b border-[#E8EFFE]">
                  <span className="font-mono text-xs text-[#4F6BFF] font-medium flex items-center gap-1.5">
                    &gt; Message Body / Smishing Lure:
                  </span>
                  <span
                    aria-live="polite"
                    className={`font-mono text-xs ${
                      messageInput.length > MESSAGE_MAX_LENGTH
                        ? "text-rose-600 font-bold"
                        : messageInput.length > MESSAGE_MAX_LENGTH - 500
                        ? "text-amber-600 font-semibold"
                        : "text-[#526085]"
                    }`}
                  >
                    {messageInput.length.toLocaleString()} / {MESSAGE_MAX_LENGTH.toLocaleString()} characters
                  </span>
                </div>

                <textarea
                  rows={4}
                  placeholder="Paste suspicious SMS text, fraudulent account verification notice, or delivery customs fee lure here..."
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    if (messageValidationError) setMessageValidationError(null);
                  }}
                  disabled={isScanning}
                  aria-label="Message / Email text"
                  aria-invalid={!!messageValidationError}
                  className="w-full bg-transparent border-0 outline-none p-2 font-mono text-xs sm:text-sm text-[#0F1E4A] placeholder:text-[#8896B8] font-normal resize-none selection:bg-[#4F6BFF]/20"
                />

                <div className="flex items-center justify-between pt-2 border-t border-[#E8EFFE]">
                  {messageInput ? (
                    <button
                      type="button"
                      onClick={() => setMessageInput("")}
                      disabled={isScanning}
                      className="text-xs text-[#526085] hover:text-[#0F1E4A] transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  ) : <span />}
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="btn-pill-gradient flex items-center justify-center gap-2 px-7 py-2.5 text-white text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-60"
                  >
                    <Radar className="w-4 h-4" />
                    <span>{messageMutation.isPending ? "Analyzing..." : "Analyze Message"}</span>
                  </button>
                </div>
              </div>

              {messageValidationError && (
                <p role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1.5 pt-1 pl-3">
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
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8EFFE]">
            <span className="text-xs font-semibold text-[#526085] mr-1">
              Sample Targets:
            </span>
            <button
              type="button"
              onClick={() => handleSelectExample("typosquat")}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#526085] hover:text-[#0F1E4A] transition-all font-mono text-xs border border-white/90 shadow-xs hover:shadow-sm cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>paypa1-security-login[.]com</span>
              <span className="text-rose-600 font-sans font-medium text-[11px]">(Typosquat)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectExample("benign")}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#526085] hover:text-[#0F1E4A] transition-all font-mono text-xs border border-white/90 shadow-xs hover:shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>github[.]com</span>
              <span className="text-emerald-700 font-sans font-medium text-[11px]">(Low Risk)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectExample("sms")}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#526085] hover:text-[#0F1E4A] transition-all font-mono text-xs border border-white/90 shadow-xs hover:shadow-sm cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#4F6BFF] shrink-0" />
              <span>USPS Customs Fee Lure</span>
              <span className="text-[#4F6BFF] font-sans font-medium text-[11px]">(Scam SMS)</span>
            </button>
          </div>

          {/* Error Alert with Contract Shape & Retry */}
          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div>
                  <AlertTitle className="text-xs font-mono font-bold uppercase tracking-wider text-rose-700">
                    Scan Error [{apiError.code}]
                  </AlertTitle>
                  <AlertDescription className="text-xs text-rose-800 mt-0.5">
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
                  className="shrink-0 h-8 text-xs border-rose-300 bg-white hover:bg-rose-50 text-rose-700 gap-1.5 rounded-full"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Scan
                </Button>
              </div>
            </Alert>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. DEEP NAVY CONTRAST BAND WITH GLASS CAROUSEL               */}
      {/* ============================================================ */}
      <section className="deep-navy-band p-8 sm:p-12 lg:p-16 text-white space-y-10 relative overflow-hidden shadow-2xl">
        {/* Soft background ambient rings */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#5BC8FF]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#7C8CFF]/20 blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto relative z-10">
          <span className="inline-block text-xs font-mono font-semibold text-[#8EB5FF] uppercase tracking-widest">
            Cryptographic Integrity Platform
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Comprehensive Digital Trust Infrastructure
          </h2>
          <p className="text-sm text-[#A8C4FF] leading-relaxed">
            Multi-layered defense verifying threat indicators before they reach your end users.
          </p>
        </div>

        {/* Horizontal Carousel of Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10 pt-4">
          {/* Side Card 1 (Dimmed) */}
          <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-lg border border-white/15 opacity-75 hover:opacity-100 transition-all hover:scale-[1.02] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-[#5BC8FF]">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              Heuristic Correlation
            </h3>
            <p className="text-xs text-[#C5D7FF] leading-relaxed">
              Aggregated threat metrics, SSL fingerprinting, and automated WHOIS aging signals.
            </p>
            <div className="pt-2 text-xs font-mono text-[#8EB5FF] flex items-center gap-1">
              <span>Zero external leaks</span>
            </div>
          </div>

          {/* Center Card (Highlighted & Prominent) */}
          <div className="rounded-2xl p-7 bg-white/20 backdrop-blur-2xl border-2 border-white/40 shadow-[0_25px_60px_rgba(0,0,0,0.35)] scale-100 md:scale-105 z-10 space-y-5 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center text-white">
                <Lock className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-[#5BC8FF]/30 text-white border border-[#5BC8FF]/40 text-xs font-semibold">
                Core Standard
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                TrustRegistry Smart Contract
              </h3>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                Every scan report is deterministically normalized to canonical JSON and anchored on-chain with immutable cryptographic proofs.
              </p>
            </div>

            <Link
              href="/verify"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-white text-[#0B1B6B] hover:bg-white/95 font-semibold text-xs transition-all shadow-md cursor-pointer"
            >
              <span>Explore Cryptographic Registry</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Side Card 3 (Dimmed) */}
          <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-lg border border-white/15 opacity-75 hover:opacity-100 transition-all hover:scale-[1.02] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-[#5BC8FF]">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              Cluster Correlation
            </h3>
            <p className="text-xs text-[#C5D7FF] leading-relaxed">
              Detect campaign infrastructure reuse across IP ranges, nameservers, and cert hashes.
            </p>
            <div className="pt-2 text-xs font-mono text-[#8EB5FF] flex items-center gap-1">
              <span>Graph linkage indexing</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. REAL METRICS STRIP                                         */}
      {/* ============================================================ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-card p-5 sm:p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-[#526085] uppercase tracking-wider block font-medium">
              Total Scans
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0F1E4A] mt-1.5 block">
              {totalScans}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#4F6BFF]/10 flex items-center justify-center text-[#4F6BFF]">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-[#526085] uppercase tracking-wider block font-medium">
              Threats Flagged
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-600 mt-1.5 block">
              {flaggedCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-[#526085] uppercase tracking-wider block font-medium">
              Anchored On-Chain
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#4F6BFF] mt-1.5 block">
              {onchainCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#4F6BFF]/10 flex items-center justify-center text-[#4F6BFF]">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 sm:p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-[#526085] uppercase tracking-wider block font-medium">
              Low Risk evaluations
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 mt-1.5 block">
              {lowRiskCount}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. RECENT SCANS AUDIT LOG TABLE (Clean Glassmorphism Card)   */}
      {/* ============================================================ */}
      <section id="recent-scans" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F1E4A] tracking-tight">
              Recent Telemetry Scans
            </h2>
            <p className="text-xs font-mono text-[#526085] tracking-wider uppercase mt-1">
              Live Audit Log &amp; Heuristic Reports
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetchReports()}
            className="px-4 py-2 rounded-full text-[#526085] hover:text-[#0F1E4A] bg-white/80 hover:bg-white border border-white/90 shadow-xs hover:shadow-sm transition-all self-start sm:self-auto flex items-center gap-2 text-xs font-semibold cursor-pointer"
            title="Refresh reports"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4F6BFF]" />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Telemetry Table Card */}
        <div className="w-full glass-card-static rounded-3xl overflow-hidden">
          {isReportsLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-[#EBF1FF] rounded-xl" />
              ))}
            </div>
          ) : isReportsError ? (
            <div className="p-8">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4 text-rose-600" />
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
                  <tr className="bg-white/60 text-[#526085] font-mono text-[11px] uppercase tracking-wider border-b border-[#E8EFFE]">
                    <th className="py-4 px-6 font-semibold" scope="col">
                      Target (Defanged Monospace)
                    </th>
                    <th className="py-4 px-6 font-semibold" scope="col">
                      Risk Assessment
                    </th>
                    <th className="py-4 px-6 font-semibold" scope="col">
                      Checks Summary
                    </th>
                    <th className="py-4 px-6 font-semibold" scope="col">
                      Timestamp
                    </th>
                    <th className="py-4 px-6 font-semibold text-right" scope="col">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EFFE]/80 text-xs">
                  {reportsData.items.map((report) => {
                    const completedChecks = report.risk.checks_completed.length;
                    const failedChecks = report.risk.checks_failed.length;
                    const indicatorCount = report.indicators.length;
                    const isLowRisk = report.risk.classification === "low_risk";

                    return (
                      <tr
                        key={report.id}
                        className="hover:bg-white/70 transition-colors"
                      >
                        {/* Target Column: Defanged, non-clickable plain text */}
                        <td className="py-4 px-6 max-w-xs sm:max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-[#0F1E4A] font-medium select-all truncate">
                              {report.input_display}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyTarget(report.input_display, report.id)}
                              className="text-[#526085] hover:text-[#4F6BFF] transition-colors shrink-0 p-1.5 rounded-full hover:bg-white cursor-pointer"
                              title="Copy defanged string"
                              aria-label="Copy defanged target"
                            >
                              {copiedId === report.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Verdict Column */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <RiskBadge
                              classification={report.risk.classification}
                              score={report.risk.score}
                            />
                            {isLowRisk && (
                              <span className="text-[11px] text-[#526085] leading-tight max-w-xs">
                                No significant indicators found in available checks.
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Checks Summary Column */}
                        <td className="py-4 px-6">
                          {indicatorCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-rose-700 font-medium bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              {indicatorCount} Anomaly {indicatorCount === 1 ? "Warning" : "Warnings"}
                            </span>
                          ) : completedChecks > 0 && failedChecks === 0 ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              {completedChecks} Checks Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#526085] bg-white/60 px-2.5 py-1 rounded-full border border-[#E8EFFE]">
                              {completedChecks} checks ({failedChecks} partial)
                            </span>
                          )}
                        </td>

                        {/* Timestamp Column */}
                        <td className="py-4 px-6">
                          <span className="font-mono text-[11px] text-[#526085]">
                            {getRelativeTime(report.created_at)}
                          </span>
                        </td>

                        {/* Action Column */}
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/report/${report.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[#4F6BFF] hover:bg-[#F0F4FF] font-semibold text-xs transition-colors"
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
            <div className="p-12 text-center text-xs text-[#526085] font-mono">
              No scan reports indexed yet. Enter a target above to start scanning.
            </div>
          )}

          {/* Pagination Bar */}
          {reportsData && reportsData.total > 0 && (
            <div className="px-6 py-4 bg-white/50 border-t border-[#E8EFFE] flex items-center justify-between text-[#526085] text-xs">
              <span className="font-mono text-[11px]">
                Displaying {Math.min(offset + 1, reportsData.total)} - {Math.min(offset + PAGE_SIZE, reportsData.total)} of {reportsData.total} items
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3.5 py-1 rounded-full text-[#526085] hover:text-[#0F1E4A] hover:bg-white transition-colors font-mono text-[11px] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-[#E8EFFE]"
                >
                  Prev
                </button>
                <span className="font-mono text-xs text-[#4F6BFF] px-2 font-bold">
                  {String(currentPage + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                  disabled={currentPage + 1 >= totalPages}
                  className="px-3.5 py-1 rounded-full text-[#526085] hover:text-[#0F1E4A] hover:bg-white transition-colors font-mono text-[11px] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-[#E8EFFE]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ScanPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 py-8 max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 bg-white/70 rounded-full" />
          <Skeleton className="h-72 w-full bg-white/70 rounded-3xl" />
        </div>
      }
    >
      <ScanPageContent />
    </React.Suspense>
  );
}
