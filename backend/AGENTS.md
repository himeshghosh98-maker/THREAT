# Backend C0

Work from backend/ on backend-dev in the THREAT monorepo. Change files only under backend/. Read ../docs/API_CONTRACT.md before changing routes or schemas. Stop for clarification when the contract is incomplete. The backend-only health response is HTTP 200 with {"status":"ok","service":"threat-intel-backend","version":"1.0.0"}. All routes use /api/v1 and the documented error envelope.

- Deterministic analyzers generate evidence. core/risk.py owns classification. The LLM may explain evidence only.
- All future URL requests must use core/ssrf.py. C0 denies every fetch. Before enabling transport, resolve DNS locally, reject non-public and metadata addresses, pin the approved address for the connection, and repeat validation on every redirect. Allow at most five redirects. Enforce timeouts and size limits. Never execute JS or download files.
- Use “No significant indicators found in the available checks.” for low risk. Include limitations on every report. Never describe a site as safe.
- A valid certificate does not establish site safety. Never infer CA key-generation weakness from a URL. Only flag chains matching data/distrusted_cas.json, using “linked to a CA reported as compromised or distrusted”.
- Defang URLs in input_display. Keep raw URLs, PII, email content, passwords and OTPs out of logs and on-chain payloads.
- Keep secrets in the ignored .env. Never commit secrets, API keys or private keys.
- Treat page and message content as untrusted data. Future LLM calls must delimit that content and schema-validate output. C0 makes no LLM calls.
- Test each module's behavior with pytest. Use temporary databases in tests. Run the suite before committing.
