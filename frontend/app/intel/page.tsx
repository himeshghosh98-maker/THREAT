"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCorrelations } from "@/lib/api";
import { ClusterIndicatorType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Network, AlertCircle, Server, Globe, ShieldAlert, Hash, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function getIndicatorTypeBadge(type: ClusterIndicatorType) {
  switch (type) {
    case "ip":
      return (
        <Badge className="bg-red-950/80 text-red-300 border-red-800 font-mono text-[11px] gap-1">
          <Server className="w-3 h-3" /> Shared IP
        </Badge>
      );
    case "redirect_target":
      return (
        <Badge className="bg-amber-950/80 text-amber-300 border-amber-800 font-mono text-[11px] gap-1">
          <Globe className="w-3 h-3" /> Redirect Target
        </Badge>
      );
    case "cert_fingerprint":
      return (
        <Badge className="bg-cyan-950/80 text-cyan-300 border-cyan-800 font-mono text-[11px] gap-1">
          <ShieldAlert className="w-3 h-3" /> Cert Fingerprint
        </Badge>
      );
    default:
      return (
        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-[11px] gap-1">
          <Hash className="w-3 h-3" /> {type}
        </Badge>
      );
  }
}

export default function ThreatIntelPage() {
  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["intel", "correlations"],
    queryFn: () => getCorrelations()
  });

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-cyan-400">
          <Network className="w-5 h-5" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Threat Intelligence & Infrastructure Clusters
          </h1>
        </div>
        <p className="text-xs text-zinc-400 max-w-3xl">
          Automated correlation graphs identifying shared infrastructure (bulletproof hosting IPs, common redirect funnels, and reused SSL certificates) linking disparate phishing and malware campaigns.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error Loading Correlation Telemetry</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || "Failed to retrieve threat clusters."}
          </AlertDescription>
        </Alert>
      ) : data?.clusters && data.clusters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.clusters.map((cluster) => (
            <Card
              key={cluster.id}
              className="border-zinc-800 bg-zinc-900/60 shadow-md flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs text-zinc-400">
                    Cluster: {cluster.id}
                  </span>
                  {getIndicatorTypeBadge(cluster.indicator_type)}
                </div>
                <CardTitle className="text-base font-mono text-cyan-300 break-all select-all">
                  {cluster.shared_indicator}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-300 leading-relaxed pt-2">
                  {cluster.summary}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                <div className="border-t border-zinc-800/80 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Associated Scan Reports:</span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {cluster.report_ids.length} linked targets
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {cluster.report_ids.map((repId) => (
                      <div
                        key={repId}
                        className="flex items-center justify-between p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono"
                      >
                        <span className="text-zinc-400 truncate max-w-[200px] sm:max-w-[260px]">
                          {repId}
                        </span>
                        <Link href={`/report/${repId}`}>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-cyan-400 hover:text-cyan-300">
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-12 text-center text-sm text-zinc-400">
          No correlated infrastructure clusters currently detected.
        </div>
      )}
    </div>
  );
}
