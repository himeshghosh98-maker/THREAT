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
      className={`dark h-full ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full bg-surface text-on-surface font-sans antialiased selection:bg-primary-container selection:text-on-primary-container">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
