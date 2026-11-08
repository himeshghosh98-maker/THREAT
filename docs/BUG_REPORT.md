# Threat Intelligence & Digital Trust System — Comprehensive QA Audit Report

## 1. Executive Summary

### 1.1 Audit Snapshot
- **Environment**: Microsoft Windows 11 Pro (`10.0.26200.0`), Python 3.12.13 (backend venv), Node.js v24.19.0, npm 11.17.0.
- **Git State**: Repository `https://github.com/himeshghosh98-maker/THREAT`, branch `main` at commit `5418a19`. Worktrees `wt-backend` (`backend-dev`) and `wt-frontend` (`frontend-dev`) synchronized cleanly.
- **Test Baseline**: Pytest: 130 passed, 2 warnings. Hardhat contract tests: 5 passed. Next.js ESLint: 0 errors, 0 warnings. Next.js Turbopack build: successful.
- **Configuration**: `wt-backend/.env` absent (defaults used, `CHAIN_MODE=local`); `wt-frontend/.env.local` present with `NEXT_PUBLIC_USE_MOCKS=false`.

### 1.2 Bug Counts by Severity and Area

| Severity | Backend (Codex) | Frontend (Antigravity) | Root / Docs (Freebuff) | Total |
| :--- | :---: | :---: | :---: | :---: |
| **BLOCKER** | 2 | 0 | 0 | **2** |
| **HIGH** | 1 | 1 | 0 | **2** |
| **MEDIUM** | 0 | 1 | 2 | **3** |
| **LOW** | 1 | 0 | 0 | **1** |
| **Total** | **4** | **2** | **2** | **8** |

### 1.3 Top 5 Blockers & Critical Issues
1. **B-001 (BLOCKER, Backend)**: `GET /api/v1/reports` crashes with HTTP 503 `chain_unavailable` whenever any report in the query results was published to a contract address not deployed on the current chain session.
2. **B-002 (BLOCKER, Backend)**: Oversensitive classification threshold in `app/core/risk.py` (`score >= WEIGHTS["info"]`) causes all benign websites (`github.com`, `google.com`, `sbi.co.in`, `wikipedia.org`) to be misclassified as `suspicious` (False Positives).
3. **B-003 (HIGH, Backend)**: Unhandled `NXDOMAIN` exception during `AAAA` DNS record queries in `safe_resolve()` causes `safe_fetch()` to fail completely for domains without IPv6 records, failing all outbound network inspections (TLS, redirects, headers).
4. **B-004 (HIGH, Frontend)**: Frontend hardcodes fake network claims (`Arbitrum Sepolia`, `Arbitrum Rollup`) and incorrect hashing claims (`SHA-256 fingerprint`) instead of utilizing API `onchain.network` and `Keccak-256`.
5. **B-006 (MEDIUM, Docs)**: Root `README.md` terminates with `## How to run: TODO`, providing no developer run instructions for the integrated application.

### 1.4 Hackathon Judging Category Estimates (0 to 10)
- **Cybersecurity & Threat Detection (30%)**: **7.5 / 10** — Strict SSRF containment, defanged displays, robust heuristic analysis, and passive header assessment; docked for `safe_resolve` AAAA failure and benign site false positives.
- **AI Implementation (20%)**: **8.5 / 10** — Excellent delimiter protection (`<evidence>`, `<untrusted_message>`), post-generation regex validators prohibiting verdict fabrication or "safe" wording, and PII masking.
- **Web3 Integration (20%)**: **8.0 / 10** — Solid Solidity registry with status tracking, event history, and cryptographic tamper detection; docked for `list_reports` crashing when querying stale on-chain deployments.
- **Technical Implementation (20%)**: **8.0 / 10** — 130 backend unit tests, 5 Hardhat unit tests, clean Next.js 16 App Router architecture; docked for incomplete root `docker-compose.yml` and unfinished root README.
- **Innovation & UX (10%)**: **8.5 / 10** — High-quality dark cybersecurity aesthetic, responsive UI tabs, comprehensive disclaimer visibility, and clear on-chain verification workflow.

---

## 2. Scan Results Table

