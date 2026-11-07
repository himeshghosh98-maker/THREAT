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

SQLite stores reports in artifacts/reports.db by default. Application startup and the seed script initialize the schema. Run the seed script to insert six samples, three suspicious and three low risk. Rerunning it preserves existing reports. Set DATABASE_URL to a PostgreSQL URL to use psycopg. Set CORS_ORIGINS to comma-separated browser origins. The default is http://localhost:3000.

## URL scans

POST /api/v1/scan/url runs URL structure, DNS, RDAP registration age and HTTP redirect checks concurrently. Every HTTP connection uses a validated public IP with the requested hostname for HTTP and TLS. The fetcher follows at most five redirects within eight seconds and reads at most one million bytes of text. Reports retain only defanged origins in the hop list. The URL scan endpoint accepts ten requests per minute per client IP per process.

A missing check reduces confidence. A report without indicators is inconclusive if any check failed. Two high-severity findings produce high risk. Confirmed malicious is reserved for future authoritative intelligence. The tests replace external DNS and HTTP transports with deterministic fixtures.

Message scans still check urgency phrases. The seed command generates six local fixtures without network access. Two share a synthetic redirect for the correlations view.

Publish stores a simulated receipt on the local database. Verify recomputes the report hash and compares it with that receipt. Before publication it returns match=false, a null onchain_hash and an empty history. The local-stub network and zero contract address identify simulated results. No blockchain or LLM service is contacted.
