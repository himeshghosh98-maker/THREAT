# TrustPulse Frontend Dashboard

AI-Powered Web Threat Detection & Digital Trust Intelligence dashboard built with Next.js (App Router), TypeScript (strict mode), Tailwind CSS v4, shadcn/ui components, and TanStack Query.

---

## 1. Environment Configuration

Create or configure `.env.local` inside the `frontend/` directory (this file is ignored by Git and never committed):

```env
# URL of the backend FastAPI service
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Toggle between simulated mock telemetry and the real FastAPI backend
# Set to 'false' to communicate directly with http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=false
```

### Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Base endpoint of the FastAPI threat intelligence backend. |
| `NEXT_PUBLIC_USE_MOCKS` | `false` | When `true`, uses realistic in-memory test mocks (`lib/mocks/`) without requiring the backend or blockchain node. When `false`, executes live HTTP requests against the FastAPI backend. |

---

## 2. Mock Mode vs. Real Backend Mode

- **Mock Mode (`NEXT_PUBLIC_USE_MOCKS=true`)**:
  Ideal for UI development, isolated testing, or offline demonstrations. All scans, reports, correlation clusters, on-chain publishing simulations, and cryptographic verifications run client-side using deterministic fixtures from `lib/mocks/`.

- **Real Backend Mode (`NEXT_PUBLIC_USE_MOCKS=false`)**:
  Connects directly to the live FastAPI backend at `http://localhost:8000/api/v1`. The frontend handles the backend's standard JSON envelope (`{"error": {"code", "message"}}`) and translates HTTP errors into friendly user-facing messages:
  - `409 (not_published)`: Guides the user back to the report view with a direct button to publish to the blockchain.
  - `503 (chain_unavailable)`: Notifies the user that the blockchain node or registry is temporarily unreachable while keeping reports safe locally.
  - `429 (rate_limited)`: Gracefully alerts the user that the 10 requests/minute throttle has been reached with a retry button.
  - `422 (validation_error)` / `404 (not_found)`: Clarifies input validation or missing UUID diagnostics.

---

## 3. Exact Start Commands

Follow these steps to run the complete end-to-end stack on Windows (PowerShell) or Linux/macOS:

### Step 1: Start the Local Hardhat Chain & Deploy Registry
From `backend/` (or `backend/contracts/`):

```powershell
# In terminal 1: Start local Ethereum node
cd backend\contracts
npm ci
npx hardhat node

# In terminal 2: Deploy the ThreatReportRegistry smart contract to local node
cd backend\contracts
npx hardhat run scripts/deploy.ts --network localhost
```

*(Alternatively, run the automated helper script from `backend/`: `.\scripts\start_local_chain.ps1`)*

### Step 2: Start the FastAPI Backend
From `backend/` in a new terminal:

```powershell
cd backend
# Activate Python 3.12 virtual environment
.\.venv\Scripts\Activate.ps1

# Seed test database with benchmark reports
python -m scripts.seed

# Launch the Uvicorn server on http://localhost:8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

### Step 3: Start the Next.js Frontend Dashboard
From `frontend/` in a new terminal:

```powershell
cd frontend

# Install dependencies (first time only)
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Production Build & Linting

```powershell
# Run ESLint validation
npm run lint

# Compile optimized production build (Turbopack)
npm run build

# Start production server
npm run start
```

---

## 5. Application Screens

- **Scan Portal (`/`)**: Input URL or raw message/email text with live character counters, client validation, example attack chips, and animated 5-stage progress indicator.
- **Detailed Case Report (`/report/[id]`)**: Full SOC case view with risk classification, risk gauge (0–100), evidence coverage meter, vertical redirect traversal timeline, X.509 TLS certificate validator, expandable security headers, threat intelligence feeds, message social engineering lure deconstruction, on-chain publishing dialog, and print/PDF stylesheet.
- **Threat Intelligence & Campaigns (`/intel`)**: Correlation hub featuring global stats, interactive reports directory with risk filtering, search, sorting and pagination (`#reports`), and correlated campaign cluster cards with lightweight SVG graph diagrams.
- **On-Chain Cryptographic Verification (`/verify`)**: Direct URL query loading (`?id=<uuid>`), character-level visual hash difference comparison, transaction history timeline with copy buttons, Etherscan Sepolia block explorer integration, and friendly error handlers.
