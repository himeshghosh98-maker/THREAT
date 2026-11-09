import json
import re
from urllib.parse import urlsplit
from pydantic import HttpUrl

from app.ai.privacy import CONTACT_OR_LINK, EMAIL, PHONE, UPI, display_link, refang, ocr_text
from app.analyzers.phishing import DATA, brand_aliases, extract
from app.models.schemas import Impersonation, Indicator, MessageAnalysis

PATTERNS = json.loads((DATA / "scam_patterns.json").read_text())
compiled = {key: re.compile(pattern, re.I) for key, pattern in PATTERNS["patterns"].items()}
URGENCY = compiled["urgency"]
JOB = compiled["job"]
PARCEL = compiled["parcel"]
CREDENTIALS = compiled["credentials"]
KYC = compiled["kyc"]
BRAND = re.compile(r"\b(?:" + "|".join(map(re.escape, sorted(brand_aliases(), key=lambda name: (-len(name), name)))) + r")\b", re.I)
ADVANCE = compiled["advance"]
DOCUMENTS = compiled["documents"]
REWARD = compiled["reward"]
COLLECT = compiled["collect"]
BLOCK = compiled["block"]


DATA_RULES = [(row["id"], row["category"], re.compile(r"\b(?:" + row["pattern"] + r")\b", re.I))
              for row in PATTERNS["signals"]]


def unique(values):
    return list(dict.fromkeys(values))


def extract_links(text):
    links = []
    for match in CONTACT_OR_LINK.finditer(UPI.sub(" ", ocr_text(text))):
        if match.lastgroup != "link":
            continue
        raw = match.group()
        url = refang(raw)
        try:
            parsed = HttpUrl(url)
        except ValueError:
            # Preserve explicit unsupported schemes for the existing rejection path.
            if "://" in raw:
                links.append(url)
            continue
        if "://" not in raw and not raw.lower().startswith("www.") and not (
                extract(parsed.host).suffix or parsed.host.endswith((".example", ".invalid"))):
            continue
        links.append(str(parsed))
    return unique(links)


def analyze_message(message: str) -> tuple[MessageAnalysis, list[Indicator]]:
    message = ocr_text(message)
    links = extract_links(message)
    signals = unique(m.group().lower() for m in URGENCY.finditer(message))
    indicators = []

    def flag(key, title, strong=True):
        indicators.append(Indicator(id=key, category="social_engineering", title=title,
                         severity="high" if strong else "low", evidence=title, source="Local message rules"))

    if signals:
        flag("urgent-language", "Time pressure", bool(links))
    if JOB.search(message) and ADVANCE.search(message):
        flag("job-fee", "Job-related payment request")
    elif ADVANCE.search(message):
        flag("advance-fee", "Advance-fee request")
    if JOB.search(message) and DOCUMENTS.search(message):
        flag("job-documents", "Employment document solicitation")
    if REWARD.search(message):
        flag("reward-claim", "Refund or prize solicitation")
    if COLLECT.search(message):
        flag("upi-collect", "UPI collect request")
    if BLOCK.search(message) and not KYC.search(message):
        flag("account-threat", "Account restriction threat")
    if PARCEL.search(message) and ADVANCE.search(message):
        flag("delivery-fee", "Delivery payment request")
    if KYC.search(message) and (links or signals or re.search(r"block|suspend", message, re.I)):
        flag("kyc-request", "Pressured identity verification")
    if CREDENTIALS.search(message) and not re.search(r"\b(?:never|do not|don't)\s+(?:share|send|provide|enter)", message, re.I):
        flag("credential-request", "Credential solicitation")
    normalized = re.sub(r"[^\w]+", " ", message.casefold())
    for key, category, pattern in DATA_RULES:
        if pattern.search(normalized) and not any(i.id == key for i in indicators):
            flag(key, category)
    brand = BRAND.search(message)
    target = brand.group() if brand and any(i.severity == "high" for i in indicators) else None
    if target:
        flag("claimed-identity", "Possible impersonation", bool(links))
    ambiguity = set()
    for link in links[:5]:
        try:
            host = urlsplit(link).hostname or ""
        except ValueError:
            continue
        for pattern, category in [(r"[1liI]", "l/1/I"), (r"[0oO]", "0/O"), (r"rn|m", "rn/m"), (r"vv|w", "vv/w")]:
            if re.search(pattern, host.removeprefix("www.").rsplit(".", 1)[0]):
                ambiguity.add(category)
    if ambiguity:
        indicators.append(Indicator(id="ocr-ambiguity", category="social_engineering", title="Possible OCR ambiguity",
                                    severity="info", evidence=", ".join(sorted(ambiguity)), source="Local OCR rules"))
    if UPI.search(message):
        indicators.append(Indicator(id="upi-address", category="social_engineering", title="UPI address present",
                                    severity="info", evidence="Payment address", source="Local message rules"))
    emails = [re.sub(r"\s*\[at\]\s*", "@", m[0], flags=re.I).replace("[.]", ".").lower().replace("[dot]", ".")
              for m in EMAIL.finditer(message)]
    analysis = MessageAnalysis(extracted_urls=[display_link(link) for link in links],
                               extracted_emails=unique(emails), extracted_phones=unique(m[0] for m in PHONE.finditer(message)),
                               urgency_signals=signals, impersonation=Impersonation(detected=bool(target), target=target),
                               explanation="Local rules checked time pressure, credential requests, payment requests and claimed identities.")
    return analysis, indicators
