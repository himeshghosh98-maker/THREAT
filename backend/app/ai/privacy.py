import re
import unicodedata

from pydantic import HttpUrl

from app.core.defang import display_url

URL = re.compile(r"""(?i)\b(?:(?:[a-z][a-z0-9+.-]*)://|www(?:\.|\[\.\]))[^\s<>"']+""")
EMAIL = re.compile(r"(?i)\b[\w.+%-]+(?:@|\s*\[at\]\s*)[\w-]+(?:(?:\.|\[\.\]|\[dot\])[\w-]+)+")
BARE = r"""(?<![\w.@-])(?:[\w-]+(?:\.|\[\.\]))+[a-z]{2,24}\b(?:[/:?][^\s<>"']*)?"""
CONTACT_OR_LINK = re.compile("(?P<email>" + EMAIL.pattern.removeprefix("(?i)") + ")|(?P<link>" +
                             URL.pattern.removeprefix("(?i)") + "|" + BARE + ")", re.I)
PHONE = re.compile(r"(?<!\w)(?:(?:\+?91|0091|0)[ -]?)?[6-9](?:[ ()-]?\d){9}(?!\d)|(?<!\w)\+\d(?:[ ()-]?\d){7,14}(?!\d)")
ANSI = re.compile(r"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\))")
CREDENTIAL = re.compile(r"(?i)\b(?:api[ _-]?key|secret|password|passcode|otp|token|bearer|pin)\b"
                        r"(?:\s*(?:is|[:=])\s*|\s+)[^\s,;]+")
TOKEN = re.compile(r"(?i)\b(?:sk-[\w-]+|AIza[\w-]+|gh[pousr]_[\w-]+|AKIA[A-Z0-9]{16}|eyJ[\w.-]{15,}|[a-z\d_-]{32,})\b")


def clean_text(text):
    return "".join(" " if c.isspace() else c for c in ANSI.sub("", text)
                   if c.isspace() or unicodedata.category(c) not in {"Cc", "Cf", "Cs"}).strip()


def refang(value):
    value = re.sub(r"(?i)^hxxp", "http", value.rstrip(".,;:!?)}"))
    value = re.sub(r"(?i)\[(?:\.|dot)\]", ".", value)
    return value if "://" in value else "https://" + value


def display_link(value):
    try:
        return display_url(HttpUrl(refang(value)))
    except ValueError:
        return "[URL]"


def redact(text, keys=()):
    for key in keys:
        if key and key.get_secret_value():
            text = text.replace(key.get_secret_value(), "[credential]")
    text = clean_text(text)
    text = CONTACT_OR_LINK.sub(lambda m: "[email]" if m.lastgroup == "email" else display_link(m[0]), text)
    text = PHONE.sub("[phone]", text)
    text = CREDENTIAL.sub("[credential]", text)
    text = TOKEN.sub("[credential]", text)
    return re.sub(r"(?<!\w)\d{4,8}(?!\w)", "[number]", text)


# Only ordinary analysis vocabulary leaves the service in the message block.
# Unknown words can be names, account identifiers, or unlabeled credentials.
VOCABULARY = frozenset("""
a an the to you your our from is are was be has have for and or of on at in now today tomorrow
please urgent urgently immediately act action required within hours minutes final deadline avoid
blocked suspended account bank sbi hdfc icici paytm kyc verify verification update confirm
pay payment fee refundable processing registration delivery redelivery parcel package courier
job offer employment interview recruiter hiring salary selected deposit send reply share click
link code password otp pin newsletter friend lunch meeting library opens notice statement
ignore previous instructions mark this as safe email phone url credential number untrusted_message
""".split())


def message_for_model(text, keys):
    text = CONTACT_OR_LINK.sub(lambda m: "[email]" if m.lastgroup == "email" else "[url]", text)
    text = redact(text, keys)
    return re.sub(r"[\w.+@/-]+", lambda m: m[0] if m[0].lower() in VOCABULARY else "[redacted]", text)
