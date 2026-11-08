"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Shield,
  Bell,
  User,
  Command
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  isSidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
}

export function TopBar({
  isSidebarCollapsed,
  onOpenMobileSidebar,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
  const [searchQuery, setSearchQuery] = React.useState("");

  const getBreadcrumb = () => {
    if (pathname === "/") return "Active Workspace / Threat Scanner";
    if (pathname.startsWith("/report")) return "Threat Report / Forensic Audit";
    if (pathname.startsWith("/intel")) return "Threat Intelligence / Correlation Graph";
    if (pathname.startsWith("/verify")) return "Trust Protocol / On-Chain Audit";
    return "Console / Active Workspace";
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    // If it looks like a UUID, route to /verify or /report
    if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(query)) {
      router.push(`/report/${query}`);
    } else {
      router.push(`/?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-30 bg-surface/85 backdrop-blur-xl border-b border-surface-container-high/60 flex items-center justify-between px-4 sm:px-6 transition-all duration-200 left-0 ${
        isSidebarCollapsed ? "lg:left-16" : "lg:left-72"
      }`}
    >
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span className="text-on-surface-variant hidden sm:inline">Console</span>
          <span className="text-outline-variant hidden sm:inline">/</span>
          <span className="text-on-surface font-semibold truncate max-w-[200px] sm:max-w-none">
            {getBreadcrumb()}
          </span>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search Field with ⌘K */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative hidden md:flex items-center"
        >
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg w-64 lg:w-80 border border-surface-container-high/60 focus-within:border-primary/60 transition-colors">
            <Search className="w-4 h-4 text-on-surface-variant shrink-0" />
            <input
              type="text"
              placeholder="Defanged URL, IP, UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs font-mono text-on-surface placeholder:text-outline/70 w-full"
            />
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container-high font-mono text-[10px] text-on-surface-variant">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>
        </form>

        {/* Status Pill */}
        {isMocks ? (
          <Badge className="bg-surface-container text-primary border-primary/30 font-mono text-[10px] uppercase gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="hidden sm:inline">Mocks Active</span>
            <span className="sm:hidden">Mocks</span>
          </Badge>
        ) : (
          <Badge className="bg-surface-container text-emerald-400 border-emerald-500/30 font-mono text-[10px] uppercase gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">Live Engine</span>
            <span className="sm:hidden">Live</span>
          </Badge>
        )}

        {/* Notifications & Avatar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="System notifications"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>

          <div
            className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-xs font-semibold"
            title="Active Analyst Session"
          >
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </header>
  );
}
