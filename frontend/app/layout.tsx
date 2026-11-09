import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/shell/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrustPulse | AI-Powered Web Threat Detection & Digital Trust Intelligence",
  description: "Next.js dashboard for real-time web threat inspection, heuristic analysis, and on-chain verification.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full font-sans antialiased text-[#526085] bg-gradient-to-b from-[#FFFFFF] to-[#F5F8FF] selection:bg-[#4F6BFF]/20 selection:text-[#4F6BFF]">
        {/* Animated ambient drifting wave shapes in the background */}
        <div className="bg-drift-container" aria-hidden="true">
          <div className="blob-1" />
          <div className="blob-2" />
          <div className="blob-3" />
        </div>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
