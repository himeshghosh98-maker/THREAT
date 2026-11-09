"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { health } from "@/lib/api";
import {
  Radar,
  FileText,
  Network,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Wifi,
  X
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [engineStatus, setEngineStatus] = React.useState<"checking" | "online" | "offline">("checking");
  const [latencyMs, setLatencyMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      const t0 = performance.now();
      try {
        const res = await health();
        const t1 = performance.now();
        if (mounted) {
          if (res && res.status === "ok") {
            setEngineStatus("online");
            setLatencyMs(Math.round(t1 - t0));
          } else {
            setEngineStatus("offline");
            setLatencyMs(null);
          }
        }
      } catch {
        if (mounted) {
          setEngineStatus("offline");
          setLatencyMs(null);
        }
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: "Scan", href: "/", icon: Radar },
    { name: "Reports", href: "/#recent-scans", icon: FileText },
    { name: "Intelligence", href: "/intel", icon: Network },
    { name: "Verify", href: "/verify", icon: ShieldCheck },
  ];

  const handleNavClick = (href: string) => {
    onMobileClose();
    if (href === "/#recent-scans") {
      if (pathname === "/") {
        const el = document.getElementById("recent-scans");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Brand */}
      <div>
        <div className="p-4 flex items-center justify-between border-b border-surface-container-high/60">
          <Link
            href="/"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            {/* Inline SVG Shield-with-Pulse Icon */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-high shrink-0 shadow-inner">
              <svg
                className="w-5 h-5 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path
                  d="M9 12h2l1-2 2 4 1-2h2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm tracking-tight text-on-surface truncate">
                  TrustPulse
                </span>
                <span className="text-[11px] font-mono text-on-surface-variant truncate">
                  Threat Telemetry
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            aria-label="Close mobile navigation"
            className="lg:hidden p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/#recent-scans"
                ? false
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom System Status Card */}
      <div className="p-3 border-t border-surface-container-high/60">
        <div className="p-3 rounded-lg bg-surface-container border border-surface-container-high/50 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <Wifi className={`w-3.5 h-3.5 ${engineStatus === "online" ? "text-emerald-500" : engineStatus === "offline" ? "text-rose-500" : "text-amber-500"}`} />
              {!isCollapsed && (
                <span className="font-mono text-[11px]">
                  {engineStatus === "online" ? "Engine Online" : engineStatus === "offline" ? "Engine Offline" : "Checking..."}
                </span>
              )}
            </div>
            <span className={`w-2 h-2 rounded-full ${engineStatus === "online" ? "bg-emerald-500 animate-pulse" : engineStatus === "offline" ? "bg-rose-500" : "bg-amber-500"}`} />
          </div>

          {!isCollapsed && (
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] font-mono text-on-surface-variant">
                <span>{latencyMs !== null ? `${latencyMs}ms` : engineStatus === "online" ? "Online" : engineStatus === "offline" ? "Offline" : "Checking"}</span>
              </div>
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                className="text-on-surface-variant hover:text-on-surface transition-colors p-0.5 rounded hover:bg-surface-container-high"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {isCollapsed && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Expand sidebar"
                className="text-on-surface-variant hover:text-on-surface transition-colors p-0.5 rounded hover:bg-surface-container-high"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 h-full z-40 bg-surface-container-low border-r border-surface-container-high/60 transition-all duration-200 ${
          isCollapsed ? "w-16" : "w-72"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-surface-container-low border-r border-surface-container-high/80 shadow-2xl transition-transform duration-200 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
