import re

from app.analyzers.phishing import evidence
from app.models.schemas import SecurityHeader

LIMIT = "Only the final HTTP response was inspected. Other pages and browser behavior may differ."


async def analyze(page):
    result = await page
    if result.failed or result.headers is None or not result.chain or result.chain[-1].status >= 400:
        raise ValueError("Page response unavailable")
    headers = result.headers
    https = result.chain[-1].url.startswith("hxxps://")
    findings, indicators = [], []

    def finding(key, issue, observed, impact, remediation, severity="low"):
        findings.append(SecurityHeader(issue=issue, evidence=observed, impact=impact, severity=severity,
                                       remediation=remediation, limitations=LIMIT))
        indicators.append(evidence(key, "headers", issue, severity, observed, "Final HTTP response"))

    checks = [
        ("strict-transport-security", "HSTS", "Future visits may use HTTP.", "Set HSTS on HTTPS responses."),
        ("content-security-policy", "CSP", "Browser resource restrictions are absent.", "Set a restrictive CSP."),
        ("x-frame-options", "X-Frame-Options", "Framing may enable clickjacking.", "Restrict framing with CSP frame-ancestors or X-Frame-Options."),
        ("x-content-type-options", "X-Content-Type-Options", "Browsers may sniff content types.", "Set X-Content-Type-Options to nosniff."),
        ("referrer-policy", "Referrer-Policy", "Referrer disclosure depends on browser defaults.", "Set an explicit referrer policy."),
    ]
    for header, label, impact, remediation in checks:
        if header == "strict-transport-security" and not https:
            continue
        if header == "x-frame-options" and re.search(r"(?:^|;)\s*frame-ancestors\s", headers.get("content-security-policy", ""), re.I):
            continue
        if not headers.get(header):
            finding(header, f"Missing {label}", f"{label} was absent from the final response.", impact, remediation)
    if not https:
        finding("http-page", "HTTP-only response", "The final response used HTTP.",
                "Traffic can be intercepted in transit.", "Serve this resource over HTTPS.", "medium")

    missing = set()
    for cookie in headers.get_list("set-cookie"):
        attrs = {}
        for item in cookie.split(";")[1:]:
            name, _, value = item.strip().partition("=")
            attrs[name.lower()] = value.lower()
        for flag in ("secure", "httponly"):
            if flag not in attrs:
                missing.add(flag)
        if attrs.get("samesite") not in {"strict", "lax", "none"}:
            missing.add("samesite")
    for attr in sorted(missing):
        finding("cookie-" + attr, f"Cookie lacks {attr} protection", f"A Set-Cookie lacked a valid {attr} attribute.",
                "Cookie protections depend on its intended use.", "Set appropriate Secure, HttpOnly and SameSite attributes.")
    if re.search(r"\b[\w.-]+/\d+\.\d+", headers.get("server", "")):
        finding("server-version", "Server version disclosure", "The Server header contains a version number.",
                "Version information aids fingerprinting.", "Omit software versions from the Server header.")
    if https and "html" in headers.get("content-type", "").lower() and re.search(
            rb"""\b(?:src|action)\s*=\s*["']?http://""", result.body, re.I):
        finding("mixed-content", "Mixed-content hint", "The response contains an HTTP resource or form reference.",
                "A browser may block or expose this request.", "Use HTTPS references.", "medium")
    return findings, indicators
