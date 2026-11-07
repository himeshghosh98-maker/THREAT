# API Contract v1 (base path /api/v1)

## Endpoints
- GET  /health
- POST /scan/url            body: {"url": string}                  -> ScanReport
- POST /scan/message        body: {"message": string}              -> ScanReport
- GET  /reports             query: ?risk=&limit=&offset=           -> {items: ScanReport[], total: number}
- GET  /reports/{id}                                               -> ScanReport
- POST /reports/{id}/publish                                       -> ScanReport (onchain populated)
- GET  /reports/{id}/verify                                        -> VerifyResult
- GET  /intel/correlations                                         -> {clusters: Cluster[]}
Errors: {"error": {"code": string, "message": string}} with proper HTTP status.

## ScanReport
{
  "id": "uuid",
  "created_at": "ISO8601",
  "input_type": "url" | "message",
  "input_display": "defanged text, e.g. hxxps://evil[.]com",
  "domain": "string|null",
  "risk": {
    "classification": "low_risk"|"suspicious"|"high_risk"|"confirmed_malicious"|"inconclusive",
    "score": 0-100,
    "confidence": 0.0-1.0,
    "checks_completed": ["string"],
    "checks_failed": ["string"]
  },
  "indicators": [{
    "id": "string", "category": "typosquat|homograph|url_structure|redirect|domain_age|dns|tls|headers|threat_intel|social_engineering",
    "title": "string", "severity": "info|low|medium|high|critical",
    "evidence": "string", "source": "string"
  }],
  "redirect_chain": [{"url": "string", "status": number, "domain": "string"}],
  "tls": null | {
    "valid": bool, "issuer": "string", "subject": "string", "san": ["string"],
    "not_before": "ISO8601", "not_after": "ISO8601", "days_remaining": number,
    "hostname_match": bool, "key_type": "string", "key_size": number,
    "signature_algorithm": "string", "chain": ["string"],
    "ct_records_count": number, "ct_notes": ["string"],
    "compromised_ca_flag": bool, "findings": ["string"],
    "disclaimer": "A valid certificate is not proof that the site is safe."
  },
  "security_headers": [{
    "issue": "string", "evidence": "string", "impact": "string",
    "severity": "info|low|medium|high|critical",
    "remediation": "string", "limitations": "string"
  }],
  "threat_intel": [{"source": "string", "matched": bool, "detail": "string"}],
  "ai_explanation": null | {
    "summary": "string", "tactics": ["string"], "recommended_actions": ["string"], "model": "string"
  },
  "message_analysis": null | {
    "extracted_urls": ["string"], "extracted_emails": ["string"], "extracted_phones": ["string"],
    "urgency_signals": ["string"], "impersonation": {"detected": bool, "target": "string|null"},
    "explanation": "string"
  },
  "precautions": ["string"],
  "limitations": ["string"],
  "onchain": {
    "status": "not_published"|"published"|"disputed"|"validated"|"revised",
    "report_hash": "0x...|null", "tx_hash": "0x...|null",
    "chain_report_id": number|null, "network": "string|null", "contract_address": "0x...|null"
  }
}

## VerifyResult
{
  "report_id": "uuid", "match": bool,
  "recomputed_hash": "0x...", "onchain_hash": "0x...|null",
  "status": "string", "network": "string", "contract_address": "0x...",
  "history": [{"status": "string", "tx_hash": "0x...", "timestamp": "ISO8601"}],
  "note": "The blockchain proves integrity and history of a report, not the truth of its contents."
}

## Cluster
{"id": "string", "shared_indicator": "string", "indicator_type": "ip|redirect_target|cert_fingerprint|registrar|phone|email",
 "report_ids": ["uuid"], "summary": "string"}

## Rules
- Never display the word "safe" for low_risk. Use "No significant indicators found in the available checks."
- Raw URLs are defanged in input_display; raw URLs and PII never go on-chain.