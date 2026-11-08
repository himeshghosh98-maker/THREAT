"use client";

import * as React from "react";
import { Indicator, Severity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpDown,
  Filter,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface EvidenceTabProps {
  indicators: Indicator[];
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

function getSeverityBadge(severity: Severity) {
  switch (severity) {
    case "critical":
      return (
        <Badge className="bg-error-container/80 text-error border-error-container gap-1 font-mono text-[10px] uppercase">
          <ShieldAlert className="w-3 h-3" /> Critical
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-red-950/80 text-red-400 border-red-700/60 gap-1 font-mono text-[10px] uppercase">
          <AlertCircle className="w-3 h-3" /> High
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-950/80 text-amber-300 border-amber-700/60 gap-1 font-mono text-[10px] uppercase">
          <AlertTriangle className="w-3 h-3" /> Medium
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/60 gap-1 font-mono text-[10px] uppercase">
          <CheckCircle2 className="w-3 h-3" /> Low
        </Badge>
      );
    case "info":
    default:
      return (
        <Badge className="bg-surface-container-high text-on-surface-variant border-outline-variant/30 gap-1 font-mono text-[10px] uppercase">
          <Info className="w-3 h-3" /> Info
        </Badge>
      );
  }
}

export function EvidenceTab({ indicators }: EvidenceTabProps) {
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [sortDirection, setSortDirection] = React.useState<"desc" | "asc">("desc");
  const [searchFilter, setSearchFilter] = React.useState<string>("");

  // Extract unique categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    indicators.forEach((i) => set.add(i.category));
    return Array.from(set).sort();
  }, [indicators]);

  // Filtered and sorted indicators
  const filteredIndicators = React.useMemo(() => {
    let result = [...indicators];

    if (selectedSeverity !== "all") {
      result = result.filter((i) => i.severity === selectedSeverity);
    }

    if (selectedCategory !== "all") {
      result = result.filter((i) => i.category === selectedCategory);
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.evidence.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const diff =
        (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0);
      return sortDirection === "desc" ? diff : -diff;
    });

    return result;
  }, [indicators, selectedSeverity, selectedCategory, searchFilter, sortDirection]);

  // Counts per severity
  const severityCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    indicators.forEach((i) => {
      if (counts[i.severity] !== undefined) {
        counts[i.severity]++;
      }
    });
    return counts;
  }, [indicators]);

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-4 space-y-4 shadow-md">
        {/* Severity Filter Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
              <Filter className="w-3.5 h-3.5 text-primary" /> Filter by Severity:
            </span>
            <button
              type="button"
              onClick={() =>
                setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>
                Sort: {sortDirection === "desc" ? "Highest First" : "Lowest First"}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSeverity("all")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                selectedSeverity === "all"
                  ? "bg-primary text-on-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              All ({indicators.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity("critical")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                selectedSeverity === "critical"
                  ? "bg-error-container text-error font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Critical ({severityCounts.critical})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity("high")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                selectedSeverity === "high"
                  ? "bg-red-950 text-red-300 font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              High ({severityCounts.high})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity("medium")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                selectedSeverity === "medium"
                  ? "bg-amber-950 text-amber-300 font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Medium ({severityCounts.medium})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity("low")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                selectedSeverity === "low"
                  ? "bg-emerald-950 text-emerald-300 font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Low ({severityCounts.low})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity("info")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                selectedSeverity === "info"
                  ? "bg-surface-container-highest text-on-surface font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Info ({severityCounts.info})
            </button>
          </div>
        </div>

        {/* Category Chips & Search Bar */}
        <div className="pt-3 border-t border-surface-container-high/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mr-1">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                selectedCategory === "all"
                  ? "bg-secondary/20 text-secondary border border-secondary/40 font-semibold"
                  : "bg-surface-container text-on-surface-variant border border-surface-container-high hover:bg-surface-container-high"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors capitalize ${
                  selectedCategory === cat
                    ? "bg-secondary/20 text-secondary border border-secondary/40 font-semibold"
                    : "bg-surface-container text-on-surface-variant border border-surface-container-high hover:bg-surface-container-high"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search evidence..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-8 pl-8 text-xs bg-surface-container border-surface-container-high text-on-surface"
            />
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="rounded-xl border border-surface-container-high bg-surface-container-low overflow-hidden shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-surface-container-high bg-surface-container/60 hover:bg-surface-container/60">
              <TableHead className="w-[120px] text-xs font-mono uppercase text-on-surface-variant">
                Severity
              </TableHead>
              <TableHead className="w-[140px] text-xs font-mono uppercase text-on-surface-variant">
                Category
              </TableHead>
              <TableHead className="text-xs font-mono uppercase text-on-surface-variant">
                Title & Monospace Evidence
              </TableHead>
              <TableHead className="w-[200px] text-xs font-mono uppercase text-on-surface-variant">
                Source
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIndicators.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="p-8 text-center text-xs text-on-surface-variant"
                >
                  No indicators match the selected criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredIndicators.map((ind, idx) => (
                <TableRow
                  key={ind.id || idx}
                  className="border-surface-container-high/60 hover:bg-surface-container/40 transition-colors"
                >
                  <TableCell className="align-top py-3">
                    {getSeverityBadge(ind.severity)}
                  </TableCell>

                  <TableCell className="align-top py-3">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant/30 capitalize inline-block">
                      {ind.category.replace("_", " ")}
                    </span>
                  </TableCell>

                  <TableCell className="align-top py-3 space-y-1.5">
                    <div className="text-sm font-semibold text-on-surface">
                      {ind.title}
                    </div>
                    {/* Monospace evidence string */}
                    <div className="p-2.5 rounded bg-surface-container-lowest border border-surface-container-high font-mono text-xs text-on-surface break-words leading-relaxed select-all">
                      {ind.evidence}
                    </div>
                  </TableCell>

                  <TableCell className="align-top py-3 text-xs font-mono text-on-surface-variant">
                    <span className="text-primary font-medium">{ind.source}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
