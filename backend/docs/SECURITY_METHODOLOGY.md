# Security methodology

## Requests and outbound connections

The HTTP boundary counts bytes before parsing a request, including bodies delivered in chunks. It rejects bodies above 65,536 bytes. SlowAPI applies independent ten-per-minute quotas to each POST endpoint for each client IP. These counters are process-local. The request log emits JSON containing only the event name, HTTP method, status and elapsed milliseconds. Uvicorn access logging is disabled. Responses set browser content, framing, referrer, cache and permissions policies; HTTPS responses also set HSTS.

Scan targets must use HTTP or HTTPS on ports 80, 443, 8080 or 8443. The fetcher rejects credentials in the authority and resolves DNS before connecting. Non-public, metadata, loopback, link-local, private, reserved and disallowed IPv6 transition addresses are rejected. A mixed public/private answer fails validation. The connection uses a validated numeric address with the original Host and TLS server name. Every redirect triggers a new validation. The fetch budget is five redirects, twenty seconds by default and one million bytes of response text. Attachments and non-text response bodies are skipped. JavaScript is never executed.

TLS inspection uses the pinned address and platform trust store. If validation fails it can retry that address solely to inspect the peer certificate. Header findings describe the observed final response. Successful certificate transparency responses are cached by host for 24 hours. Lookup has a 20-second total deadline and one retry. The integer count is -1 when unknown, accompanied by a failed check and a note. The local CA list contains synthetic training entries; it does not establish an incident affecting a real issuer. A URL scan cannot diagnose how a CA generated its private keys.

## Evidence and decisions

Rules check brand resemblance, confusable characters, URL structure, registration age, DNS, redirects, TLS, response headers and message tactics. Strong evidence determines classification. Hygiene contributes at most six points and short DNS TTL contributes zero. Low risk and inconclusive use 0-19, suspicious 20-59, high risk 60-99 and authoritative matches 100. One strong indicator is suspicious. Multiple strong indicators or one critical strong indicator produce high risk. Urgency-bearing messages without authoritative matches are capped at suspicious. With no strong evidence, incomplete core checks or coverage below half produce inconclusive. Confidence is the completed share of attempted check weight. HTTP, local message rules and each threat source carry 3 units, DNS, TLS and URL structure carry 2, and each other check carries 1. Unconfigured sources are omitted. A failed check caps the rounded result at 0.99.

OpenPhish Community Feed entries are cached for six hours as URL and host hashes. An exact URL match or an authoritative Google Safe Browsing v4 hit can confirm maliciousness. A host-only match cannot identify the specific path. Missing keys, stale feeds that cannot refresh and failed lookups reduce coverage. The Phishing.Database source checks complete HTTP(S) records in a 128 KiB prefix of its active list. Host-only matches are suppressed on shared platforms. URL hashes normalize case and default ports in the authority, unreserved percent escapes, fragments and trailing slashes. Google Lookup, when configured, receives the submitted URL without its fragment.

Message rules extract links, contact identifiers and social-engineering cues. Up to five distinct links use the URL pipeline. Time pressure alone contributes hygiene points. An authoritative match on a linked URL is required to confirm a message. Child evidence is recorded with the parent.

## Model boundary and data minimisation

Risk is computed before the optional model call. Evidence and masked message text are escaped, bounded by delimiters and treated as data. Model instructions forbid inventing evidence, assigning a verdict or obeying instructions from those blocks. Pydantic validation, indicator references, output checks, a 15-second attempt timeout and one retry guard the explanation path. Failure produces the deterministic template. These controls reduce prompt-injection exposure; generated prose still requires judgment.

Reports retain defanged origins, an at-most-80-character redacted message preview and selected evidence. Extracted emails and phones are normalized and stored as salted SHA-256 digests in reports and the indicator index. The installation salt is generated once and stored in its database. These identifiers allow equality matching and are pseudonymous; an attacker with the database can guess low-entropy phone numbers. A shared registrar, CDN, certificate or redirect destination does not establish common malicious ownership.

Only a Keccak report digest and an allowed risk category are supplied as submission arguments. The chain also records the submitting address, timestamps, status and revision events. Raw URLs, domains, contact details, free-text evidence and model prose are never submitted. Verification establishes integrity and event history for the selected projection of the report.

## Limits of detection

There is no browser execution, user interaction, authenticated crawling or exploit testing. One response can miss content shown to another browser, location or user. Shared infrastructure, short DNS lifetimes, header omissions and ordinary payment language can trigger false positives. Feeds and brand lists have coverage gaps. The example cases are too small to measure accuracy. The API has no user authentication; local setup binds to loopback.

## Calibration protocol

The fixed 120-case corpus has a stratified tune/test split. Tune weights, thresholds, keywords and brand records only on tune cases. Freeze the detector before evaluating test. Report all held-out errors and never move cases between splits. The regression gate repeats each case twice. Run `python -m scripts.accuracy_eval --split all --report` to reproduce the full report after freezing a detector. The optional `--live` flag runs the same API pipeline with real network data. The same-input determinism gate uses offline replay. Running the default command below inspects only the tune split.

    python -m scripts.accuracy_eval --split tune

The unchanged strong-indicator weights are 0, 2, 15, 30 and 50 from informational through critical. Hygiene is capped at two per finding and six in total. A different suffix on an exact brand label is weak. A lookalike plus a credential term or watchlisted suffix supplies a second strong indicator. Generic suffixes alone are weak. Platform tenant labels do not establish platform impersonation. OCR repairs spacing and formatting, scans at most five literal URLs and reports possible letter confusion without generating alternative destinations. UPI identifiers are recognized as a category and redacted; the message schema has no UPI field.

Bank ownership references include the [RBI directory](https://www.rbi.org.in/Scripts/ComplaintBank.aspx). Electricity utility references include the [Maharashtra Energy Department directory](https://energy.maharashtra.gov.in/en/organization/maharashtra-state-electricity-distribution-company-ltd/). The second publisher provides its [active list](https://github.com/Phishing-Database/Phishing.Database). A live URLhaus API request returned HTTP 401. The public PhishTank CSV exceeded the one-million-byte transport limit.
