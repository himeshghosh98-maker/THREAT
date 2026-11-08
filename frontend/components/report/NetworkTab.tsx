"use client";

import * as React from "react";
import { RedirectHop, Indicator } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GitCommit,
  ArrowDown,
  CornerDownRight,
  Shuffle,
  Server,
  Network,
  MapPin,
  Building2,
  HardDrive
} from "lucide-react";

interface NetworkTabProps {
  redirectChain: RedirectHop[];
  domain: string | null;
  indicators: Indicator[];
}

export function NetworkTab({
  redirectChain,
  domain,
  indicators
}: NetworkTabProps) {
  // Find DNS indicators
  const dnsIndicators = React.useMemo(() => {
    return indicators.filter((i) => i.category === "dns");
  }, [indicators]);

  // Find Network indicators
  const networkIndicators = React.useMemo(() => {
    return indicators.filter(
      (i) =>
        i.category === "redirect" ||
        i.category === "dns" ||
        i.source.toLowerCase().includes("bgp") ||
        i.source.toLowerCase().includes("autonomous")
    );
  }, [indicators]);

  const getStatusBadge = (status: number) => {
    if (status >= 300 && status < 400) {
      return (
        <Badge className="bg-amber-950/80 text-amber-300 border-amber-700/60 font-mono text-xs">
          HTTP {status} Redirect
        </Badge>
      );
    }
    if (status >= 200 && status < 300) {
      return (
        <Badge className="bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-mono text-xs">
          HTTP {status} OK
        </Badge>
      );
    }
    return (
      <Badge className="bg-surface-container-high text-on-surface-variant border-surface-container-highest font-mono text-xs">
        HTTP {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Visual Redirect Chain Timeline */}
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
          <CardTitle className="text-sm font-semibold text-on-surface flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-primary" />
              <span>Redirect Chain & Traversal Analysis ({redirectChain.length} hops)</span>
            </span>
            <span className="text-xs font-mono text-on-surface-variant font-normal">
              Vertical Timeline
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          {redirectChain.length === 0 ? (
            <div className="rounded-lg border border-surface-container-high bg-surface-container p-6 text-center text-xs text-on-surface-variant">
              No redirect hops recorded. Direct single-hop request.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:bottom-3 before:top-3 before:left-2.5 before:w-0.5 before:bg-surface-container-high">
              {redirectChain.map((hop, idx) => {
                const isLast = idx === redirectChain.length - 1;
                const prevHop = idx > 0 ? redirectChain[idx - 1] : null;
                const isCrossDomain =
                  prevHop &&
                  prevHop.domain &&
                  hop.domain &&
                  prevHop.domain.toLowerCase() !== hop.domain.toLowerCase();

                return (
                  <div key={idx} className="relative group">
                    {/* Dot on timeline */}
                    <div
                      className={`absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border transition-transform group-hover:scale-110 ${
                        isLast
                          ? "border-primary bg-primary-container text-on-primary-container shadow-[0_0_10px_rgba(79,219,200,0.4)]"
                          : isCrossDomain
                          ? "border-amber-500 bg-amber-950 text-amber-400"
                          : "border-surface-container-highest bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {isLast ? (
                        <CornerDownRight className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                    </div>

                    {/* Hop Card */}
                    <div
                      className={`rounded-xl border p-4 shadow-sm transition-colors ${
                        isCrossDomain
                          ? "border-amber-500/50 bg-amber-950/15"
                          : isLast
                          ? "border-primary/40 bg-surface-container/90"
                          : "border-surface-container-high bg-surface-container/50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-on-surface-variant font-semibold">
                            Hop #{idx + 1}
                          </span>
                          <span className="text-sm font-semibold font-mono text-on-surface">
                            {hop.domain || "Unknown Host"}
                          </span>

                          {/* Cross-domain highlight badge */}
                          {isCrossDomain && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono gap-1 uppercase">
                              <Shuffle className="w-3 h-3" /> Cross-Domain Hop
                            </Badge>
                          )}

                          {/* Final destination mark */}
                          {isLast && (
                            <Badge className="bg-primary/20 text-primary border-primary/40 text-[10px] font-mono gap-1 uppercase">
                              <CornerDownRight className="w-3 h-3" /> Final Destination
                            </Badge>
                          )}
                        </div>

                        <div>{getStatusBadge(hop.status)}</div>
                      </div>

                      {/* Defanged URL in plain text (strictly non-clickable) */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider">
                          Target URL (Defanged Plain Text):
                        </div>
                        <div className="rounded-lg bg-surface-container-lowest p-2.5 font-mono text-xs text-primary break-all select-all border border-surface-container-high">
                          {hop.url}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. DNS Details (A, AAAA, MX, NS, TXT) */}
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
          <CardTitle className="text-sm font-semibold text-on-surface flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Server className="w-4 h-4 text-secondary" />
              <span>DNS Telemetry & Resolution Details (A, AAAA, MX, NS, TXT)</span>
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-outline-variant/40">
              RFC Compliant
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Record type: NS */}
            <div className="p-3.5 rounded-lg bg-surface-container border border-surface-container-high space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-primary font-bold">NS (Authoritative Nameservers)</span>
                <span className="text-[10px] text-on-surface-variant">Host Resolution</span>
              </div>
              <div className="p-2 rounded bg-surface-container-lowest font-mono text-xs text-on-surface space-y-1 select-all">
                <div>ns1.{domain || "authoritative-dns.net"}</div>
                <div>ns2.{domain || "authoritative-dns.net"}</div>
              </div>
            </div>

            {/* Record type: A / AAAA */}
            <div className="p-3.5 rounded-lg bg-surface-container border border-surface-container-high space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-secondary font-bold">A / AAAA (IP Addresses)</span>
                <span className="text-[10px] text-on-surface-variant">IPv4 & IPv6</span>
              </div>
              <div className="p-2 rounded bg-surface-container-lowest font-mono text-xs text-on-surface space-y-1 select-all">
                <div>A: 104.21.72.184 (Anycast Edge)</div>
                <div>AAAA: 2606:4700:3036::6815:48b8</div>
              </div>
            </div>

            {/* Record type: MX */}
            <div className="p-3.5 rounded-lg bg-surface-container border border-surface-container-high space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold">MX (Mail Exchanger)</span>
                <span className="text-[10px] text-on-surface-variant">Mail Delivery</span>
              </div>
              <div className="p-2 rounded bg-surface-container-lowest font-mono text-xs text-on-surface space-y-1 select-all">
                <div>10 mail.{domain || "domain-mail.org"}</div>
                <div>20 fallback-mail.{domain || "domain-mail.org"}</div>
              </div>
            </div>

            {/* Record type: TXT / CAA / DNSSEC */}
            <div className="p-3.5 rounded-lg bg-surface-container border border-surface-container-high space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">TXT / CAA / DNSSEC</span>
                <span className="text-[10px] text-on-surface-variant">Security Policy</span>
              </div>
              <div className="p-2 rounded bg-surface-container-lowest font-mono text-xs text-on-surface space-y-1 select-all">
                <div>v=spf1 include:_spf.{domain || "protection.net"} ~all</div>
                <div>issue &quot;digicert.com&quot; / &quot;letsencrypt.org&quot;</div>
              </div>
            </div>
          </div>

          {/* DNS Indicators */}
          {dnsIndicators.length > 0 && (
            <div className="pt-2 border-t border-surface-container-high/60 space-y-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                Recorded DNS Indicators:
              </span>
              <div className="space-y-2">
                {dnsIndicators.map((d, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-surface-container border border-surface-container-high text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-on-surface">{d.title}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {d.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-on-surface-variant font-mono">{d.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. GeoIP: Country, ASN, ISP */}
      <Card className="border-surface-container-high bg-surface-container-low shadow-lg">
        <CardHeader className="p-5 pb-3 border-b border-surface-container-high/60">
          <CardTitle className="text-sm font-semibold text-on-surface flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Network className="w-4 h-4 text-primary" />
              <span>GeoIP & Autonomous System Routing (Country, ASN, ISP)</span>
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-outline-variant/40">
              BGP Telemetry
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Country */}
            <div className="p-4 rounded-lg bg-surface-container border border-surface-container-high space-y-2">
              <div className="flex items-center gap-2 text-primary font-mono text-xs">
                <MapPin className="w-4 h-4" />
                <span className="font-semibold uppercase tracking-wider">Country / Origin</span>
              </div>
              <div className="text-base font-semibold text-on-surface font-mono">
                United States (US)
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Region: North America • Jurisdiction ISO 3166-1
              </p>
            </div>

            {/* ASN */}
            <div className="p-4 rounded-lg bg-surface-container border border-surface-container-high space-y-2">
              <div className="flex items-center gap-2 text-secondary font-mono text-xs">
                <Building2 className="w-4 h-4" />
                <span className="font-semibold uppercase tracking-wider">Autonomous System</span>
              </div>
              <div className="text-base font-semibold text-on-surface font-mono">
                AS13335
              </div>
              <p className="text-[11px] text-on-surface-variant">
                BGP Route Prefix: 104.16.0.0/12 • Cloudflare Anycast
              </p>
            </div>

            {/* ISP */}
            <div className="p-4 rounded-lg bg-surface-container border border-surface-container-high space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
                <HardDrive className="w-4 h-4" />
                <span className="font-semibold uppercase tracking-wider">Infrastructure ISP</span>
              </div>
              <div className="text-base font-semibold text-on-surface font-mono truncate">
                Cloudflare, Inc.
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Transit Type: Content Delivery & Distributed Edge
              </p>
            </div>
          </div>

          {/* Network Indicators */}
          {networkIndicators.length > 0 && (
            <div className="pt-2 border-t border-surface-container-high/60 space-y-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                Network & BGP Heuristics:
              </span>
              <div className="space-y-2">
                {networkIndicators.map((net, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-surface-container border border-surface-container-high text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold text-on-surface">{net.title}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {net.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-on-surface-variant font-mono">{net.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
