import * as React from "react";
import { SecurityHeaderIssue } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface HeadersTableProps {
  headers: SecurityHeaderIssue[];
}

export function HeadersTable({ headers }: HeadersTableProps) {
  if (!headers || headers.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-400">
        No specific header vulnerabilities or misconfigurations discovered.
      </div>
    );
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return <Badge className="bg-red-950 text-red-300 border-red-800 text-[10px]">CRITICAL</Badge>;
      case "high":
        return <Badge className="bg-red-900/50 text-red-400 border-red-700 text-[10px]">HIGH</Badge>;
      case "medium":
        return <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px]">MEDIUM</Badge>;
      default:
        return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">INFO</Badge>;
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            <TableHead className="w-[200px]">Security Issue</TableHead>
            <TableHead className="w-[100px]">Severity</TableHead>
            <TableHead>Impact & Evidence</TableHead>
            <TableHead className="w-[260px]">Remediation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {headers.map((h, i) => (
            <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/30">
              <TableCell className="font-medium text-zinc-200 align-top">
                {h.issue}
              </TableCell>
              <TableCell className="align-top">
                {getSeverityBadge(h.severity)}
              </TableCell>
              <TableCell className="text-xs space-y-1 align-top">
                <div className="text-zinc-300">{h.impact}</div>
                <div className="font-mono text-[11px] text-zinc-500 bg-zinc-950/80 p-1.5 rounded border border-zinc-800">
                  {h.evidence}
                </div>
              </TableCell>
              <TableCell className="text-xs text-zinc-400 align-top">
                <div className="text-zinc-300">{h.remediation}</div>
                {h.limitations && (
                  <div className="text-[11px] text-zinc-500 mt-1 italic">
                    Note: {h.limitations}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
