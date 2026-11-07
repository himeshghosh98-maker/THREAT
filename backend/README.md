# Threat intelligence backend

Python 3.12 and FastAPI serve the C0 integration API at /api/v1. Use the repository's docs/API_CONTRACT.md for the shared schemas. GET /api/v1/health returns HTTP 200 with {"status":"ok","service":"threat-intel-backend","version":"1.0.0"}.

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

## Stub behavior

URL scans inspect only the hostname suffix. Message scans check urgency phrases and withhold message content from stored reports. DNS, redirect, TLS, header and external intelligence checks do not run. Two fixtures share a synthetic redirect for the correlations view. Explanations use deterministic templates.

Publish stores a simulated receipt on the local database. Verify recomputes the report hash and compares it with that receipt. Before publication it returns match=false, a null onchain_hash and an empty history. The local-stub network and zero contract address identify simulated results. No blockchain or LLM service is contacted.
