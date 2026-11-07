# Threat intelligence backend

Python 3.12 and FastAPI serve the integration API at /api/v1. Use the repository's docs/API_CONTRACT.md for the shared schemas. GET /api/v1/health returns HTTP 200 with {"status":"ok","service":"threat-intel-backend","version":"1.0.0"}.

## Run on Windows

From backend/ in PowerShell, with the Python 3.12 launcher installed:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m scripts.seed
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000
```

With uv, use `uv venv --python 3.12 .venv` and `uv pip install --python .venv\Scripts\python.exe -r requirements.txt` for the first two commands. Copy the example only on initial setup. With the virtual environment activated, the server command is `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

Open http://localhost:8000/docs for interactive requests. Test with `.\.venv\Scripts\python.exe -m pytest`.

## Data and configuration

SQLite stores reports in artifacts/reports.db by default. Application startup and the seed script initialize the schema. Run the seed script to insert seven samples, four suspicious and three low risk. Rerunning it updates unpublished fixtures with deterministic explanations and backfills TLS data on URL fixtures. Published reports retain their original content. Set DATABASE_URL to a PostgreSQL URL to use psycopg. Set CORS_ORIGINS to comma-separated browser origins. The default is http://localhost:3000.

## URL scans

POST /api/v1/scan/url runs URL structure, DNS, RDAP registration age and HTTP redirect checks alongside TLS certificate inspection, certificate transparency, passive headers and threat intelligence. Every HTTP connection uses a validated public IP with the requested hostname for HTTP and TLS. The fetcher follows at most five redirects within eight seconds and reads at most one million bytes of text. Reports retain only defanged origins in the hop list. The URL scan endpoint accepts ten requests per minute per client IP per process.

A missing check reduces confidence. A report without indicators is inconclusive if any check failed. Two high-severity findings produce high risk. An exact OpenPhish URL match or Google Safe Browsing lookup hit can confirm a malicious URL. A hostname-only match is evidence of a listed URL elsewhere on the same host. DNS, HTTP and TLS are mocked in the test suite.

OpenPhish Community Feed entries are cached as hashes in the database for six hours. From backend/, run `.\.venv\Scripts\python.exe -m scripts.refresh_feeds` to refresh manually. An expired snapshot and a failed refresh produce an unavailable result. Set GOOGLE_SAFE_BROWSING_KEY in .env to enable Google v4 Lookup, which sends the submitted URL without its fragment to Google. A missing key appears as an unavailable check.

The TLS object describes the submitted HTTPS host. Header checks reuse the final response. The CA list uses synthetic identifiers, including an eMudhra-themed fixture. CT notes summarize the records returned by crt.sh. An unavailable CT lookup is recorded in checks_failed; the required numeric count is then zero and ct_notes explains that the count is unknown.

## Messages and explanations

POST /api/v1/scan/message accepts up to 5,000 characters. It detects urgency, identity-verification requests, employment and delivery fee requests, and possible impersonation. Up to five distinct links go through the same SSRF-protected URL checks. Only an authoritative match on a linked URL can confirm a malicious message. The report stores an 80-character redacted preview, defanged link origins, extracted contact fields and deterministic evidence.

Set LLM_PROVIDER to anthropic (default), openai or gemini. Configure the matching key in your local .env. The default model IDs can be overridden using ANTHROPIC_MODEL (claude-haiku-5-5), OPENAI_MODEL (gpt-4.1-mini) or GEMINI_MODEL (gemini-3.5-flash). The SDKs use ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY for authentication. No key is needed to run offline.

URL and message scans compute risk before requesting a structured explanation. Each request has a 15-second timeout and one retry. Without a configured key or valid response the report uses deterministic-fallback. Message prompts mask contacts, credentials, URLs and unrecognized words. Child URL evidence is included in the parent message explanation. Child scans do not create separate report rows.

The seed command generates seven offline fixtures. Two share a synthetic redirect for the correlations view.

Publish stores a simulated receipt on the local database. Verify recomputes the report hash and compares it with that receipt. Before publication it returns match=false, a null onchain_hash and an empty history. The local-stub network and zero contract address identify simulated results. Publication and verification stay local.
