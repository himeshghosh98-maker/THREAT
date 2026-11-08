"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCorrelations, listReports } from "@/lib/api";
import { Cluster, ClusterIndicatorType } from "@/lib/types";
import { RiskBadge } from "@/components/RiskBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Network,
  AlertCircle,
  Server,
  Globe,
  ShieldAlert,
  Hash,
  ArrowRight,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
  Share2,
  Layers
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Indicator Type Badge Helper
function getIndicatorTypeBadge(type: ClusterIndicatorType) {
  switch (type) {
    case "ip":
      return (
        <Badge className="bg-red-950/80 text-red-300 border-red-800 font-mono text-[10px] uppercase gap-1">
          <Server className="w-3 h-3" /> Shared IP
        </Badge>
      );
    case "redirect_target":
      return (
        <Badge className="bg-amber-950/80 text-amber-300 border-amber-800 font-mono text-[10px] uppercase gap-1">
          <Globe className="w-3 h-3" /> Redirect Target
        </Badge>
      );
    case "cert_fingerprint":
      return (
        <Badge className="bg-cyan-950/80 text-cyan-300 border-cyan-800 font-mono text-[10px] uppercase gap-1">
          <ShieldAlert className="w-3 h-3" /> Cert Fingerprint
        </Badge>
      );
    case "phone":
      return (
        <Badge className="bg-purple-950/80 text-purple-300 border-purple-800 font-mono text-[10px] uppercase gap-1">
          <Hash className="w-3 h-3" /> Shared Phone
        </Badge>
      );
    case "email":
      return (
        <Badge className="bg-blue-950/80 text-blue-300 border-blue-800 font-mono text-[10px] uppercase gap-1">
          <Hash className="w-3 h-3" /> Shared Email
        </Badge>
      );
    case "registrar":
    default:
      return (
        <Badge className="bg-surface-container-high text-on-surface-variant border-outline-variant/30 font-mono text-[10px] uppercase gap-1">
          <Hash className="w-3 h-3" /> {type}
        </Badge>
      );
  }
}

