"use client";

import * as React from "react";
import Link from "next/link";
import { TopBar } from "./TopBar";
import {
  ShieldCheck,
  Info
} from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col antialiased relative selection:bg-[#4F6BFF]/20 selection:text-[#4F6BFF]">
      {/* Minimal Sticky Translucent Navbar with Blur */}
      <TopBar />

      {/* Floating Vertical Pill Button Fixed on Right Edge */}
      <Link
        href="/#scanner"
        className="floating-vertical-pill hidden lg:flex items-center gap-2 cursor-pointer"
        aria-label="Quick Target Analysis"
      >
        <span className="w-2 h-2 rounded-full bg-[#5BC8FF] animate-pulse" />
        <span>Scan Target</span>
      </Link>

      {/* Main Page Body (Generous whitespace, smooth feel) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {children}
      </main>

      {/* Modern Wavy Gradient Deep Navy Footer */}
      <footer className="relative mt-20 text-white overflow-hidden">
        {/* Wavy transition curve */}
        <div className="w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-12 sm:h-20 text-[#0B1B6B] preserve-3d"
          >
            <path
              d="M0 60 C 320 120, 600 0, 960 50 C 1200 85, 1360 40, 1440 60 L1440 120 L0 120 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Footer Deep Navy Content Area */}
        <div className="bg-[#0B1B6B] border-t border-white/10 px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Column 1: Brand & Safety Mission */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F6BFF] to-[#7C8CFF] flex items-center justify-center text-white shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  TrustPulse
                </span>
              </div>
              <p className="text-sm text-[#D5E2FF]/80 max-w-sm leading-relaxed">
                Autonomous threat detection platform combining multi-vector heuristic analysis with an on-chain registry for cryptographic auditability.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-[#5BC8FF] border border-white/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  Zero &quot;Safe&quot; Verdict Policy
                </span>
              </div>
            </div>

            {/* Column 2: Heuristic Detection */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C8CFF]">
                Detection Engine
              </h4>
              <ul className="space-y-2 text-sm text-[#D5E2FF]/70">
                <li>
                  <Link href="/#scanner" className="hover:text-white transition-colors">
                    Target URL Scanner
                  </Link>
                </li>
                <li>
                  <Link href="/#scanner" className="hover:text-white transition-colors">
                    SMS &amp; Lure Analyzer
                  </Link>
                </li>
                <li>
                  <Link href="/intel" className="hover:text-white transition-colors">
                    Shared Infrastructure Clusters
                  </Link>
                </li>
                <li>
                  <span className="text-[#D5E2FF]/40">SSRF-Protected Pinned DNS</span>
                </li>
              </ul>
            </div>

            {/* Column 3: Trust & Verification */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C8CFF]">
                Digital Trust
              </h4>
              <ul className="space-y-2 text-sm text-[#D5E2FF]/70">
                <li>
                  <Link href="/verify" className="hover:text-white transition-colors">
                    Smart Contract Verifier
                  </Link>
                </li>
                <li>
                  <Link href="/#recent-scans" className="hover:text-white transition-colors">
                    Live Telemetry Audit Log
                  </Link>
                </li>
                <li>
                  <span className="text-[#D5E2FF]/40">Zero-PII On-Chain Storage</span>
                </li>
                <li>
                  <span className="text-[#D5E2FF]/40">Canonical JSON Hashes</span>
                </li>
              </ul>
            </div>

            {/* Column 4: System Telemetry Status */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C8CFF]">
                Security Architecture
              </h4>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D5E2FF]/70">Defanging Engine</span>
                  <span className="text-[#10B981] font-mono text-[11px] font-semibold">ENFORCED</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D5E2FF]/70">AI Independence</span>
                  <span className="text-[#10B981] font-mono text-[11px] font-semibold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D5E2FF]/70">Ledger Registry</span>
                  <span className="text-[#5BC8FF] font-mono text-[11px] font-semibold">ON-CHAIN REGISTRY</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Disclaimers Strip */}
          <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#D5E2FF]/60">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#7C8CFF] shrink-0" />
              <span>
                Safety Disclaimer: A lack of flagged threat indicators does not guarantee a target is safe. All verdicts are probabilistic heuristic evaluations.
              </span>
            </div>
            <div className="flex items-center gap-4 text-[#D5E2FF]/50 shrink-0 font-mono text-[11px]">
              <span>TrustPulse Telemetry v1.0.0</span>
              <span>•</span>
              <span>Deterministic Heuristics</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