| Target / Input | Category | Expected Class | Actual Class | Score | Conf | Status | Checks Failed | Notes |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `https://github.com` | Benign | `low_risk` | `suspicious` | 8 | 0.44 | **FAIL** | HTTP redirects, TLS, Headers, CT, GSB | **False Positive** (B-002, B-003) |
| `https://www.google.com` | Benign | `low_risk` | `suspicious` | 8 | 0.44 | **FAIL** | HTTP redirects, TLS, Headers, CT, GSB | **False Positive** (B-002, B-003) |
| `https://en.wikipedia.org` | Benign | `low_risk` | `suspicious` | 8 | 0.44 | **FAIL** | HTTP redirects, TLS, Headers, CT, GSB | **False Positive** (B-002, B-003) |
| `https://www.sbi.co.in` | Benign | `low_risk` | `suspicious` | 8 | 0.44 | **FAIL** | HTTP redirects, TLS, Headers, CT, GSB | **False Positive** (B-002, B-003) |
| `https://www.iitkgp.ac.in` | Benign | `low_risk` | `suspicious` | 8 | 0.44 | **FAIL** | HTTP redirects, TLS, Headers, CT, GSB | **False Positive** (B-002, B-003) |
| `https://paypa1.com` | Lookalike | `suspicious`+ | `suspicious` | 43 | 0.44 | **PASS** | HTTP redirects, TLS, Headers, GSB | Correctly flagged typosquatting |
| `https://g00gle-login.com` | Lookalike | `suspicious`+ | `suspicious` | 43 | 0.44 | **PASS** | HTTP redirects, TLS, Headers, GSB | Correctly flagged typosquatting |
| `http://sbi-secure-login.xyz` | Lookalike | `suspicious`+ | `suspicious` | 43 | 0.44 | **PASS** | HTTP redirects, TLS, Headers, GSB | Correctly flagged brand spoofing |
| `https://xn--pypal-4ve.com` | Homograph | `suspicious`+ | `high_risk` | 78 | 0.44 | **PASS** | HTTP redirects, TLS, Headers, GSB | Flagged punycode homograph |
| `http://127.0.0.1` | SSRF | `rejected` | `rejected` (422) | - | - | **PASS** | None | Blocked at boundary validation |
| `http://localhost` | SSRF | `rejected` | `rejected` (422) | - | - | **PASS** | None | Blocked at boundary validation |
| `http://169.254.169.254/latest/meta-data` | SSRF | `rejected` | `rejected` (422) | - | - | **PASS** | None | Blocked at boundary validation |
| `http://2130706433` | SSRF | `rejected` | `rejected` (422) | - | - | **PASS** | None | Integer IP notation blocked |
| `http://[::1]` | SSRF | `rejected` | `rejected` (422) | - | - | **PASS** | None | IPv6 loopback blocked |
| `file:///etc/passwd` | SSRF | `rejected` | `rejected` (422) | - | - | **PASS** | None | Non-HTTP scheme rejected |
| `http://good.com@127.0.0.1` | SSRF | `rejected` | `rejected` (422) | - | - | **PASS** | None | Userinfo authentication trick rejected |
| `https://zzqx-test-12345.com` | Nonsense | `inconclusive` | `inconclusive` | 0 | 0.22 | **PASS** | DNS, TLS, Headers, Redirects | Correctly flagged as inconclusive |
| KYC scam SMS with link | Message | `suspicious` | `suspicious` | 38 | 0.50 | **PASS** | URL inspection | Detected urgency & suspicious link |
| Fake job offer asking fee | Message | `suspicious` | `suspicious` | 38 | 0.50 | **PASS** | URL inspection | Detected financial fee solicitation |
| Friend casual message | Message | `low_risk` | `low_risk` | 0 | 1.00 | **PASS** | None | Benign text passed as low risk |
| Urgency message (no link) | Message | `low_risk` | `suspicious` | 8 | 1.00 | **FAIL** | None | Urgency alone scored 8 (B-002) |
| Prompt injection KYC scam | Attack | `suspicious` | `suspicious` | 38 | 0.50 | **PASS** | URL inspection | Classification immune to jailbreak |

---

## 3. Brief Compliance & Deliverables Assessment

