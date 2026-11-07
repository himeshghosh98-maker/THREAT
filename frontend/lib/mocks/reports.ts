import { ScanReport } from "../types";

export const MOCK_REPORTS: ScanReport[] = [
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-111111111111",
    created_at: "2026-11-07T10:15:30Z",
    input_type: "url",
    input_display: "hxxps://paypa1-security-login[.]com/verify?account=9824",
    domain: "paypa1-security-login.com",
    risk: {
      classification: "high_risk",
      score: 89,
      confidence: 0.94,
      checks_completed: [
        "domain_reputation",
        "dns_resolution",
        "typosquat_detection",
        "tls_inspection",
        "header_analysis",
        "threat_intel_lookup"
      ],
      checks_failed: []
    },
    indicators: [
      {
        id: "ind-101",
        category: "typosquat",
        title: "Brand Impersonation (Typosquatting)",
        severity: "critical",
        evidence: "Domain visually imitates 'paypal.com' replacing 'l' with numeral '1'.",
        source: "Typosquat Detection Engine"
      },
      {
        id: "ind-102",
        category: "domain_age",
        title: "Newly Registered Domain",
        severity: "high",
        evidence: "Domain was registered 2 days ago via privacy-shielded registrar.",
        source: "WHOIS / RDAP"
      },
      {
        id: "ind-103",
        category: "url_structure",
        title: "Suspicious Query Parameter & Login Path",
        severity: "medium",
        evidence: "Path '/verify' with account query mimics auth credential harvesting form.",
        source: "Heuristic Analyzer"
      },
      {
        id: "ind-104",
        category: "threat_intel",
        title: "Threat Feed Correlation",
        severity: "high",
        evidence: "Domain flagged in 2 community anti-phishing telemetry feeds.",
        source: "OpenPhish & AbuseIPDB"
      }
    ],
    redirect_chain: [
      {
        url: "hxxps://paypa1-security-login[.]com/verify?account=9824",
        status: 200,
        domain: "paypa1-security-login.com"
      }
    ],
    tls: {
      valid: true,
      issuer: "Let's Encrypt Authority E6",
      subject: "CN=paypa1-security-login.com",
      san: ["paypa1-security-login.com", "www.paypa1-security-login.com"],
      not_before: "2026-11-05T08:00:00Z",
      not_after: "2027-02-03T08:00:00Z",
      days_remaining: 88,
      hostname_match: true,
      key_type: "RSA",
      key_size: 2048,
      signature_algorithm: "sha256WithRSAEncryption",
      chain: ["paypa1-security-login.com", "Let's Encrypt Authority E6", "ISRG Root X1"],
      ct_records_count: 2,
      ct_notes: ["Logged in Google Argon 2026", "Logged in Cloudflare Nimbus 2026"],
      compromised_ca_flag: false,
      findings: ["Short-lived automated certificate issued 48 hours ago"],
      disclaimer: "A valid certificate is not proof that the site is safe."
    },
    security_headers: [
      {
        issue: "Missing Strict-Transport-Security (HSTS)",
        evidence: "Strict-Transport-Security header was not returned in response",
        impact: "Allows man-in-the-middle downgrade attacks to unencrypted HTTP.",
        severity: "medium",
        remediation: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to response headers.",
        limitations: "Header presence only enforced after initial HTTPS handshake."
      },
      {
        issue: "Missing Content-Security-Policy (CSP)",
        evidence: "No Content-Security-Policy header defined",
        impact: "Leaves client vulnerable to cross-site scripting and unauthorized data exfiltration.",
        severity: "high",
        remediation: "Deploy strict CSP restricting script-src and connect-src.",
        limitations: "CSP requires careful tuning to avoid breaking valid third-party integrations."
      }
    ],
    threat_intel: [
      { source: "OpenPhish", matched: true, detail: "Listed under active credential harvesting targets" },
      { source: "AbuseIPDB", matched: true, detail: "IP 198.51.100.42 reported 14 times for phishing" },
      { source: "AlienVault OTX", matched: false, detail: "No IOC match found" }
    ],
    ai_explanation: {
      summary: "This target domain is an active phishing attempt impersonating PayPal authentication. It uses character substitution (numeral '1' for letter 'l') and was registered within the last 48 hours to deceive users into disclosing account credentials.",
      tactics: [
        "Typosquatting / Visual spoofing of financial institution brand",
        "Credential harvesting form disguised as account verification",
        "Short-lived TLS certificate to display padlock indicator in modern browsers"
      ],
      recommended_actions: [
        "Do not enter any login credentials or personal information.",
        "Block domain across organizational perimeter DNS and firewall filters.",
        "Report to registrar abuse contact and brand anti-fraud department."
      ],
      model: "ThreatAnalyzer-v2.1"
    },
    message_analysis: null,
    precautions: [
      "Verify domains directly via bookmarks or authoritative search engines rather than clicked links.",
      "Enable multi-factor authentication (hardware token or authenticator app) on your primary accounts."
    ],
    limitations: [
      "Analysis is snapshot-based and reflects observable state at scan time.",
      "Dynamic cloaking or geo-fencing may serve benign content to security scanners."
    ],
    onchain: {
      status: "not_published",
      report_hash: null,
      tx_hash: null,
      chain_report_id: null,
      network: null,
      contract_address: null
    }
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-222222222222",
    created_at: "2026-11-07T11:20:00Z",
    input_type: "url",
    input_display: "hxxps://xn--pple-43d-id-recover[.]com/portal",
    domain: "xn--pple-43d-id-recover.com",
    risk: {
      classification: "suspicious",
      score: 74,
      confidence: 0.91,
      checks_completed: [
        "punycode_homograph_inspection",
        "domain_age",
        "dns_ns_lookup",
        "tls_inspection",
        "threat_intel_lookup"
      ],
      checks_failed: []
    },
    indicators: [
      {
        id: "ind-201",
        category: "homograph",
        title: "Internationalized Domain Name (IDN) Homograph Attack",
        severity: "critical",
        evidence: "Decodes to Cyrillic small letter 'а' (U+0430) mimicking Latin 'a' in 'apple'.",
        source: "Punycode & Unicode Normalization Engine"
      },
      {
        id: "ind-202",
        category: "social_engineering",
        title: "Account Recovery Urgency Trap",
        severity: "medium",
        evidence: "Slug contains 'id-recover' matching known Apple ID password-reset lures.",
        source: "Linguistic Heuristic"
      },
      {
        id: "ind-203",
        category: "dns",
        title: "Bulletproof Hosting Nameservers",
        severity: "high",
        evidence: "Nameservers hosted on autonomous system frequently linked to malicious campaigns.",
        source: "BGP / Autonomous System Intelligence"
      }
    ],
    redirect_chain: [
      {
        url: "hxxps://xn--pple-43d-id-recover[.]com/portal",
        status: 302,
        domain: "xn--pple-43d-id-recover.com"
      },
      {
        url: "hxxps://auth-chase-update[.]xyz/login",
        status: 200,
        domain: "auth-chase-update.xyz"
      }
    ],
    tls: {
      valid: true,
      issuer: "ZeroSSL RSA Domain Secure Site CA",
      subject: "CN=xn--pple-43d-id-recover.com",
      san: ["xn--pple-43d-id-recover.com"],
      not_before: "2026-11-01T00:00:00Z",
      not_after: "2027-01-30T23:59:59Z",
      days_remaining: 84,
      hostname_match: true,
      key_type: "RSA",
      key_size: 2048,
      signature_algorithm: "sha256WithRSAEncryption",
      chain: ["xn--pple-43d-id-recover.com", "ZeroSSL Intermediate", "USERTrust RSA CA"],
      ct_records_count: 3,
      ct_notes: ["Logged in Sectigo Mammoth 2026"],
      compromised_ca_flag: false,
      findings: ["Subject Alt Name contains Punycode representation"],
      disclaimer: "A valid certificate is not proof that the site is safe."
    },
    security_headers: [
      {
        issue: "X-Frame-Options Header Absent",
        evidence: "No clickjacking protection header discovered",
        impact: "Vulnerable to iframe-based UI redressing and clickjacking.",
        severity: "medium",
        remediation: "Set X-Frame-Options: DENY or use CSP frame-ancestors 'none'.",
        limitations: "Superseded by modern CSP frame-ancestors directive."
      }
    ],
    threat_intel: [
      { source: "URLhaus", matched: true, detail: "Reported as phishing redirector node" },
      { source: "Google Safe Browsing", matched: false, detail: "Pending categorization" }
    ],
    ai_explanation: {
      summary: "This domain employs a Cyrillic homograph attack to spoof Apple's brand name. Visitors are redirected through an unauthorized credential funnel to harvest credentials.",
      tactics: [
        "IDN homograph substitution using lookalike Unicode glyphs",
        "Multi-stage redirect forwarding victim to secondary payload host"
      ],
      recommended_actions: [
        "Do not supply Apple ID credentials or recovery codes.",
        "Check browser address bar for punycode prefix (xn--)."
      ],
      model: "ThreatAnalyzer-v2.1"
    },
    message_analysis: null,
    precautions: [
      "Pay attention when browser URL displays 'xn--' prefixes instead of expected standard characters."
    ],
    limitations: [
      "Client browser IDN rendering settings vary across operating systems."
    ],
    onchain: {
      status: "not_published",
      report_hash: null,
      tx_hash: null,
      chain_report_id: null,
      network: null,
      contract_address: null
    }
  },
  {
    id: "c3d4e5f6-a7b8-9c0d-1e2f-333333333333",
    created_at: "2026-11-07T12:05:45Z",
    input_type: "url",
    input_display: "hxxp://chase-verify-portal[.]top/auth?ref=alert",
    domain: "chase-verify-portal.top",
    risk: {
      classification: "confirmed_malicious",
      score: 98,
      confidence: 0.99,
      checks_completed: [
        "redirect_chain_analysis",
        "sandbox_payload_scan",
        "threat_intel_correlation",
        "tls_inspection",
        "security_headers"
      ],
      checks_failed: []
    },
    indicators: [
      {
        id: "ind-301",
        category: "redirect",
        title: "Malicious Multi-Hop Redirect Chain",
        severity: "critical",
        evidence: "Redirects across 3 disparate TLDs (.top -> .xyz -> .ru) terminating at known malware drop.",
        source: "HTTP Client Inspection"
      },
      {
        id: "ind-302",
        category: "threat_intel",
        title: "Known Banking Trojan Campaign",
        severity: "critical",
        evidence: "Endpoint payload matches signature for DanaBot financial stealer.",
        source: "Threat Intelligence Gateway"
      },
      {
        id: "ind-303",
        category: "social_engineering",
        title: "Impersonation of Financial Entity",
        severity: "high",
        evidence: "Page contains stolen JPMorgan Chase trademarks and counterfeit CSS assets.",
        source: "DOM Fingerprinter"
      }
    ],
    redirect_chain: [
      {
        url: "hxxp://chase-verify-portal[.]top/auth?ref=alert",
        status: 301,
        domain: "chase-verify-portal.top"
      },
      {
        url: "hxxps://auth-chase-update[.]xyz/login",
        status: 302,
        domain: "auth-chase-update.xyz"
      },
      {
        url: "hxxps://secure-data-grabber[.]ru/vault",
        status: 200,
        domain: "secure-data-grabber.ru"
      }
    ],
    tls: {
      valid: false,
      issuer: "Untrusted Self-Signed Authority",
      subject: "CN=secure-data-grabber.ru",
      san: ["secure-data-grabber.ru"],
      not_before: "2026-10-15T00:00:00Z",
      not_after: "2026-11-15T00:00:00Z",
      days_remaining: 8,
      hostname_match: true,
      key_type: "RSA",
      key_size: 1024,
      signature_algorithm: "sha1WithRSAEncryption",
      chain: ["secure-data-grabber.ru"],
      ct_records_count: 0,
      ct_notes: ["Not present in public CT logs"],
      compromised_ca_flag: true,
      findings: [
        "Weak key size (1024 bits)",
        "Deprecated SHA-1 signature algorithm",
        "Untrusted self-signed root"
      ],
      disclaimer: "A valid certificate is not proof that the site is safe."
    },
    security_headers: [
      {
        issue: "Critical Security Headers Omitted",
        evidence: "No HSTS, CSP, or Referrer-Policy provided",
        impact: "Allows packet interception and credential leakage.",
        severity: "critical",
        remediation: "Terminate host and configure hardened security reverse proxy.",
        limitations: "Site is hostile; remediation is not applicable."
      }
    ],
    threat_intel: [
      { source: "CISA Automated Indicator Sharing", matched: true, detail: "Known active banking phishing infrastructure" },
      { source: "Spamhaus DBL", matched: true, detail: "Domain listed in malware distribution zone" },
      { source: "URLhaus", matched: true, detail: "Confirmed Trojan payload host" }
    ],
    ai_explanation: {
      summary: "This target is a confirmed high-severity banking credential stealer. The initial unencrypted URL executes a multi-hop redirect hopping across multiple rogue domains before attempting to deliver a credential scraping payload over a broken self-signed TLS connection.",
      tactics: [
        "Multi-stage domain hopping to evade automated email boundary filters",
        "Financial brand visual spoofing",
        "Untrusted encryption layer obscuring data exfiltration"
      ],
      recommended_actions: [
        "Block all 3 domains in the redirect chain at the firewall and DNS resolver.",
        "Initiate takedown request with registrars and upstream hosting ASNs.",
        "Warn users who may have clicked recent SMS alerts linking to this campaign."
      ],
      model: "ThreatAnalyzer-v2.1"
    },
    message_analysis: null,
    precautions: [
      "Never navigate past TLS certificate warning dialogues.",
      "Banks never request emergency account verification over plain HTTP or unauthenticated links."
    ],
    limitations: [
      "Terminal payload host may rotate fast-flux IPs every several minutes."
    ],
    onchain: {
      status: "published",
      report_hash: "0x8fa134d1b3e8e72c8469d7b425ef8197aa3b72c5a2c4e365022e379ff7372bc1",
      tx_hash: "0x9ab718e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049a463",
      chain_report_id: 1042,
      network: "Arbitrum Sepolia",
      contract_address: "0x3B62e6D109fD5c697204689E41Eb75945C992c6C"
    }
  },
  {
    id: "d4e5f6a7-b8c9-0d1e-2f3a-444444444444",
    created_at: "2026-11-07T13:40:10Z",
    input_type: "url",
    input_display: "hxxps://github[.]com/torvalds/linux",
    domain: "github.com",
    risk: {
      classification: "low_risk",
      score: 4,
      confidence: 0.98,
      checks_completed: [
        "reputation_check",
        "tls_validation",
        "header_analysis",
        "dns_dnssec",
        "threat_intel_query"
      ],
      checks_failed: []
    },
    indicators: [
      {
        id: "ind-401",
        category: "domain_age",
        title: "Long Established Domain",
        severity: "info",
        evidence: "Domain registered in 2007 (>18 years tenure) with reputable registrar.",
        source: "WHOIS / RDAP"
      },
      {
        id: "ind-402",
        category: "dns",
        title: "Enterprise DNS & CAA Records Present",
        severity: "info",
        evidence: "Authoritative CAA records enforce DigiCert authorized issuance.",
        source: "DNS Analyzer"
      }
    ],
    redirect_chain: [
      {
        url: "hxxps://github[.]com/torvalds/linux",
        status: 200,
        domain: "github.com"
      }
    ],
    tls: {
      valid: true,
      issuer: "DigiCert Global G2 TLS RSA SHA256 2020 CA1",
      subject: "CN=github.com",
      san: ["github.com", "www.github.com"],
      not_before: "2026-03-10T00:00:00Z",
      not_after: "2027-03-15T23:59:59Z",
      days_remaining: 128,
      hostname_match: true,
      key_type: "EC",
      key_size: 256,
      signature_algorithm: "ecdsa-with-SHA256",
      chain: ["github.com", "DigiCert Global G2 TLS RSA SHA256 2020 CA1", "DigiCert Global Root G2"],
      ct_records_count: 5,
      ct_notes: ["Compliant with Chrome CT policy"],
      compromised_ca_flag: false,
      findings: ["Modern ECC certificate with comprehensive CT logging"],
      disclaimer: "A valid certificate is not proof that the site is safe."
    },
    security_headers: [
      {
        issue: "Permissive Cross-Origin-Resource-Policy",
        evidence: "Cross-Origin-Resource-Policy: cross-origin",
        impact: "Allows public asset embedding across third-party websites.",
        severity: "info",
        remediation: "Acceptable for public code hosting platform; restrict if private API.",
        limitations: "Intended architecture for public repository hosting."
      }
    ],
    threat_intel: [
      { source: "Google Safe Browsing", matched: false, detail: "Clean classification" },
      { source: "VirusTotal", matched: false, detail: "0/92 vendor detections" }
    ],
    ai_explanation: {
      summary: "Target is the authoritative code repository for the Linux kernel hosted on GitHub. No indicators of compromise, typosquatting, or unauthorized redirects were detected.",
      tactics: [],
      recommended_actions: [
        "Standard browsing precautions apply when downloading unreviewed code repositories."
      ],
      model: "ThreatAnalyzer-v2.1"
    },
    message_analysis: null,
    precautions: [
      "Always inspect open-source scripts and dependencies before executing locally."
    ],
    limitations: [
      "Low risk classification evaluates domain infrastructure; user-uploaded repository content is not sandbox-executed in this scan."
    ],
    onchain: {
      status: "not_published",
      report_hash: null,
      tx_hash: null,
      chain_report_id: null,
      network: null,
      contract_address: null
    }
  },
  {
    id: "e5f6a7b8-c9d0-1e2f-3a4b-555555555555",
    created_at: "2026-11-07T14:12:00Z",
    input_type: "url",
    input_display: "hxxps://csail[.]mit[.]edu/research/security",
    domain: "csail.mit.edu",
    risk: {
      classification: "low_risk",
      score: 2,
      confidence: 0.97,
      checks_completed: [
        "edu_domain_validation",
        "dnssec_validation",
        "tls_inspection",
        "header_analysis",
        "threat_intel_lookup"
      ],
      checks_failed: []
    },
    indicators: [
      {
        id: "ind-501",
        category: "domain_age",
        title: "Accredited Higher Education Domain (.edu)",
        severity: "info",
        evidence: "Registrar EDUCAUSE confirms authentic Massachusetts Institute of Technology delegation.",
        source: "EDUCAUSE Registry"
      },
      {
        id: "ind-502",
        category: "dns",
        title: "Valid DNSSEC Signature Chain",
        severity: "info",
        evidence: "RRSIG cryptographic proof verified from root anchor.",
        source: "DNSSEC Validator"
      }
    ],
    redirect_chain: [
      {
        url: "hxxps://csail[.]mit[.]edu/research/security",
        status: 200,
        domain: "csail.mit.edu"
      }
    ],
    tls: {
      valid: true,
      issuer: "InCommon RSA Server CA 2",
      subject: "CN=csail.mit.edu",
      san: ["csail.mit.edu", "*.csail.mit.edu"],
      not_before: "2026-01-15T00:00:00Z",
      not_after: "2027-01-16T23:59:59Z",
      days_remaining: 70,
      hostname_match: true,
      key_type: "RSA",
      key_size: 2048,
      signature_algorithm: "sha256WithRSAEncryption",
      chain: ["csail.mit.edu", "InCommon RSA Server CA 2", "USERTrust RSA CA"],
      ct_records_count: 4,
      ct_notes: ["CT logged across Google and Cloudflare logs"],
      compromised_ca_flag: false,
      findings: ["Wildcard SAN matching subdomains"],
      disclaimer: "A valid certificate is not proof that the site is safe."
    },
    security_headers: [
      {
        issue: "Strict-Transport-Security Configured",
        evidence: "max-age=63072000; includeSubDomains; preload",
        impact: "Strong TLS enforcement.",
        severity: "info",
        remediation: "Maintain current header parameters.",
        limitations: "Preload list inclusion requires long-term maintenance commitment."
      }
    ],
    threat_intel: [
      { source: "Cisco Talos", matched: false, detail: "Reputation score 100/100 (Neutral/Favorable)" },
      { source: "Quad9 DNS", matched: false, detail: "No blocklist entry" }
    ],
    ai_explanation: {
      summary: "The target is an official academic department page under MIT's accredited institutional domain. Infrastructure meets rigorous security standards including DNSSEC and HSTS preloading.",
      tactics: [],
      recommended_actions: [
        "No mitigation actions necessary."
      ],
      model: "ThreatAnalyzer-v2.1"
    },
    message_analysis: null,
    precautions: [
      "Ensure outbound links to external academic papers or third-party datasets are verified independently."
    ],
    limitations: [
      "Institutional pages may host student lab projects with differing security policies."
    ],
    onchain: {
      status: "not_published",
      report_hash: null,
      tx_hash: null,
      chain_report_id: null,
      network: null,
      contract_address: null
    }
  },
  {
    id: "f6a7b8c9-d01e-2f3a-4b5c-666666666666",
    created_at: "2026-11-07T14:45:22Z",
    input_type: "url",
    input_display: "hxxps://unknown-edge-node-714[.]biz/api/telemetry",
    domain: "unknown-edge-node-714.biz",
    risk: {
      classification: "inconclusive",
      score: 48,
      confidence: 0.35,
      checks_completed: [
        "dns_lookup",
        "heuristic_url_parser"
      ],
      checks_failed: [
        "tls_handshake_timeout",
        "threat_intel_upstream_unreachable",
        "http_probe_timed_out"
      ]
    },
    indicators: [
      {
        id: "ind-601",
        category: "domain_age",
        title: "Unverified Registrar Information",
        severity: "medium",
        evidence: "WHOIS query rate limited; registration date unavailable.",
        source: "WHOIS / RDAP Client"
      },
      {
        id: "ind-602",
        category: "tls",
        title: "TLS Handshake Unresponsive",
        severity: "medium",
        evidence: "Host failed to complete TLS 1.3 negotiation within 8000ms timeout.",
        source: "Network Socket Probe"
      }
    ],
    redirect_chain: [],
    tls: null,
    security_headers: [],
    threat_intel: [
      { source: "ThreatStream", matched: false, detail: "Connection timed out during query" },
      { source: "AlienVault OTX", matched: false, detail: "No results returned" }
    ],
    ai_explanation: {
      summary: "Scan results are inconclusive due to intermittent network availability and upstream security feed timeouts. The target host refused TLS negotiation.",
      tactics: [
        "Potential geo-blocking or offline host status preventing passive telemetry verification"
      ],
      recommended_actions: [
        "Exercise caution before interacting with this unverified endpoint.",
        "Rescan after several minutes or verify host status via alternative upstream probes."
      ],
      model: "ThreatAnalyzer-v2.1"
    },
    message_analysis: null,
    precautions: [
      "Do not submit credentials or run scripts downloaded from unreachable or unverified services."
    ],
    limitations: [
      "Inconclusive risk state occurs when primary automated verification checks cannot be completed.",
      "Cannot determine safety status without authoritative TLS and HTTP telemetry."
    ],
    onchain: {
      status: "not_published",
      report_hash: null,
      tx_hash: null,
      chain_report_id: null,
      network: null,
      contract_address: null
    }
  },
  {
    id: "7a8b9c0d-1e2f-3a4b-5c6d-777777777777",
    created_at: "2026-11-07T15:00:10Z",
    input_type: "message",
    input_display: "URGENT: Your Chase checking account has been restricted. Visit hxxp://chase-verify-portal[.]top/auth?ref=alert within 2 hours or call +1-800-555-0199.",
    domain: "chase-verify-portal.top",
    risk: {
      classification: "confirmed_malicious",
      score: 97,
      confidence: 0.98,
      checks_completed: [
        "message_nlp_analysis",
        "urgency_detection",
        "impersonation_detection",
        "extracted_url_analysis"
      ],
      checks_failed: []
    },
    indicators: [
      {
        id: "ind-701",
        category: "social_engineering",
        title: "Artificial Urgency Trigger",
        severity: "high",
        evidence: "Message imposes artificial 2-hour deadline to induce panic compliance.",
        source: "NLP Urgency Detector"
      },
      {
        id: "ind-702",
        category: "social_engineering",
        title: "Financial Institution Impersonation",
        severity: "critical",
        evidence: "Claims unauthorized restriction of Chase account without verification context.",
        source: "Entity Matcher"
      },
      {
        id: "ind-703",
        category: "redirect",
        title: "Embedded Malicious Link",
        severity: "critical",
        evidence: "Embedded URL leads to known multi-stage credential harvesting infrastructure.",
        source: "URL Extraction Engine"
      }
    ],
    redirect_chain: [
      {
        url: "hxxp://chase-verify-portal[.]top/auth?ref=alert",
        status: 301,
        domain: "chase-verify-portal.top"
      },
      {
        url: "hxxps://auth-chase-update[.]xyz/login",
        status: 200,
        domain: "auth-chase-update.xyz"
      }
    ],
    tls: null,
    security_headers: [],
    threat_intel: [
      { source: "SMS Phishing Watch", matched: true, detail: "SMS template matched known smishing lure kit" }
    ],
    ai_explanation: {
      summary: "This message exhibits classic indicators of high-risk SMS phishing (smishing). It fabricates an urgent restriction on a bank account to coerce the recipient into opening a malicious credential-harvesting link.",
      tactics: [
        "Psychological coercion via immediate deadline threat",
        "Direct link to deceptive spoofed portal",
        "Social engineering impersonation of Chase Bank"
      ],
      recommended_actions: [
        "Do not click the link or call the phone number provided.",
        "Forward the message to 7726 (SPAM) for carrier-level blocking.",
        "Delete the message immediately."
      ],
      model: "ThreatAnalyzer-v2.1"
    },
    message_analysis: {
      extracted_urls: ["hxxp://chase-verify-portal[.]top/auth?ref=alert"],
      extracted_emails: [],
      extracted_phones: ["+1-800-555-0199"],
      urgency_signals: [
        "URGENT",
        "restricted",
        "within 2 hours"
      ],
      impersonation: {
        detected: true,
        target: "JPMorgan Chase & Co."
      },
      explanation: "Linguistic heuristics identified multiple high-confidence indicators of banking smishing targeting mobile subscribers."
    },
    precautions: [
      "Financial institutions will not demand immediate login verification via unauthenticated SMS links."
    ],
    limitations: [
      "Sender phone number spoofing analysis depends on carrier signaling metadata."
    ],
    onchain: {
      status: "published",
      report_hash: "0x7fa922c1b3e8e72c8469d7b425ef8197aa3b72c5a2c4e365022e379ff7372aa9",
      tx_hash: "0x4fe618e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049b882",
      chain_report_id: 1043,
      network: "Arbitrum Sepolia",
      contract_address: "0x3B62e6D109fD5c697204689E41Eb75945C992c6C"
    }
  }
];