// Lightweight SVG Cluster Node Diagram (Zero External Libraries)
function ClusterNodeDiagram({ cluster }: { cluster: Cluster }) {
  const reports = cluster.report_ids;
  const width = 340;
  const height = 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 62;

  return (
    <div className="w-full h-44 rounded-xl bg-surface-container-lowest border border-surface-container-high p-2 flex items-center justify-center overflow-hidden relative shadow-inner">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full select-none"
        aria-label={`Correlation graph diagram for cluster ${cluster.id}`}
      >
        <defs>
          <radialGradient id={`glow-${cluster.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4fdbc8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4fdbc8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Glow */}
        <circle cx={centerX} cy={centerY} r="45" fill={`url(#glow-${cluster.id})`} />

        {/* Edges from Center to Leaf Nodes */}
        {reports.map((repId, idx) => {
          const total = reports.length;
          const angle = (idx * (2 * Math.PI)) / total - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          return (
            <g key={repId}>
              <line
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="#3c4947"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Leaf Circle */}
              <circle
                cx={x}
                cy={y}
                r="12"
                fill="#161b29"
                stroke="#4fdbc8"
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={y + 3.5}
                textAnchor="middle"
                fontSize="8"
                fontFamily="var(--font-mono)"
                fill="#dee2f5"
                fontWeight="bold"
              >
                R{idx + 1}
              </text>
            </g>
          );
        })}

        {/* Center Node: Shared Indicator Hub */}
        <circle
          cx={centerX}
          cy={centerY}
          r="20"
          fill="#1a1f2d"
          stroke="#5de6ff"
          strokeWidth="2"
        />
        <text
          x={centerX}
          y={centerY - 2}
          textAnchor="middle"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fill="#5de6ff"
          fontWeight="bold"
        >
          HUB
        </text>
        <text
          x={centerX}
          y={centerY + 8}
          textAnchor="middle"
          fontSize="7"
          fontFamily="var(--font-mono)"
          fill="#bbcac6"
        >
          {cluster.indicator_type.slice(0, 5)}
        </text>
      </svg>
      <div className="absolute bottom-1 right-2 text-[9px] font-mono text-on-surface-variant/60">
        Radial Graph View
      </div>
    </div>
  );
}

export default function ThreatIntelPage() {
  const router = useRouter();

  // 1. Fetch All Reports for Global Real Statistics
  const { data: allReportsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["reports", "stats"],
    queryFn: () => listReports({ limit: 100 })
  });

  // 2. Fetch Correlated Clusters
  const {
    data: correlationsData,
    isLoading: isLoadingClusters,
    isError: isClustersError,
    error: clustersError
  } = useQuery({
    queryKey: ["intel", "correlations"],
    queryFn: () => getCorrelations()
  });

  // 3. Table Filters, Pagination and Sorting State
  const [riskFilter, setRiskFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<"date" | "score">("date");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");
  const [page, setPage] = React.useState<number>(1);
  const pageSize = 5;

  // 4. Expanded cluster cards tracking
  const [expandedClusters, setExpandedClusters] = React.useState<Record<string, boolean>>({});

  const toggleClusterExpand = (clusterId: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterId]: !prev[clusterId]
    }));
  };

  // Real statistics computation
  const stats = React.useMemo(() => {
    const items = allReportsData?.items || [];
    const totalReports = allReportsData?.total ?? items.length;
    const suspiciousOrHigher = items.filter(
      (r) =>
        r.risk.classification === "suspicious" ||
        r.risk.classification === "high_risk" ||
        r.risk.classification === "confirmed_malicious"
    ).length;
    const publishedOnchain = items.filter(
      (r) => r.onchain.status !== "not_published"
    ).length;
    const totalClusters = correlationsData?.clusters.length ?? 0;

    return {
      totalReports,
      suspiciousOrHigher,
      publishedOnchain,
      totalClusters
    };
  }, [allReportsData, correlationsData]);

  // Filtered, Sorted and Paginated Reports Table Data
  const { paginatedItems, totalFiltered, totalPages } = React.useMemo(() => {
    let list = [...(allReportsData?.items || [])];

    // Filter by risk
    if (riskFilter !== "all") {
      list = list.filter((r) => r.risk.classification === riskFilter);
    }

    // Filter by defanged target search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.input_display.toLowerCase().includes(q) ||
          (r.domain && r.domain.toLowerCase().includes(q)) ||
          r.id.toLowerCase().includes(q)
      );
    }

    // Sort by date or score
    list.sort((a, b) => {
      if (sortBy === "score") {
        const diff = a.risk.score - b.risk.score;
        return sortOrder === "desc" ? -diff : diff;
      } else {
        const diff =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortOrder === "desc" ? -diff : diff;
      }
    });

    const totalFiltered = list.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const offset = (page - 1) * pageSize;
    const paginatedItems = list.slice(offset, offset + pageSize);

    return { paginatedItems, totalFiltered, totalPages };
  }, [allReportsData, riskFilter, searchQuery, sortBy, sortOrder, page, pageSize]);

  return (
    <div className="space-y-8 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              Threat Intelligence & Campaign Infrastructure
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
            Multi-target correlation nexus identifying shared bulletproof IPs, redirect funnels, and SSL infrastructure linking disparate phishing attacks and smishing campaigns.
          </p>
        </div>

        <a href="#reports">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 bg-surface-container border-surface-container-high text-on-surface hover:bg-surface-container-high shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-secondary" />
            <span>Jump to Reports Table</span>
          </Button>
        </a>
      </div>

      {/* 1. Real Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Reports */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                Total Scanned Reports
              </span>
              <div className="text-2xl font-bold font-mono text-on-surface">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 bg-surface-container" />
                ) : (
                  stats.totalReports
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Full forensic audit trail
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Stat 2: Suspicious or Higher */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                Suspicious or Higher
              </span>
              <div className="text-2xl font-bold font-mono text-red-400">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 bg-surface-container" />
                ) : (
                  stats.suspiciousOrHigher
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Heuristic & intel confirmed
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-950/40 text-red-400 border border-red-500/30 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Stat 3: Published On-Chain */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                Published On-Chain
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 bg-surface-container" />
                ) : (
                  stats.publishedOnchain
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Arbitrum Sepolia anchored
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Stat 4: Active Clusters */}
        <Card className="border-surface-container-high bg-surface-container-low shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
                Correlated Clusters
              </span>
              <div className="text-2xl font-bold font-mono text-secondary">
                {isLoadingClusters ? (
                  <Skeleton className="h-8 w-16 bg-surface-container" />
                ) : (
                  stats.totalClusters
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Deterministic infrastructure links
              </p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Correlated Campaigns Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <span>Correlated Infrastructure Campaigns</span>
            </h2>
            {/* Required exact label */}
            <p className="text-xs text-primary/80 font-mono mt-0.5">
              AI-assisted summary; links are determined by deterministic matching.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-outline-variant/40 w-fit">
            Graph Telemetry
          </Badge>
        </div>

        {/* Cluster Cards Grid */}
        {isLoadingClusters ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-72 w-full bg-surface-container" />
            <Skeleton className="h-72 w-full bg-surface-container" />
          </div>
        ) : isClustersError ? (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Cluster Telemetry Offline</AlertTitle>
            <AlertDescription className="text-xs">
              {(clustersError as Error)?.message || "Failed to load infrastructure clusters."}
            </AlertDescription>
          </Alert>
        ) : correlationsData?.clusters && correlationsData.clusters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {correlationsData.clusters.map((cluster) => {
              const isExpanded = !!expandedClusters[cluster.id];

              return (
                <Card
                  key={cluster.id}
                  className="border-surface-container-high bg-surface-container-low shadow-lg flex flex-col justify-between hover:border-surface-container-highest transition-colors"
                >
                  <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-on-surface-variant font-semibold">
                        Cluster ID: {cluster.id}
                      </span>
                      {getIndicatorTypeBadge(cluster.indicator_type)}
                    </div>

                    {/* Shared Indicator (Strictly Plain Text, Never Clickable) */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider">
                        Shared Nexus Indicator (Plain Text):
                      </span>
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest font-mono text-xs sm:text-sm text-primary break-all select-all border border-surface-container-high">
                        {cluster.shared_indicator}
                      </div>
                    </div>

                    {/* AI-Assisted Summary */}
                    <p className="text-xs text-on-surface leading-relaxed pt-1">
                      {cluster.summary}
                    </p>
                  </CardHeader>

                  <CardContent className="p-5 pt-3 space-y-3">
                    {/* Lightweight SVG Node Diagram */}
                    <ClusterNodeDiagram cluster={cluster} />

                    {/* Expandable Linked Reports */}
                    <div className="pt-2 border-t border-surface-container-high/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-on-surface-variant">
                          Linked Threat Reports:{" "}
                          <strong className="text-on-surface">
                            {cluster.report_ids.length} cases
                          </strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleClusterExpand(cluster.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                        >
                          <span>{isExpanded ? "Hide Reports" : "View Linked Reports"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Report List */}
                      {isExpanded && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in-50">
                          {cluster.report_ids.map((repId, idx) => (
                            <div
                              key={repId}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container border border-surface-container-high text-xs font-mono"
                            >
                              <div className="flex items-center gap-2 truncate mr-2">
                                <span className="text-[10px] text-on-surface-variant font-bold">
                                  #{idx + 1}
                                </span>
                                <span className="text-on-surface truncate">
                                  {repId}
                                </span>
                              </div>
                              <Link href={`/report/${repId}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-primary hover:text-white hover:bg-primary/20 shrink-0 font-mono gap-1"
                                >
                                  <span>Inspect</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-10 text-center text-xs text-on-surface-variant">
            No correlated campaign clusters currently detected.
          </div>
        )}
      </div>

      {/* 3. Reports Table Section (Anchor id="reports") */}
      <div id="reports" className="space-y-4 pt-4 border-t border-surface-container-high/60 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Scanned Telemetry Reports Directory</span>
            </h2>
            <p className="text-xs text-on-surface-variant">
              Interactive historical scan registry. Click any case row to inspect full technical diagnostics.
            </p>
          </div>
          <span className="text-xs font-mono text-on-surface-variant">
            Showing {totalFiltered} matching reports
          </span>
        </div>

        {/* Table Filters & Search Toolbar */}
        <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-4 space-y-3 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Risk Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mr-1">
                Risk Filter:
              </span>
              {(
                [
                  "all",
                  "low_risk",
                  "suspicious",
                  "high_risk",
                  "confirmed_malicious",
                  "inconclusive"
                ] as const
              ).map((risk) => (
                <button
                  key={risk}
                  type="button"
                  onClick={() => {
                    setRiskFilter(risk);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-colors ${
                    riskFilter === risk
                      ? "bg-primary text-on-primary font-semibold shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {risk === "all" ? "All" : risk.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
              <span>Sort by:</span>
              <button
                type="button"
                onClick={() => {
                  setSortBy((prev) => (prev === "date" ? "score" : "date"));
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1 border border-surface-container-high"
              >
                <span>{sortBy === "date" ? "Date" : "Risk Score"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                className="p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-primary border border-surface-container-high"
                title={`Order: ${sortOrder === "desc" ? "Descending" : "Ascending"}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Box over defanged target */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search across defanged targets, domains, or report UUIDs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs font-mono bg-surface-container border-surface-container-high text-on-surface placeholder:text-on-surface-variant/60"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="rounded-xl border border-surface-container-high bg-surface-container-low overflow-hidden shadow-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-surface-container-high bg-surface-container/60 hover:bg-surface-container/60">
                <TableHead className="w-[150px] text-xs font-mono uppercase text-on-surface-variant">
                  Classification
                </TableHead>
                <TableHead className="text-xs font-mono uppercase text-on-surface-variant">
                  Defanged Scanned Target (Safe Plain Text)
                </TableHead>
                <TableHead className="w-[120px] text-xs font-mono uppercase text-on-surface-variant">
                  Input Type
                </TableHead>
                <TableHead className="w-[140px] text-xs font-mono uppercase text-on-surface-variant">
                  On-Chain Status
                </TableHead>
                <TableHead className="w-[160px] text-xs font-mono uppercase text-on-surface-variant">
                  Date
                </TableHead>
                <TableHead className="w-[80px] text-right text-xs font-mono uppercase text-on-surface-variant">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingStats ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-surface-container-high/60">
                    <TableCell colSpan={6} className="py-4">
                      <Skeleton className="h-6 w-full bg-surface-container" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-10 text-center text-xs text-on-surface-variant font-mono"
                  >
                    No reports match the active filter or search query.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((report) => (
                  <TableRow
                    key={report.id}
                    onClick={() => router.push(`/report/${report.id}`)}
                    className="border-surface-container-high/60 hover:bg-surface-container/50 cursor-pointer transition-colors group"
                  >
                    <TableCell className="py-3">
                      <RiskBadge
                        classification={report.risk.classification}
                        score={report.risk.score}
                      />
                    </TableCell>

                    <TableCell className="py-3 space-y-1">
                      {/* Defanged plain text - strictly non-clickable */}
                      <div className="font-mono text-xs text-primary break-all select-all leading-relaxed group-hover:text-primary-container transition-colors">
                        {report.input_display}
                      </div>
                      {report.domain && (
                        <div className="text-[11px] font-mono text-on-surface-variant">
                          Domain: {report.domain}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs uppercase text-on-surface-variant">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface border border-outline-variant/30 text-[10px]">
                        {report.input_type}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs">
                      {report.onchain.status === "published" ? (
                        <span className="text-emerald-400 font-semibold text-[11px]">
                          ANCHORED
                        </span>
                      ) : report.onchain.status === "validated" ? (
                        <span className="text-emerald-300 font-semibold text-[11px]">
                          VALIDATED
                        </span>
                      ) : report.onchain.status === "disputed" ? (
                        <span className="text-amber-400 font-semibold text-[11px]">
                          DISPUTED
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/70 text-[11px]">
                          Unpublished
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs text-on-surface-variant">
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      <Link
                        href={`/report/${report.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary hover:text-white"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Toolbar */}
          <div className="p-3 border-t border-surface-container-high/60 bg-surface-container/30 flex items-center justify-between text-xs font-mono text-on-surface-variant">
            <span>
              Page {page} of {totalPages} ({totalFiltered} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 text-xs bg-surface-container border-surface-container-high text-on-surface disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs bg-surface-container border-surface-container-high text-on-surface disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