| Feature / Brief Requirement | Status | Evidence / Notes |
| :--- | :---: | :--- |
| **URL Analysis** | **MET** | Structure, age, domain entropy, homographs, redirects analyzed. |
| **Phishing Detection** | **MET** | Heuristics and OpenPhish snapshot integration active. |
| **TLS Analysis** | **MET** | X.509 validity, SAN, CT logs, synthetic untrusted CA checks implemented. |
| **Mandatory TLS Disclaimer** | **MET** | *"A valid certificate is not proof that the site is safe."* enforced in backend schema & UI. |
| **Rule: Never call a site "safe"** | **MET** | No response verdict uses "safe"; uses *"No significant indicators found..."*. |
| **AI Scam & Message Analysis** | **MET** | PII masked, prompt delimiters enforced, AI cannot override deterministic score. |
| **Risk Classification Engine** | **PARTIAL** | Working structure, but threshold `WEIGHTS["info"]` causes false positives on benign sites. |
| **Passive Security Headers** | **MET** | HSTS, CSP, XFO, XXP, Referrer-Policy passively evaluated without active probes. |
| **Web3 Registry & Integrity** | **MET** | Solidity `ThreatReportRegistry.sol` deployed, handles hashes, statuses, revisions. |
| **No Raw URLs / PII On-Chain** | **MET** | Canonical JSON strips PII and URLs; only Keccak-256 digest & category go on-chain. |
| **Dashboard (4 Screens)** | **MET** | Scan (`/`), Report (`/report/[id]`), Intel (`/intel`), Verify (`/verify`) operational. |
| **Root Setup & Documentation** | **PARTIAL** | `kernal-v2/README.md` ends with `TODO`; `docker-compose.yml` is an empty stub. |

---

## 4. Comprehensive Bug List

### B-001: `GET /api/v1/reports` crashes with HTTP 503 `chain_unavailable` on stale on-chain deployments
- **Severity**: BLOCKER
- **Area**: backend
- **Depends-on**: None
- **Effort**: S (<15 min)
- **Owner**: Codex (`wt-backend`, branch `backend-dev`, edits `backend/` only)
- **Title**: `GET /api/v1/reports` returns HTTP 503 when querying reports published to previous contracts
- **Evidence**: 
  `GET /api/v1/reports?risk=suspicious` returns `503 Service Unavailable: {"error":{"code":"chain_unavailable","message":"The configured registry could not complete the chain request."}}`.
- **Root-Cause Hypothesis**: `app/api/routes_reports.py:31` calls `current_report(row, settings)` for every row. `current_report()` invokes `observed()` whenever `row.receipt` exists. `observed()` attempts to query the contract address recorded in `row.receipt` (`app/web3/registry.py:140`). If that address is from an earlier test session or unmined on the current chain, `Registry.__init__` raises `ChainUnavailable`, crashing the entire listing request instead of falling back to the stored receipt.
- **Expected Behaviour**: `current_report()` should catch `ChainUnavailable` and return `read_report(row)` with the stored receipt onchain data, allowing `GET /reports` to succeed reliably.
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\wt-backend, branch backend-dev, edits in backend/ only. Run git pull and git merge main. Commit message: "fix B-001: handle chain unavailable gracefully in current_report". Push to backend-dev.
BUG: GET /api/v1/reports crashes with HTTP 503 when any report was published on a previous local chain deployment.
IN backend/app/web3/registry.py, in current_report(row, settings), wrap the observed(row, settings)[0] call in a try/except ChainUnavailable block: on exception, return read_report(row).
DO NOT change API contract shapes, SSRF checks, or publish/verify routes.
REGRESSION TEST: Add a test in tests/test_c4.py verifying list_reports returns 200 when a report in DB has a stale contract address.
Print only commit hash and a 3-line summary.
```

---

### B-002: Oversensitive classification threshold flags benign domains and messages as `suspicious`
- **Severity**: BLOCKER
- **Area**: backend
- **Depends-on**: None
- **Effort**: S (<15 min)
- **Owner**: Codex (`wt-backend`, branch `backend-dev`, edits `backend/` only)
- **Title**: Risk engine flags any informational/low indicator (score >= 2) as `suspicious`
- **Evidence**:
  Scanning `https://github.com`, `https://www.google.com`, `https://en.wikipedia.org` produces `classification: "suspicious"`, `score: 8` with a single low indicator `('dns', 'Short address lifetime', 'low')`.
- **Root-Cause Hypothesis**: `backend/app/core/risk.py:16-17`:
  `elif score >= WEIGHTS["info"]:` sets `classification = "suspicious"`. Since `WEIGHTS["info"] = 2`, any score >= 2 (such as an info or low severity finding) triggers `suspicious`.
