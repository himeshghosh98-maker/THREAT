# TrustPulse: AI-Powered Web Threat Detection & Digital Trust Intelligence

An intelligent threat detection and digital trust system that evaluates web threats (phishing, lookalike spoofing, malicious redirects, TLS/header anomalies) and social engineering solicitations (SMS, emails, screenshots, QR codes), provides AI-driven threat explanations, and records auditable cryptographic proofs on-chain for tamper-proof verification.

[![Live Demo](https://img.shields.io/badge/Live_Demo-threat--beta.vercel.app-blue?style=for-the-badge&logo=vercel)](https://threat-beta.vercel.app)
[![API Documentation](https://img.shields.io/badge/FastAPI-Docs-009688?style=for-the-badge&logo=fastapi)](http://localhost:8000/docs)
[![Documentation](https://img.shields.io/badge/User_Guide-PDF_%26_Markdown-orange?style=for-the-badge&logo=gitbook)](docs/USER_GUIDE.md)

---

## Complete Project Documentation

- 📖 **[Comprehensive User Guide (Markdown)](docs/USER_GUIDE.md)**: Full operator manual, 60-second report walkthrough, step-by-step scanner guides, scoring engine breakdown, and 5-minute judge demo script.
- 📄 **[Download Complete User Guide (PDF)](docs/USER_GUIDE.pdf)**: 27-page styled, printable operator manual with real system screenshots, tables, and architectural diagrams.
- 🔌 **[API Contract Specification](docs/API_CONTRACT.md)**: OpenAPI v1 data contracts, schemas, and endpoint definitions.
- 🏛️ **[Backend Architecture & Security Methodology](backend/docs/ARCHITECTURE.md)**: Deep dive into anti-SSRF protections, deterministic risk engine, and smart contract anchoring.
- 📊 **[Empirical Accuracy Evaluation Report](backend/docs/ACCURACY_REPORT.md)**: Wilson score interval metrics across stratified 120-case benchmark (0.0% False Positive Rate on controlled cases).

---

## Core Architecture Principle

```
[ Deterministic Evidence First ]  --->  [ AI Explains Only ]  --->  [ Blockchain Proves Integrity ]
 DNS, TLS, Headers, RDAP, Feeds         Translates findings into          Immutable Keccak-256 digests
 Rigorous algorithmic scoring           jargon-free precautions           and timestamped on-chain history
```

1. **Deterministic Evidence First:** Risk classification is computed strictly from hard cryptographic, network transport, lexical, and heuristic checks (`backend/app/core/risk.py`).
2. **AI Explains Only:** Language models never determine or override risk levels; they only translate technical observations into accessible precautions. If no LLM key is configured, an offline deterministic template is emitted.
3. **Blockchain Proves Integrity:** Canonical Keccak-256 digests of investigation reports are permanently anchored on an Ethereum smart contract registry (`ThreatReportRegistry`). Any modification of stored records invalidates hash verification.

---

## Folder Structure

```
kernal-fresh/
  run-trustpulse.ps1     # 1-Click stack runner (-Start, -Stop, -Status, -Prepare)
  kernal-v2/             # Main branch checkout (integration & documentation)
    backend/             # FastAPI backend, analyzers, and Hardhat contracts
      app/               # FastAPI application routers and analyzers
      contracts/         # Solidity smart contracts (ThreatReportRegistry)
      scripts/           # Seed, feed refresh, and accuracy evaluation scripts
    frontend/            # Next.js 16 (Turbopack) dashboard & WebAssembly OCR
      app/               # App Router pages (/ , /report/[id], /intel, /verify)
      components/        # UI cards, scanners, and report inspector tabs
      extension/         # Manifest V3 browser extension for Brave & Chrome
    docs/                # Full User Guide, screenshots, and specifications
      guide-screenshots/ # 1440px high-resolution feature screenshots
      USER_GUIDE.md      # Markdown documentation source
      USER_GUIDE.pdf     # 27-page printable PDF manual
  wt-backend/            # Git worktree for branch backend-dev
  wt-frontend/           # Git worktree for branch frontend-dev
```

---

## Branch Table

| Branch | Worktree Folder | Role / Scope |
| :--- | :--- | :--- |
| `main` | `kernal-v2` | Integration, root configuration, full documentation, and release |
| `backend-dev` | `wt-backend` | Backend FastAPI services, Hardhat Solidity contracts, test suite |
| `frontend-dev` | `wt-frontend` | Next.js frontend UI dashboard, Tesseract OCR, jsQR scanner, MV3 extension |

---

## Key Features

- **Multi-Vector Intake:**
  - **URL / Domain:** Concurrently evaluates typosquatting, IDN homographs, redirect chains, DNS, domain age, TLS certificates, Certificate Transparency (CT), security headers, and feeds.
  - **Message / Email Text:** Extracts links, contact handles, UPI IDs, and detects psychological social-engineering pressure.
  - **Screenshot OCR:** In-browser text extraction using WebAssembly Tesseract.js with confusable-character verification (`1`, `l`, `I`, `0`, `O`). Images never leave your device.
  - **QR Code Inspection:** Decodes and inspects website and UPI payment QR codes safely without navigating to the target.
- **On-Chain Cryptographic Integrity:** Canonical Keccak-256 hashes anchored to `ThreatReportRegistry` smart contract; real-time diffing and verification on `/verify`.
- **Campaign Intelligence Clustering:** Automatically correlates reports sharing infrastructure (server IP, redirect targets, certificate fingerprints, or registrars) on `/intel`.
- **Manifest V3 Browser Extension:** Right-click link inspection, toolbar badge risk indicators (`LOW`, `SUS`, `HIGH`, `MAL`, `?`), and defanged page scanning.

---

## Quick Start (How to Run)

### Prerequisites
- **Node.js:** v20, v22, or v24
- **Python:** 3.12 (with pip and virtual environment)
- **PowerShell:** On Windows (or bash on Linux/macOS)

---

### Method 1: 1-Click Automated Runner (Fastest)

From the project root:
```powershell
# Start all 3 services (Hardhat node, deploy contract, seed DB, start backend, start frontend)
powershell -ExecutionPolicy Bypass -File .\run-trustpulse.ps1 -Start

# Check status of services
powershell -ExecutionPolicy Bypass -File .\run-trustpulse.ps1 -Status

# Stop all services
powershell -ExecutionPolicy Bypass -File .\run-trustpulse.ps1 -Stop
```

### Method 2: Manual Three-Terminal Workflow

#### 1. Start Local Ethereum Node & Deploy Smart Contract (Terminal 1)
```powershell
cd kernal-v2\backend\contracts
npm ci
npx hardhat node --hostname 127.0.0.1
# In a second tab:
npx hardhat run scripts/deploy.ts --network localhost
```

#### 2. Start FastAPI Backend (Terminal 2)
```powershell
cd kernal-v2\backend
$env:CHAIN_MODE = "local"
.\.venv\Scripts\python.exe -m scripts.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- Interactive Swagger API: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Endpoint: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

#### 3. Start Next.js Frontend Dashboard (Terminal 3)
```powershell
cd kernal-v2\frontend
npm run build
npm run start -- -p 3000
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## Running Verification Tests

```powershell
# 1. Backend Unit & Integration Tests (196 tests)
cd kernal-v2\backend
.\.venv\Scripts\python.exe -m pytest -q

# 2. Hardhat Smart Contract Tests (5 tests)
cd kernal-v2\backend\contracts
npx hardhat test

# 3. Frontend Lint & Build
cd kernal-v2\frontend
npm run lint
npm run build

# 4. Offline Empirical Accuracy Evaluation (120 benchmark cases)
cd kernal-v2\backend
.\.venv\Scripts\python.exe scripts\accuracy_eval.py --split all
```

---

## Live Cloud Deployment

- **Live Frontend (Vercel):** [https://threat-beta.vercel.app](https://threat-beta.vercel.app)
- **Live Backend (Render):** Connected via automated continuous deployment on branch `main`.

---

## License

This project is licensed under the Apache 2.0 License.
