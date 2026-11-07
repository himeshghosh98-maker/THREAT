"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Search, Network, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { name: "Scan", href: "/", icon: Search },
  { name: "Threat Intelligence", href: "/intel", icon: Network },
  { name: "Verify On-Chain", href: "/verify", icon: FileCheck },
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? "bg-zinc-800 text-cyan-300 border border-zinc-700/80 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Navbar() {
  const isMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-sm tracking-wide text-zinc-100 hover:text-cyan-400 transition-colors">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-cyan-950 border border-cyan-800/80 text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>WebThreat <span className="text-cyan-400">TrustAI</span></span>
          </Link>

          <React.Suspense fallback={<nav className="flex items-center gap-1 sm:gap-2" />}>
            <NavLinks />
          </React.Suspense>
        </div>

        <div className="flex items-center gap-3">
          {isMocks ? (
            <Badge className="bg-amber-950/70 text-amber-300 border-amber-800 text-[10px] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              MOCKS ACTIVE
            </Badge>
          ) : (
            <Badge className="bg-emerald-950/70 text-emerald-300 border-emerald-800 text-[10px] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE API
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