- **Expected Behaviour**: `suspicious` classification should require a score >= 30 or at least one medium/high indicator. Scores < 30 without medium/high indicators should be `low_risk` (or `inconclusive` if critical checks failed).
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\wt-backend, branch backend-dev, edits in backend/ only. Run git pull and git merge main. Commit message: "fix B-002: adjust suspicious risk score threshold". Push to backend-dev.
BUG: Benign domains with minor DNS/header indicators (score 8) are classified as suspicious because threshold is score >= WEIGHTS["info"] (2).
IN backend/app/core/risk.py: change condition to elif score >= 30: classification = "suspicious". For scores < 30, classify as "inconclusive" if failed or not completed, else "low_risk".
DO NOT change indicator weights or confirmed_malicious rules.
REGRESSION TEST: Ensure score_risk([], ["DNS"], []) returns low_risk and score_risk([Indicator(..., severity='low')], ["DNS"], []) returns low_risk.
Print only commit hash and a 3-line summary.
```

---

### B-003: Unhandled `NXDOMAIN` in `dns_answer` breaks `safe_resolve` on domains lacking AAAA records
- **Severity**: HIGH
- **Area**: backend
- **Depends-on**: None
- **Effort**: S (<15 min)
- **Owner**: Codex (`wt-backend`, branch `backend-dev`, edits `backend/` only)
- **Title**: `safe_resolve()` crashes on `NXDOMAIN` when resolving `AAAA` records
- **Evidence**:
  Running `dns.asyncresolver.resolve('github.com.', 'AAAA')` on local resolvers raises `dns.resolver.NXDOMAIN`. Because `app/core/ssrf.py:66` does not catch `NXDOMAIN`, `safe_resolve()` raises `NXDOMAIN` and aborts all HTTP/TLS checks for `github.com`.
- **Root-Cause Hypothesis**: `backend/app/core/ssrf.py:65-68`:
  `dns_answer(host, record)` calls `dns.asyncresolver.resolve(..., raise_on_no_answer=False)` without catching `NXDOMAIN`, `NoAnswer`, or `DNSException`.
- **Expected Behaviour**: When an `AAAA` (or `A`) query yields `NXDOMAIN` or `NoAnswer`, `dns_answer` should return an empty list `[]` so `safe_resolve` can use whichever address family succeeded.
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\wt-backend, branch backend-dev, edits in backend/ only. Run git pull and git merge main. Commit message: "fix B-003: catch NXDOMAIN in ssrf dns_answer". Push to backend-dev.
BUG: safe_resolve crashes with NXDOMAIN on domains lacking AAAA records, breaking safe_fetch and TLS checks.
IN backend/app/core/ssrf.py, in dns_answer(host, record), wrap the dns.asyncresolver.resolve call in try/except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.DNSException): and return [].
DO NOT remove public_ip validation or SSRF ipaddress checks.
REGRESSION TEST: Verify safe_resolve resolves domains having only IPv4 A records without throwing NXDOMAIN.
Print only commit hash and a 3-line summary.
```

---

### B-004: Frontend hardcodes "Arbitrum Sepolia" and fake SHA-256 claims
- **Severity**: HIGH
- **Area**: frontend
- **Depends-on**: None
- **Effort**: M (<1 hour)
- **Owner**: Antigravity (`wt-frontend`, branch `frontend-dev`, edits `frontend/` only)
- **Title**: Replace hardcoded Arbitrum Sepolia and SHA-256 strings with dynamic onchain attributes
- **Evidence**:
  - `components/report/OnchainTab.tsx:226`: `{onchain.network || "Arbitrum Sepolia"}`
  - `components/report/OnchainTab.tsx:292`: `"writes an immutable SHA-256 fingerprint... to Arbitrum Sepolia"`
  - `components/report/PublishConfirmModal.tsx:67`: `"Network: Arbitrum Sepolia Testnet"`
  - `components/report/SummaryStrip.tsx:232`: `<span className="text-on-surface">Arbitrum Rollup</span>`
  - `app/intel/page.tsx:387`: `"Arbitrum Sepolia anchored"`
  - Screenshot: `docs/audit-screenshots/report_page.png` shows "Arbitrum Sepolia" even when connected to local Hardhat.
