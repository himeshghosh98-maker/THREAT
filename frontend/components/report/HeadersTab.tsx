"use client";

import * as React from "react";
import { SecurityHeaderIssue, Severity } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Info,
  ChevronDown,
  ChevronRight,
  FileCode,
  Wrench
} from "lucide-react";

interface HeadersTabProps {
  headers: SecurityHeaderIssue[];
}

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
          <Info className="w-3 h-3" /> Low
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

export function HeadersTab({ headers }: HeadersTabProps) {
  // Track expanded state of rows
  const [expandedRows, setExpandedRows] = React.useState<Record<number, boolean>>({
    0: true // default expand first row for instant discovery
  });

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const expandAll = () => {
    const next: Record<number, boolean> = {};
    headers.forEach((_, i) => (next[i] = true));
    setExpandedRows(next);
  };

  const collapseAll = () => {
    setExpandedRows({});
  };

  return (
    <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
      <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm font-semibold text-on-surface flex items-center gap-2">
          <FileCode className="w-4 h-4 text-primary" />
          <span>Security Headers Analysis ({headers.length} analyzed)</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-primary hover:underline font-mono"
          >
            Expand All
          </button>
          <span className="text-on-surface-variant text-xs">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-on-surface-variant hover:text-white font-mono"
          >
            Collapse All
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {headers.length === 0 ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            No specific security header vulnerabilities or misconfigurations discovered.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-surface-container-high bg-surface-container/60 hover:bg-surface-container/60">
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-[220px] text-xs font-mono uppercase text-on-surface-variant">
                  Security Issue
                </TableHead>
                <TableHead className="w-[120px] text-xs font-mono uppercase text-on-surface-variant">
                  Severity
                </TableHead>
                <TableHead className="text-xs font-mono uppercase text-on-surface-variant">
                  Summary & Impact
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((h, idx) => {
                const isExpanded = !!expandedRows[idx];

                return (
                  <React.Fragment key={idx}>
                    <TableRow
                      onClick={() => toggleRow(idx)}
                      className="border-surface-container-high/60 hover:bg-surface-container/40 transition-colors cursor-pointer select-none"
                    >
                      <TableCell className="py-3 px-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                        )}
                      </TableCell>

                      <TableCell className="py-3 font-semibold text-sm text-on-surface">
                        {h.issue}
                      </TableCell>

                      <TableCell className="py-3">
                        {getSeverityBadge(h.severity)}
                      </TableCell>

                      <TableCell className="py-3 text-xs text-on-surface-variant">
                        <span className="text-on-surface line-clamp-1">{h.impact}</span>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Row Details */}
                    {isExpanded && (
                      <TableRow className="border-surface-container-high/60 bg-surface-container/20">
                        <TableCell colSpan={4} className="p-4 pl-12 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {/* Evidence in monospace block */}
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold flex items-center gap-1">
                                <FileCode className="w-3.5 h-3.5 text-primary" /> Raw Header Evidence:
                              </span>
                              <div className="p-2.5 rounded-lg bg-surface-container-lowest font-mono text-xs text-primary break-all select-all border border-surface-container-high leading-relaxed">
                                {h.evidence}
                              </div>
                            </div>

                            {/* Impact Analysis */}
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Exploit Impact:
                              </span>
                              <div className="p-2.5 rounded-lg bg-surface-container border border-surface-container-high text-on-surface leading-relaxed">
                                {h.impact}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                            {/* Remediation */}
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold flex items-center gap-1">
                                <Wrench className="w-3.5 h-3.5 text-secondary" /> Recommended Remediation:
                              </span>
                              <div className="p-2.5 rounded-lg bg-secondary/5 border border-secondary/20 text-on-surface leading-relaxed">
                                {h.remediation}
                              </div>
                            </div>

                            {/* Limitations */}
                            {h.limitations && (
                              <div className="space-y-1">
                                <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold flex items-center gap-1">
                                  <Info className="w-3.5 h-3.5 text-on-surface-variant" /> Detection Limitations:
                                </span>
                                <div className="p-2.5 rounded-lg bg-surface-container border border-surface-container-high text-on-surface-variant leading-relaxed italic">
                                  {h.limitations}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
