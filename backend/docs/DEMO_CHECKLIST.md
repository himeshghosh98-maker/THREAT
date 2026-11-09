# Local demo checklist

Run PowerShell commands from the indicated directory. Use Python 3.12 and Node.js 22 or 24. On first setup, from backend run the following.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm.cmd ci --prefix contracts
```

## Start order

1. **Chain.** From backend, run the commands below if a local registry is not already deployed. Hardhat listens on loopback port **8545**, chain ID **31337**. The helper deploys a contract each time it runs. The first deployment on a fresh default node uses `0x5FbDB2315678afecb367f032d93F642f64180aa3`. Use the public address printed by the readiness check for this run. The backend reads contracts/deployments/localhost.json unless CONTRACT_ADDRESS overrides it.

```powershell
$env:CHAIN_MODE = 'local'
.\scripts\start_local_chain.ps1
```

2. **Backend.** From backend, run the readiness command. It seeds the configured database, checks the two synthetic clusters and verifies local seed receipts. It reuses a healthy API on **8001** or starts one for the smoke test and stops it afterwards. If using an existing API, start it from the same backend directory with the same database and local registry settings. When the command exits successfully, start a persistent server for the presentation if the command supplied the temporary one.

```powershell
.\scripts\prepare_demo.ps1
# In the backend terminal, if there is no persistent server yet:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --no-access-log
```

3. **Frontend.** From frontend in a second terminal, run the following. Open http://localhost:3000. The API base address excludes the /api/v1 suffix.

```powershell
npm.cmd ci
$env:NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8001'
$env:NEXT_PUBLIC_USE_MOCKS = 'false'
npm.cmd run dev -- --port 3000
```

## Demonstrate

| Input or action | Expected observation |
|---|---|
| https://github.com and https://www.google.com | Low risk when core checks complete. Missing headers can contribute a few points. |
| https://paypa1.com | Suspicious or higher, even if online checks fail. |
| Cached OpenPhish entry | The readiness command submits one exact cached URL only to the scan API. Show its confirmed_malicious report in the Reports view. |
| SBI KYC update required immediately or your account will be blocked. Verify at hxxps://sbi-secure-login[.]invalid/kyc. | Suspicious. The unavailable linked domain lowers confidence. |
| Are you free for lunch on Saturday? | Low risk. |
| http://127.0.0.1 | Scan API rejects the input with HTTP 422. |
| Publish the friend report, then Verify | Local receipt, matching hash, and submission history. Integrity and history do not establish the truth of a report. |
| List correlations | The two seeded reports share a redirect target and a certificate fingerprint. Additional real scans can create more clusters. |

Preparation keeps real scans and rebuilds the unpublished fixtures under their stable IDs. Each smoke run saves fresh scan reports and publishes one. The synthetic fixture timestamps are preserved across reruns. Optional Google Safe Browsing and model keys are reported by configuration status only.

## Limitations and recovery

- **Network.** DNS, HTTP, TLS, RDAP and certificate transparency depend on external services. Some sites block automated requests. www.sbi.co.in returned an inconclusive result when its redirect ended in HTTP 404. Inspect checks_failed and retry when connectivity returns. The command exits nonzero if a benign demo site fails its low-risk expectation.
- **Feed.** Feeds cover known threats. The cache retains hashes for six hours. The command obtains sample text from the publisher and confirms its exact digest against the cache. An empty or stale cache is refreshed, as is a fresh cache when the publisher has rotated every entry. If the publisher is unreachable, restore network access, run `.\.venv\Scripts\python.exe -m scripts.refresh_feeds` from backend, then rerun preparation. An existing snapshot survives a failed refresh. Google Safe Browsing is unavailable unless GOOGLE_SAFE_BROWSING_KEY is configured.
- **Chain.** If port 8545 is down or the registry is absent, run the chain commands in step 1, then rerun preparation. Clear a stale CONTRACT_ADDRESS override or point it to the deployment manifest's address. The command republishes missing local seed receipts and verifies them. To restore other published local reports after a node reset, run `.\.venv\Scripts\python.exe -m scripts.reseed_chain_receipts` from backend.
- **Database or port.** Check DATABASE_URL and database connectivity. If port 8001 belongs to another service or a backend using different settings, stop that process in its own terminal and rerun preparation. Existing API servers are left running. The chain helper prints a stop command for a node it started.