- **Root-Cause Hypothesis**: Static UI copy was written targeting Arbitrum before standardizing on Ethereum Sepolia / Local Hardhat with Keccak-256 digests.
- **Expected Behaviour**: Display `onchain.network || "Ethereum Sepolia"` (or `"Local Chain"`), refer to `"Keccak-256 report digest"`, and replace `"Arbitrum Rollup"` with `"EVM Smart Contract"`.
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\wt-frontend, branch frontend-dev, edits in frontend/ only. Run git pull and git merge main. Commit message: "fix B-004: use dynamic onchain network and keccak-256 wording". Push to frontend-dev.
BUG: Hardcoded 'Arbitrum Sepolia', 'Arbitrum Rollup', and 'SHA-256' appear in UI components.
IN frontend/components/report/OnchainTab.tsx, PublishConfirmModal.tsx, SummaryStrip.tsx, and app/intel/page.tsx: replace 'Arbitrum Sepolia' defaults with onchain.network || 'Ethereum Sepolia / Local', replace 'SHA-256' with 'Keccak-256', and replace 'Arbitrum Rollup' with 'EVM Smart Contract'.
DO NOT break verify or publish API integrations.
REGRESSION TEST: Run npm run lint && npm run build.
Print only commit hash and a 3-line summary.
```

---

### B-005: Leftover fake statistics chips ("SOC Tier-1", "Latency 18ms") in UI
- **Severity**: MEDIUM
- **Area**: frontend
- **Depends-on**: None
- **Effort**: S (<15 min)
- **Owner**: Antigravity (`wt-frontend`, branch `frontend-dev`, edits `frontend/` only)
- **Title**: Remove fake latency and SOC tier chips from sidebar and report sidepanel
- **Evidence**:
  - `components/report/SidePanel.tsx:41`: `"SOC Tier-1"`
  - `components/shell/Sidebar.tsx:150`: `"<span>Latency 18ms</span>"`
  - Screenshot: `docs/audit-screenshots/scan_page.png` shows "Latency 18ms" in bottom sidebar.
- **Root-Cause Hypothesis**: Mock chips placed during early UI prototyping were left static.
- **Expected Behaviour**: Replace `"Latency 18ms"` with a dynamic connectivity indicator or remove it; replace `"SOC Tier-1"` with an objective label like `"Automated Triage"`.
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\wt-frontend, branch frontend-dev, edits in frontend/ only. Run git pull and git merge main. Commit message: "fix B-005: remove static fake latency and soc tier chips". Push to frontend-dev.
BUG: Sidebar displays fake static 'Latency 18ms' and report SidePanel displays 'SOC Tier-1'.
IN frontend/components/shell/Sidebar.tsx: remove or replace 'Latency 18ms' with 'System Online'. IN frontend/components/report/SidePanel.tsx: replace 'SOC Tier-1' with 'Heuristic Engine'.
DO NOT modify layout geometry or component exports.
REGRESSION TEST: Run npm run lint && npm run build.
Print only commit hash and a 3-line summary.
```

---

### B-006: Root `README.md` terminates with incomplete `TODO` section
- **Severity**: MEDIUM
- **Area**: docs
- **Depends-on**: None
- **Effort**: S (<15 min)
- **Owner**: Freebuff (`kernal-v2`, branch `main`, root / docs edits only)
- **Title**: Complete root `README.md` with full setup and execution instructions
- **Evidence**:
  `kernal-v2/README.md:25`: Ends abruptly with `## How to run: TODO`.
- **Root-Cause Hypothesis**: Development focused on sub-folder READMEs (`backend/README.md`, `frontend/README.md`), leaving the unified root README unfinished.
- **Expected Behaviour**: Full unified setup instructions covering local chain startup, backend virtualenv & seeding, and frontend dev server execution.
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\kernal-v2, branch main, root docs edits only. Commit message: "docs: complete root README quickstart guide". Push to main.
BUG: Root README.md line 25 ends with '## How to run: TODO'.
IN kernal-v2/README.md: replace '## How to run: TODO' with comprehensive setup instructions:
1. Local Chain & Contracts (npx hardhat node, scripts/start_local_chain.ps1)
2. FastAPI Backend (.venv setup, requirements.txt, scripts.seed, uvicorn)
3. Next.js Frontend (npm install, npm run dev)
DO NOT edit files in backend/ or frontend/.
Print only commit hash and a 3-line summary.
```

---

### B-007: Empty `docker-compose.yml` placeholder fails multi-container orchestration
- **Severity**: MEDIUM
- **Area**: repo
- **Depends-on**: None
- **Effort**: M (<1 hour)
- **Owner**: Freebuff (`kernal-v2`, branch `main`, root edits only)
- **Title**: Implement functional `docker-compose.yml` for backend and frontend services
- **Evidence**:
  `kernal-v2/docker-compose.yml` contains only 2 lines of comments and no service definitions.
- **Root-Cause Hypothesis**: Created as an initial stub and never fleshed out with service blocks.
- **Expected Behaviour**: `docker-compose.yml` should define `backend` (FastAPI building `./backend/Dockerfile`) and `frontend` (Next.js building `./frontend/Dockerfile`) with appropriate network and port bindings (8000 and 3000).
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\kernal-v2, branch main, root edits only. Commit message: "feat: implement working root docker-compose.yml". Push to main.
BUG: docker-compose.yml is an empty 2-line placeholder.
IN kernal-v2/docker-compose.yml: define services for 'backend' (context ./backend, port 8000:8000, env CHAIN_MODE=local) and 'frontend' (context ./frontend, port 3000:3000, env NEXT_PUBLIC_API_BASE_URL=http://backend:8000).
DO NOT touch application code in backend/ or frontend/.
Print only commit hash and a 3-line summary.
```

