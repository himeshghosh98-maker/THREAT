"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReport, publishReport } from "@/lib/api";
import { ReportHeader } from "@/components/report/ReportHeader";
import { SummaryStrip } from "@/components/report/SummaryStrip";
import { FailedChecksBanner } from "@/components/report/FailedChecksBanner";
import { SidePanel } from "@/components/report/SidePanel";
import { OverviewTab } from "@/components/report/OverviewTab";
import { EvidenceTab } from "@/components/report/EvidenceTab";
import { NetworkTab } from "@/components/report/NetworkTab";
import { TlsTab } from "@/components/report/TlsTab";
import { HeadersTab } from "@/components/report/HeadersTab";
import { ThreatIntelTab } from "@/components/report/ThreatIntelTab";
import { MessageTab } from "@/components/report/MessageTab";
import { OnchainTab } from "@/components/report/OnchainTab";
import { DisclaimerSection } from "@/components/report/DisclaimerSection";
import { PublishConfirmModal } from "@/components/report/PublishConfirmModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Sparkles,
  ListFilter,
  Network,
  Lock,
  FileCode,
  Database,
  Radio,
  Link2
} from "lucide-react";
import Link from "next/link";

function ReportDetailContent() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  // Toast feedback state
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = React.useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const handleCopyText = React.useCallback(
    (text: string, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`);
    },
    [showToast]
  );

  // Publish confirmation modal state
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);

  // Fetch report query
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

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: () => publishReport(id),
    onSuccess: (updatedReport) => {
      queryClient.setQueryData(["report", id], updatedReport);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setIsPublishModalOpen(false);
      showToast("Report successfully anchored on blockchain!");
    },
    onError: () => {
      setIsPublishModalOpen(false);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <Skeleton className="h-8 w-56 bg-surface-container" />
        <Skeleton className="h-28 w-full bg-surface-container" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 bg-surface-container" />
          <Skeleton className="h-32 bg-surface-container" />
          <Skeleton className="h-32 bg-surface-container" />
          <Skeleton className="h-32 bg-surface-container" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          <Skeleton className="h-96 lg:col-span-8 bg-surface-container" />
          <Skeleton className="h-96 lg:col-span-4 bg-surface-container" />
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="space-y-6 py-12 max-w-2xl mx-auto">
        <Alert variant="destructive" className="border-red-500 bg-red-950/40">
          <AlertCircle className="w-5 h-5" />
          <AlertTitle className="text-base font-bold">Report Not Found</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed mt-1">
            {(error as Error)?.message || `Threat intelligence report '${id}' could not be located.`}
          </AlertDescription>
        </Alert>
        <div className="flex justify-start">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Threat Scanner
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isMessage = report.input_type === "message";

  return (
    <div className="space-y-6 py-2">
      {/* 1. Header Toolbar & Defanged Target Bar */}
      <ReportHeader
        report={report}
        onCopyTarget={() => handleCopyText(report.input_display, "Defanged Target")}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        isPublishing={publishMutation.isPending}
      />

      {/* 2. Summary Strip: 4 Equal Cards */}
      <SummaryStrip report={report} />

      {/* 3. Amber Failed Checks Alert Banner */}
      <FailedChecksBanner checksFailed={report.risk.checks_failed} />

      {/* 4. Main Two-Column Layout (Interactive Tabs & Desktop Side Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Column: Technical Tabs + Below Tabs Disclaimers */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Interactive Tabs (Screen View) */}
          <div className="print:hidden">
            <Tabs defaultValue="overview" className="w-full space-y-4">
              <TabsList
                className={`grid w-full bg-surface-container border border-surface-container-high/80 p-1 rounded-xl h-auto ${
                  isMessage
                    ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-8"
                    : "grid-cols-2 sm:grid-cols-4 md:grid-cols-7"
                }`}
              >
                <TabsTrigger
                  value="overview"
                  className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-on-primary font-mono gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Overview
                </TabsTrigger>

                <TabsTrigger
                  value="evidence"
                  className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-on-primary font-mono gap-1.5"
                >
                  <ListFilter className="w-3.5 h-3.5" /> Evidence ({report.indicators.length})
                </TabsTrigger>

                <TabsTrigger
                  value="network"
                  className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-on-primary font-mono gap-1.5"
                >
                  <Network className="w-3.5 h-3.5" /> Network ({report.redirect_chain.length})
                </TabsTrigger>

                <TabsTrigger
                  value="tls"
                  className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-on-primary font-mono gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> TLS
                </TabsTrigger>

                <TabsTrigger
                  value="headers"
                  className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-on-primary font-mono gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" /> Headers ({report.security_headers.length})
                </TabsTrigger>

                <TabsTrigger
                  value="intel"
                  className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-on-primary font-mono gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" /> Threat Intel ({report.threat_intel.length})
                </TabsTrigger>

                {isMessage && (
                  <TabsTrigger
                    value="message"
                    className="text-xs py-2 data-[state=active]:bg-secondary data-[state=active]:text-black font-mono gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" /> Message
                  </TabsTrigger>
                )}

                <TabsTrigger
                  value="onchain"
                  className="text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-on-primary font-mono gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" /> On-Chain
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Overview */}
              <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                <OverviewTab
                  explanation={report.ai_explanation}
                  indicators={report.indicators}
                />
              </TabsContent>

              {/* Tab 2: Evidence */}
              <TabsContent value="evidence" className="mt-0 focus-visible:outline-none">
                <EvidenceTab indicators={report.indicators} />
              </TabsContent>

              {/* Tab 3: Network */}
              <TabsContent value="network" className="mt-0 focus-visible:outline-none">
                <NetworkTab
                  redirectChain={report.redirect_chain}
                  domain={report.domain}
                  indicators={report.indicators}
                />
              </TabsContent>

              {/* Tab 4: TLS */}
              <TabsContent value="tls" className="mt-0 focus-visible:outline-none">
                <TlsTab tls={report.tls} />
              </TabsContent>

              {/* Tab 5: Headers */}
              <TabsContent value="headers" className="mt-0 focus-visible:outline-none">
                <HeadersTab headers={report.security_headers} />
              </TabsContent>

              {/* Tab 6: Threat Intel */}
              <TabsContent value="intel" className="mt-0 focus-visible:outline-none">
                <ThreatIntelTab threatIntel={report.threat_intel} />
              </TabsContent>

              {/* Tab 7: Message (only if message) */}
              {isMessage && (
                <TabsContent value="message" className="mt-0 focus-visible:outline-none">
                  <MessageTab analysis={report.message_analysis} />
                </TabsContent>
              )}

              {/* Tab 8: Onchain */}
              <TabsContent value="onchain" className="mt-0 focus-visible:outline-none">
                <OnchainTab
                  reportId={report.id}
                  onchain={report.onchain}
                  onPublish={() => publishMutation.mutate()}
                  isPublishing={publishMutation.isPending}
                  publishError={publishMutation.error as Error | null}
                  onCopyText={handleCopyText}
                  onOpenConfirmModal={() => setIsPublishModalOpen(true)}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sequential Sections (Print / PDF View Only) */}
          <div className="hidden print:block space-y-8">
            <section className="print-avoid-break space-y-3">
              <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                1. Executive Threat Summary & AI Synthesis
              </h3>
              <OverviewTab
                explanation={report.ai_explanation}
                indicators={report.indicators}
              />
            </section>

            <section className="print-avoid-break print-page-break space-y-3">
              <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                2. Threat Indicators & Heuristic Evidence
              </h3>
              <EvidenceTab indicators={report.indicators} />
            </section>

            <section className="print-avoid-break space-y-3">
              <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                3. Network Traversal, DNS & GeoIP Routing
              </h3>
              <NetworkTab
                redirectChain={report.redirect_chain}
                domain={report.domain}
                indicators={report.indicators}
              />
            </section>

            <section className="print-avoid-break space-y-3">
              <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                4. Cryptographic TLS Security Assessment
              </h3>
              <TlsTab tls={report.tls} />
            </section>

            <section className="print-avoid-break space-y-3">
              <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                5. Security Headers Analysis
              </h3>
              <HeadersTab headers={report.security_headers} />
            </section>

            <section className="print-avoid-break space-y-3">
              <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                6. Multi-Source Threat Intelligence Feeds
              </h3>
              <ThreatIntelTab threatIntel={report.threat_intel} />
            </section>

            {isMessage && (
              <section className="print-avoid-break space-y-3">
                <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                  7. Message Lure & Communication Artifacts
                </h3>
                <MessageTab analysis={report.message_analysis} />
              </section>
            )}

            <section className="print-avoid-break space-y-3">
              <h3 className="text-base font-bold font-mono border-b pb-1 text-primary">
                8. Decentralized Blockchain Provenance Record
              </h3>
              <OnchainTab
                reportId={report.id}
                onchain={report.onchain}
                onPublish={() => publishMutation.mutate()}
                isPublishing={publishMutation.isPending}
                publishError={publishMutation.error as Error | null}
                onCopyText={handleCopyText}
                onOpenConfirmModal={() => setIsPublishModalOpen(true)}
              />
            </section>
          </div>

          {/* Mandatory Below-Tabs: Precautions & Limitations */}
          <DisclaimerSection
            precautions={report.precautions}
            limitations={report.limitations}
          />
        </div>

        {/* Right Column: Desktop Side Panel (Collapses below on mobile) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <SidePanel report={report} onCopyText={handleCopyText} />
        </div>
      </div>

      {/* Confirmation Modal for On-Chain Publication */}
      <PublishConfirmModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={() => publishMutation.mutate()}
        isPublishing={publishMutation.isPending}
      />

      {/* Floating Copy Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-primary/50 bg-surface-container-high px-4 py-3 text-xs font-mono font-medium text-primary shadow-2xl animate-in fade-in slide-in-from-bottom-3"
        >
          <Check className="w-4 h-4 text-primary shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 py-6 animate-pulse">
          <Skeleton className="h-8 w-56 bg-surface-container" />
          <Skeleton className="h-28 w-full bg-surface-container" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 bg-surface-container" />
            <Skeleton className="h-32 bg-surface-container" />
            <Skeleton className="h-32 bg-surface-container" />
            <Skeleton className="h-32 bg-surface-container" />
          </div>
        </div>
      }
    >
      <ReportDetailContent />
    </React.Suspense>
  );
}
