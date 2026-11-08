"use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Info } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface soc-grid-bg flex flex-col antialiased">
      {/* Fixed Left Sidebar with Suspense boundary */}
      <React.Suspense
        fallback={
          <aside
            className={`hidden lg:block fixed left-0 top-0 h-full z-40 bg-surface-container-low border-r border-surface-container-high/60 ${
              isCollapsed ? "w-16" : "w-72"
            }`}
          />
        }
      >
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
      </React.Suspense>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          isCollapsed ? "lg:pl-16" : "lg:pl-72"
        }`}
      >
        {/* Fixed Top Bar with Suspense boundary */}
        <React.Suspense
          fallback={
            <header
              className={`fixed top-0 right-0 h-16 z-30 bg-surface/85 backdrop-blur-xl border-b border-surface-container-high/60 left-0 ${
                isCollapsed ? "lg:left-16" : "lg:left-72"
              }`}
            />
          }
        >
          <TopBar
            isSidebarCollapsed={isCollapsed}
            onOpenMobileSidebar={() => setIsMobileOpen(true)}
          />
        </React.Suspense>

        {/* Page Content */}
        <main className="flex-1 w-full pt-16 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Footer Line */}
        <footer className="w-full bg-surface-container-low/90 border-t border-surface-container-high/60 py-3.5 px-4 sm:px-6">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-surface-variant text-center sm:text-left">
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              <Info className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="font-normal">
                Results are based on available checks and are not a guarantee of safety.
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-on-surface-variant/80">
              <span>SECURE PIPELINE</span>
              <span>•</span>
              <span>STRICT CONTRACT v1</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