---

### B-008: OpenPhish cache snapshot is empty (0 entries) upon initial database seed
- **Severity**: LOW
- **Area**: backend
- **Depends-on**: None
- **Effort**: S (<15 min)
- **Owner**: Codex (`wt-backend`, branch `backend-dev`, edits `backend/` only)
- **Title**: Seed database with offline sample OpenPhish feed entries
- **Evidence**:
  Database query on `feed_snapshots` shows: `[('OpenPhish', '2026-11-08 16:17:05', 0)]` with 0 cached entries.
- **Root-Cause Hypothesis**: `backend/scripts/seed.py` creates the `feed_snapshots` table row but leaves `entries: {}` empty unless `scripts/refresh_feeds.py` is invoked with live internet.
- **Expected Behaviour**: `seed.py` should insert a pre-cached sample array of 10-20 offline phishing URL hashes into `feed_snapshots` so feed matching tests function offline without requiring an active GitHub raw feed pull.
- **Fix Prompt**:
```text
REPO CONTEXT: origin https://github.com/himeshghosh98-maker/THREAT, folder C:\Users\Himesh\Desktop\kernal-fresh\wt-backend, branch backend-dev, edits in backend/ only. Run git pull and git merge main. Commit message: "fix B-008: seed offline openphish sample entries". Push to backend-dev.
BUG: seed.py leaves OpenPhish snapshot entries empty, requiring internet access for feed matches.
IN backend/scripts/seed.py: populate feed_snapshots with sample known malicious URL hashes (including test lookup fixtures).
DO NOT modify threat intel analyzer logic in app/analyzers/intel.py.
REGRESSION TEST: Verify test suite passes with pytest.
Print only commit hash and a 3-line summary.
```

---

## 5. Parallel Fix Plan

```
┌────────────────────────────────────────────────────────┐
│                        ROUND 1                         │
│  Codex (wt-backend):                                   │
│    - B-001 (Handle stale chain in current_report)      │
│    - B-003 (Catch NXDOMAIN in ssrf dns_answer)         │
│  Antigravity (wt-frontend):                            │
│    - B-004 (Remove hardcoded Arbitrum / SHA-256)       │
│    - B-005 (Remove fake latency / SOC tier chips)      │
│  Freebuff (kernal-v2):                                 │
│    - B-006 (Complete root README.md)                   │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                        ROUND 2                         │
│  Codex (wt-backend):                                   │
│    - B-002 (Adjust suspicious score threshold in risk) │
│    - B-008 (Seed offline OpenPhish samples)            │
│  Freebuff (kernal-v2):                                 │
│    - B-007 (Implement functional docker-compose.yml)   │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                        ROUND 3                         │
│  Integrator (kernal-v2):                               │
│    - Merge backend-dev & frontend-dev into main        │
│    - End-to-end regression & demo verification         │
└────────────────────────────────────────────────────────┘
```

---

## 6. Not-Bugs & Demo Risk Disclosures

1. **Unconfigured API Keys (Google Safe Browsing & Cloud LLMs)**:
   - When `GOOGLE_SAFE_BROWSING_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` are unset, the system uses deterministic fallbacks and reports `"Google Safe Browsing: not configured"` in `checks_failed`. This is the documented design for self-contained, offline evaluation and not a bug.
2. **Rate Limiting (10 requests/minute per IP)**:
   - Automated bursts of >10 scans return HTTP 429 `rate_limited`. This is intentional DDoS/abuse prevention. During live demos, ensure presenters space scan queries at least 6 seconds apart or demonstrate the 429 error banner as an active security control.
3. **Local Blockchain Reset Behavior**:
   - If the Hardhat node process restarts, chain state (block number and contract deployment) resets to zero. When demonstrating, always deploy the contract (`start_local_chain.ps1`) before launching the backend to ensure contract state matches database receipts.
