import re

from app.ai.privacy import CONTACT_OR_LINK, EMAIL, PHONE, display_link, refang
from app.models.schemas import Impersonation, Indicator, MessageAnalysis

URGENCY = re.compile(r"\b(urgent(?:ly)?|immediately|act now|final notice|within \d+ (?:hours?|minutes?)|last chance)\b", re.I)
JOB = re.compile(r"\b(job|recruiter|employment|hiring|interview)\b", re.I)
PARCEL = re.compile(r"\b(parcel|package|courier|redelivery|delivery)\b", re.I)
FEE = re.compile(r"\b(?:pay|remit|deposit|fee|payment)\b", re.I)
CREDENTIALS = re.compile(r"\b(?:send|reply with|share|enter|provide)\b.{0,35}\b(?:otp|pin|password|passcode)\b", re.I)
KYC = re.compile(r"\bkyc\b", re.I)
BRAND = re.compile(r"\b(sbi|hdfc|icici|axis bank|paytm|india post|fedex|dhl)\b", re.I)


def unique(values):
    return list(dict.fromkeys(values))


def extract_links(text):
    return unique(refang(match.group()) for match in CONTACT_OR_LINK.finditer(text) if match.lastgroup == "link")


def analyze_message(message: str) -> tuple[MessageAnalysis, list[Indicator]]:
    links = extract_links(message)
    signals = unique(m.group().lower() for m in URGENCY.finditer(message))
    indicators = []

    def flag(key, title, detail):
        indicators.append(Indicator(id=key, category="social_engineering", title=title,
                         severity="medium", evidence=detail, source="Local message rules"))

    if signals:
        flag("urgent-language", "Time pressure", "The message uses urgency language.")
    if JOB.search(message) and FEE.search(message):
        flag("job-fee", "Job-related payment request", "Employment language appears alongside a fee or payment request.")
    if PARCEL.search(message) and FEE.search(message):
        flag("delivery-fee", "Delivery payment request", "A delivery message refers to a fee or payment.")
    if KYC.search(message) and (links or signals or re.search(r"block|suspend", message, re.I)):
        flag("kyc-request", "Pressured identity verification", "KYC language occurs with a link, time pressure or account restriction.")
    if CREDENTIALS.search(message) and not re.search(r"\b(?:never|do not|don't)\s+(?:share|send|provide|enter)", message, re.I):
        flag("credential-request", "Credential solicitation", "The message asks for a password, PIN or one-time code.")
    brand = BRAND.search(message)
    target = brand.group() if brand and indicators else None
    if target:
        flag("claimed-identity", "Possible impersonation", f"The message references {target} alongside a solicitation or pressure cue.")
    emails = [re.sub(r"\s*\[at\]\s*", "@", m[0], flags=re.I).replace("[.]", ".").lower().replace("[dot]", ".")
              for m in EMAIL.finditer(message)]
    analysis = MessageAnalysis(extracted_urls=[display_link(link) for link in links],
                               extracted_emails=unique(emails), extracted_phones=unique(m[0] for m in PHONE.finditer(message)),
                               urgency_signals=signals, impersonation=Impersonation(detected=bool(target), target=target),
                               explanation="Local rules checked time pressure, credential requests, payment requests and claimed identities.")
    return analysis, indicators
