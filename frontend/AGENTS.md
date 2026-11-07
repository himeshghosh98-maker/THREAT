# Frontend Agent Guidelines & Repo Context

## Repository Context
- **GitHub Repo:** `https://github.com/himeshghosh98-maker/kernal-v2` (monorepo)
- **Active Branch:** `frontend-dev`
- **Allowed Folder:** `frontend/` ONLY. Never edit `backend/`, `docs/`, or workspace root files.
- **Backend:** FastAPI service running at `http://localhost:8000` with API prefix `/api/v1`.
- **API Contract:** `../docs/API_CONTRACT.md` (read-only, single source of truth). Do NOT invent endpoints or fields.
- **Env Configuration:**
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
  - `NEXT_PUBLIC_USE_MOCKS=true`
  - When `NEXT_PUBLIC_USE_MOCKS=true`, all API calls return realistic mock data from `lib/mocks/` without requiring the backend. The mock toggle lives in `lib/api.ts`.
  - Never commit `.env` or `.env.local` files or secrets. Keep committed `.env.example`.

## Tech Stack
- **Framework:** Next.js (App Router) + React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + Dark-first cybersecurity theme
- **UI Components:** shadcn/ui pattern with `@radix-ui` primitives
- **Icons:** `lucide-react`
- **Charts:** `recharts` for semi-circle risk score gauge
- **Data Fetching:** `@tanstack/react-query`

## Strict UI Rules
1. **Never Display "Safe" for Low Risk:**
   - Classification `low_risk` MUST be labeled "Low Risk".
   - Accompanying text MUST be: `"No significant indicators found in the available checks."`
   - Every report MUST clearly show scan limitations.
2. **Risk Colors & Symbols:**
   - `low_risk`: Green / Emerald (`CheckCircle2` icon)
   - `suspicious`: Amber (`AlertTriangle` icon)
   - `high_risk`: Red (`AlertOctagon` icon)
   - `confirmed_malicious`: Dark Red (`ShieldAlert` icon)
   - `inconclusive`: Grey (`HelpCircle` icon)
   - Never rely on color alone; always pair with an icon and explicit text label.
3. **Security & Defanging:**
   - Never render backend-supplied strings as HTML (no `dangerouslySetInnerHTML`).
   - Scanned URLs in `input_display` and redirect hops must be shown defanged (e.g. `hxxps://...[.]com`) in plain text / mono block.
   - Never make scanned/reported URLs clickable.
4. **Blockchain Integrity Note:**
   - Every verification / onchain view must include the notice:
     `"The blockchain proves integrity and history of a report, not the truth of its contents."`
5. **Screen Scope:**
   - Maintain four core screens:
     - `/`: Scan input (URL + Message) & recent reports list
     - `/report/[id]`: Detailed report (gauge, indicators, redirects, TLS, headers, AI explanation, onchain status, limitations)
     - `/intel`: Threat intelligence correlation clusters
     - `/verify`: On-chain cryptographic integrity verification

## Commands
- Dev Server: `npm run dev` (run from `frontend/`)
- Build: `npm run build`
- Lint: `npm run lint`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
