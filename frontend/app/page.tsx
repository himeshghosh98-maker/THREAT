"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scanUrl, scanMessage, listReports } from "@/lib/api";
import { ScanReport } from "@/lib/types";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MessageSquare, AlertCircle, Shield, ArrowRight, Loader2, History } from "lucide-react";
import Link from "next/link";

export default function ScanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [urlInput, setUrlInput] = React.useState("");
  const [messageInput, setMessageInput] = React.useState("");
  const [scanError, setScanError] = React.useState<string | null>(null);

  // Recent reports query
  const {
    data: reportsData,
    isLoading: isReportsLoading,
    isError: isReportsError,
    error: reportsError
  } = useQuery({
    queryKey: ["reports", "recent"],
    queryFn: () => listReports({ limit: 10, offset: 0 })
  });

  // URL scan mutation
  const urlMutation = useMutation({
    mutationFn: (url: string) => scanUrl(url),
    onSuccess: (report: ScanReport) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      router.push(`/report/${report.id}`);
    },
    onError: (err: Error) => {
      setScanError(err.message || "Failed to scan URL. Please verify the address.");
    }
  });

  // Message scan mutation
  const messageMutation = useMutation({
    mutationFn: (msg: string) => scanMessage(msg),
    onSuccess: (report: ScanReport) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      router.push(`/report/${report.id}`);
    },
    onError: (err: Error) => {
      setScanError(err.message || "Failed to analyze message content.");
    }
  });

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    if (!urlInput.trim()) return;
    urlMutation.mutate(urlInput.trim());
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    if (!messageInput.trim()) return;
    messageMutation.mutate(messageInput.trim());
  };

  const sampleTargets = [
    { label: "PayPal Typosquat", value: "https://paypa1-security-login.com/verify?account=9824" },
    { label: "Cyrillic Homograph", value: "https://xn--pple-43d-id-recover.com/portal" },
    { label: "Chase Redirect", value: "http://chase-verify-portal.top/auth?ref=alert" },
    { label: "GitHub (Low Risk)", value: "https://github.com/torvalds/linux" },
    { label: "MIT CSAIL (Low Risk)", value: "https://csail.mit.edu/research/security" },
    { label: "Unresponsive Endpoint", value: "https://unknown-edge-node-714.biz/api/telemetry" },
  ];

  const sampleSmish = "URGENT: Your Chase checking account has been restricted. Visit http://chase-verify-portal.top/auth?ref=alert within 2 hours or call +1-800-555-0199.";

  const isScanning = urlMutation.isPending || messageMutation.isPending;

  return (
    <div className="space-y-8 py-4">
      {/* Hero Header */}
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
          <Shield className="w-3.5 h-3.5" />
          Multi-Vector Threat Analysis & Cryptographic Trust
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
          Inspect URLs & Social Engineering Lures
        </h1>
        <p className="text-sm text-zinc-400">
          Deconstruct homographs, typosquats, evasive redirect hops, and TLS anomalies with heuristic intelligence anchored on-chain.
        </p>
      </div>

      {/* Main Scan Form Card */}
      <Card className="max-w-3xl mx-auto border-zinc-800 bg-zinc-900/60 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-200">New Threat Investigation</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Submit a suspicious web address or raw communication message for multi-engine correlation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-zinc-950 border-zinc-800">
              <TabsTrigger value="url" className="text-xs gap-1.5">
                <Search className="w-3.5 h-3.5" /> URL Inspection
              </TabsTrigger>
              <TabsTrigger value="message" className="text-xs gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Message / Smishing Scan
              </TabsTrigger>
            </TabsList>

            {/* URL Scan Tab */}
            <TabsContent value="url" className="space-y-4">
              <form onSubmit={handleUrlSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Enter suspicious link (e.g. https://paypa1-security-login.com/...)"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    disabled={isScanning}
                    className="font-mono text-xs h-10 bg-zinc-950/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  />
                  <Button
                    type="submit"
                    disabled={isScanning || !urlInput.trim()}
                    className="sm:w-36 h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shrink-0"
                  >
                    {urlMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 mr-1" />
                        Analyze URL
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Sample Target Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-mono uppercase text-zinc-500 tracking-wider">
                  Test Benchmark Targets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleTargets.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setUrlInput(s.value)}
                      disabled={isScanning}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Message Scan Tab */}
            <TabsContent value="message" className="space-y-4">
              <form onSubmit={handleMessageSubmit} className="space-y-3">
                <Textarea
                  placeholder="Paste suspicious SMS, email body, or chat lure here..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={isScanning}
                  rows={4}
                  className="font-mono text-xs bg-zinc-950/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
                />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setMessageInput(sampleSmish)}
                    disabled={isScanning}
                    className="text-[11px] text-cyan-400 hover:underline self-start"
                  >
                    Load Sample Smishing Lure
                  </button>
                  <Button
                    type="submit"
                    disabled={isScanning || !messageInput.trim()}
                    className="w-full sm:w-44 h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shrink-0"
                  >
                    {messageMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Analyze Message
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {/* Error Banner */}
          {scanError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Scan Request Failed</AlertTitle>
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Intelligence Reports */}
      <div className="space-y-3 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-300">
              Recent Threat Intelligence Reports
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            Total Scans: {reportsData?.total ?? "..."}
          </span>
        </div>

        {isReportsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isReportsError ? (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Error Loading Reports</AlertTitle>
            <AlertDescription>
              {(reportsError as Error)?.message || "Failed to load recent reports."}
            </AlertDescription>
          </Alert>
        ) : reportsData && reportsData.items.length > 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/80 overflow-hidden">
            {reportsData.items.map((report) => (
              <div
                key={report.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <RiskBadge classification={report.risk.classification} score={report.risk.score} />
                    <span className="text-xs text-zinc-400 font-mono">
                      {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                      {report.input_type}
                    </span>
                  </div>
                  {/* Defanged display - strictly non-clickable raw text */}
                  <div className="font-mono text-xs text-zinc-200 truncate select-all">
                    {report.input_display}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {report.onchain.status === "published" && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ON-CHAIN
                    </span>
                  )}
                  <Link href={`/report/${report.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-zinc-700 hover:border-zinc-500">
                      <span>View Report</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
            No scan reports found. Run a new scan above to populate telemetry.
          </div>
        )}
      </div>
    </div>
  );
}
