import re

from app.ai.privacy import CONTACT_OR_LINK, EMAIL, PHONE, display_link, refang
from app.analyzers.phishing import BRANDS
from app.models.schemas import Impersonation, Indicator, MessageAnalysis

URGENCY = re.compile(r"\b(urgent(?:ly)?|immediately|act now|final notice|within \d+ (?:hours?|minutes?)|last chance)\b", re.I)
JOB = re.compile(r"\b(job|recruiter|employment|hiring|interview)\b", re.I)
PARCEL = re.compile(r"\b(parcel|package|courier|redelivery|delivery)\b", re.I)
CREDENTIALS = re.compile(r"\b(?:send|reply with|share|enter|provide)\b.{0,35}\b(?:otp|pin|cvv|password|passcode)\b", re.I)
KYC = re.compile(r"\bkyc\b", re.I)
BRAND = re.compile(r"\b(?:" + "|".join(map(re.escape, ["axis bank", "india post", *BRANDS])) + r")\b", re.I)
ADVANCE = re.compile(r"\b(?:(?:pay|send|remit|submit)\b.{0,40}\b(?:fee|deposit|payment)|(?:registration|processing) fee (?:required|due)|refundable deposit|pay to receive)\b", re.I)
DOCUMENTS = re.compile(r"\b(?:send|upload|submit|provide)\b.{0,40}\b(?:documents?|passport|aadhaar|identity proof)\b", re.I)
REWARD = re.compile(r"\b(?:claim|collect|receive|won)\b.{0,35}\b(?:refund|prize|lottery|jackpot)\b", re.I)
COLLECT = re.compile(r"\bupi collect(?:ion)? request|\b(?:approve|accept)\b.{0,25}\bupi\b", re.I)
BLOCK = re.compile(r"\baccount\b.{0,30}\b(?:block(?:ed)?|suspend(?:ed)?|frozen)\b", re.I)


def unique(values):
    return list(dict.fromkeys(values))


def extract_links(text):
    return unique(refang(match.group()) for match in CONTACT_OR_LINK.finditer(text) if match.lastgroup == "link")


def analyze_message(message: str) -> tuple[MessageAnalysis, list[Indicator]]:
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
    brand = BRAND.search(message)
    target = brand.group() if brand and any(i.severity == "high" for i in indicators) else None
    if target:
        flag("claimed-identity", "Possible impersonation", bool(links))
    emails = [re.sub(r"\s*\[at\]\s*", "@", m[0], flags=re.I).replace("[.]", ".").lower().replace("[dot]", ".")
              for m in EMAIL.finditer(message)]
    analysis = MessageAnalysis(extracted_urls=[display_link(link) for link in links],
                               extracted_emails=unique(emails), extracted_phones=unique(m[0] for m in PHONE.finditer(message)),
                               urgency_signals=signals, impersonation=Impersonation(detected=bool(target), target=target),
                               explanation="Local rules checked time pressure, credential requests, payment requests and claimed identities.")
    return analysis, indicators
