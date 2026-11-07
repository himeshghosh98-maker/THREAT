"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReport, publishReport } from "@/lib/api";
import { RiskBadge, getRiskDetails } from "@/components/RiskBadge";
import { RiskGauge } from "@/components/RiskGauge";
import { IndicatorList } from "@/components/IndicatorList";
import { RedirectTimeline } from "@/components/RedirectTimeline";
import { TlsCard } from "@/components/TlsCard";
import { HeadersTable } from "@/components/HeadersTable";
import { AiExplanation } from "@/components/AiExplanation";
import { ChainStatus } from "@/components/ChainStatus";
import { Disclaimer } from "@/components/Disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Globe,
  Radio,
  CheckCircle2,
  Info
} from "lucide-react";
import Link from "next/link";

function ReportDetailContent() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  const {
    data: report,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["report", id],
    queryFn: () => getReport(id),
    enabled: !!id
  });

  const publishMutation = useMutation({
    mutationFn: () => publishReport(id),
    onSuccess: (updatedReport) => {
      queryClient.setQueryData(["report", id], updatedReport);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="space-y-4 py-8 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Report Not Found</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || `Could not find threat report with ID '${id}'.`}
          </AlertDescription>
        </Alert>
        <Link href="/">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Threat Scanner
          </Button>
        </Link>
      </div>
    );
  }

  const isLowRisk = report.risk.classification === "low_risk";
  const riskMeta = getRiskDetails(report.risk.classification);

  return (
    <div className="space-y-6 py-4">
      {/* Navigation Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scanner
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">
            UUID: <span className="text-zinc-300">{report.id}</span>
          </span>
        </div>
      </div>

      {/* Target Summary Header */}
      <Card className="border-zinc-800 bg-zinc-900/70 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge
                  classification={report.risk.classification}
                  score={report.risk.score}
                />
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  {report.input_type} target
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(report.created_at).toLocaleString()}
                </span>
              </div>

              {/* Defanged Target - strictly non-clickable text */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Defanged Scanned Target:
                </span>
                <div className="p-3 rounded-md bg-zinc-950 border border-zinc-800 font-mono text-sm text-cyan-300 break-all select-all">
                  {report.input_display}
                </div>
              </div>

              {/* Domain & Risk classification verdict description */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                {report.domain && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Domain: <strong className="text-zinc-200">{report.domain}</strong></span>
                  </div>
                )}
                {isLowRisk && (
                  <div className="text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>No significant indicators found in the available checks.</span>
                  </div>
                )}
                {!isLowRisk && (
                  <div className="text-zinc-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                    <span>{riskMeta.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Gauge Visual */}
            <div className="border-t lg:border-t-0 lg:border-l border-zinc-800 pt-4 lg:pt-0 lg:pl-6 shrink-0 flex justify-center">
              <RiskGauge risk={report.risk} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* On-chain Proof Status */}
      <ChainStatus
        reportId={report.id}
        onchain={report.onchain}
        onPublish={() => publishMutation.mutate()}
        isPublishing={publishMutation.isPending}
      />

      {/* Message Analysis Banner (if message scan) */}
      {report.message_analysis && (
        <Card className="border-purple-900/50 bg-purple-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
              <Radio className="w-4 h-4" /> Message Lure & Smishing Deconstruction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-zinc-300">{report.message_analysis.explanation}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-mono">Urgency Triggers</span>
                <div className="text-red-400 font-semibold">
                  {report.message_analysis.urgency_signals.join(", ") || "None"}
                </div>
              </div>
              <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-mono">Impersonation Target</span>
                <div className="text-amber-400 font-semibold">
                  {report.message_analysis.impersonation.detected
                    ? report.message_analysis.impersonation.target || "Detected"
                    : "None detected"}
                </div>
              </div>
              <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-mono">Extracted Numbers</span>
                <div className="text-zinc-300 font-mono">
                  {report.message_analysis.extracted_phones.join(", ") || "None"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Technical Tabs */}
      <Tabs defaultValue="indicators" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4 bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="indicators" className="text-xs">
            Indicators ({report.indicators.length})
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">
            AI Synthesis
          </TabsTrigger>
          <TabsTrigger value="redirects" className="text-xs">
            Redirects ({report.redirect_chain.length})
          </TabsTrigger>
          <TabsTrigger value="tls" className="text-xs">
            TLS Security
          </TabsTrigger>
          <TabsTrigger value="headers" className="text-xs">
            Headers ({report.security_headers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="space-y-4">
          <IndicatorList indicators={report.indicators} />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AiExplanation explanation={report.ai_explanation} />
        </TabsContent>

        <TabsContent value="redirects" className="space-y-4">
          <RedirectTimeline chain={report.redirect_chain} />
        </TabsContent>

        <TabsContent value="tls" className="space-y-4">
          <TlsCard tls={report.tls} />
        </TabsContent>

        <TabsContent value="headers" className="space-y-4">
          <HeadersTable headers={report.security_headers} />
        </TabsContent>
      </Tabs>

      {/* Mandatory Limitations & Precautions */}
      <Disclaimer
        limitations={report.limitations}
        precautions={report.precautions}
      />
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 py-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-36 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 md:col-span-1" />
            <Skeleton className="h-64 md:col-span-2" />
          </div>
        </div>
      }
    >
      <ReportDetailContent />
    </React.Suspense>
  );
}
