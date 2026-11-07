Frontend: Next.js dashboard. Branch frontend-dev. Built with Antigravity.

# AI-Powered Web Threat Detection & Digital Trust Intelligence

Frontend dashboard built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui components, and TanStack Query.

## Getting Started

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features
- **URL & Message Scanning (`/`)**: Real-time inspection of typosquats, homographs, and smishing lures.
- **Detailed Threat Reports (`/report/[id]`)**: Risk score radial gauge, threat indicators, multi-hop redirect chains, TLS certificate validation, security headers audit, AI threat explanation, and on-chain publishing.
- **Threat Intelligence Clusters (`/intel`)**: Automated correlation of shared malicious infrastructure (bulletproof IPs, redirect hops, SSL cert fingerprints).
- **On-Chain Cryptographic Verification (`/verify`)**: Audit SHA-256 state tree integrity against smart contract anchors.
