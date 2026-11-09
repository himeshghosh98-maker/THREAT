"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Search,
  Command,
  Menu,
  X,
  Radar,
  Network,
  ShieldCheck,
  FileText
} from "lucide-react";

function TopBarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { name: "Threat Scanner", href: "/", icon: Radar },
    { name: "Intelligence", href: "/intel", icon: Network },
    { name: "On-Chain Verify", href: "/verify", icon: ShieldCheck },
    { name: "Recent Scans", href: "/#recent-scans", icon: FileText }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(query)) {
      router.push(`/report/${query}`);
    } else {
      router.push(`/?q=${encodeURIComponent(query)}`);
    }
  };

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/75 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_24px_rgba(79,107,255,0.06)] transition-all">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4F6BFF] via-[#7C8CFF] to-[#5BC8FF] p-0.5 shadow-[0_8px_20px_rgba(79,107,255,0.35)] transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#4F6BFF]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg text-[#0B1B6B] tracking-tight group-hover:text-[#4F6BFF] transition-colors">
              TrustPulse
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#7C8CFF]">
              Digital Trust Intelligence
            </span>
          </div>
        </Link>

        {/* Center: Minimal Navigation with Blue Underline */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "text-[#4F6BFF]"
                    : "text-[#526085] hover:text-[#0B1B6B]"
                }`}
              >
                <span>{link.name}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#4F6BFF] rounded-full shadow-[0_2px_8px_rgba(79,107,255,0.6)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search Input + Status Badge + Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Glass Pill Search Input */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#D4E0F7] shadow-[0_2px_10px_rgba(79,107,255,0.06)] focus-within:border-[#4F6BFF] focus-within:ring-2 focus-within:ring-[#4F6BFF]/20 transition-all w-52 lg:w-72">
              <Search className="w-3.5 h-3.5 text-[#7C8CFF] shrink-0" />
              <input
                type="text"
                placeholder="Search target, domain, UUID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs text-[#0B1B6B] placeholder:text-[#94A3B8] w-full font-medium"
              />
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-[#7C8CFF] bg-[#EEF2FF] rounded border border-[#D4E0F7]">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>
          </form>

          {/* EVM Protocol Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#D4E0F7] text-[11px] font-semibold text-[#4F6BFF]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>On-Chain v1</span>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className="md:hidden p-2 rounded-xl text-[#0B1B6B] hover:bg-[#EEF2FF] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 bg-white/95 backdrop-blur-2xl border-b border-[#E4ECFD] shadow-xl space-y-2 animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#EEF2FF] text-[#4F6BFF]"
                    : "text-[#526085] hover:bg-[#F8FAFF]"
                }`}
              >
                <span>{link.name}</span>
                {active && <span className="w-2 h-2 rounded-full bg-[#4F6BFF]" />}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

export function TopBar() {
  return (
    <React.Suspense
      fallback={
        <header className="sticky top-0 z-40 w-full h-20 bg-white/75 backdrop-blur-xl border-b border-white/80" />
      }
    >
      <TopBarContent />
    </React.Suspense>
  );
}
