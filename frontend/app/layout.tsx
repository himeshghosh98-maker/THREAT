import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { FooterDisclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "AI-Powered Web Threat Detection & Digital Trust Intelligence",
  description: "Next.js dashboard for real-time web threat inspection, AI synthesis, and onchain verification.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-cyan-900 selection:text-cyan-100">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto p-4 sm:p-6">
            {children}
          </main>
          <FooterDisclaimer />
        </Providers>
      </body>
    </html>
  );
}
