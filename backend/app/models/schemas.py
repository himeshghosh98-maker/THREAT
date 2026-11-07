from typing import Annotated, Literal
from uuid import UUID
from urllib.parse import urlsplit

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, field_validator


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UrlInput(Model):
    url: HttpUrl

    @field_validator("url", mode="before")
    @classmethod
    def validate_authority(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if (chr(92) in value or any(ord(c) < 32 for c in value)
                    or "@" in urlsplit(value).netloc or urlsplit(value).port == 0):
                raise ValueError("Invalid URL authority")
        return value


class MessageInput(Model):
    message: Annotated[str, Field(min_length=1, max_length=16000)]

    @field_validator("message")
    @classmethod
    def require_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message is empty")
        return value


Classification = Literal["low_risk", "suspicious", "high_risk", "confirmed_malicious", "inconclusive"]
Severity = Literal["info", "low", "medium", "high", "critical"]
Category = Literal["typosquat", "homograph", "url_structure", "redirect", "domain_age", "dns",
                   "tls", "headers", "threat_intel", "social_engineering"]
Status = Literal["not_published", "published", "disputed", "validated", "revised"]
Hash = Annotated[str, Field(pattern=r"^0x[0-9a-fA-F]{64}$")]
Address = Annotated[str, Field(pattern=r"^0x[0-9a-fA-F]{40}$")]


class Health(Model):
    status: Literal["ok"]
    service: Literal["threat-intel-backend"]
    version: Literal["1.0.0"]


class Risk(Model):
    classification: Classification
    score: Annotated[int, Field(ge=0, le=100)]
    confidence: Annotated[float, Field(ge=0, le=1)]
    checks_completed: list[str]
    checks_failed: list[str]


class Indicator(Model):
    id: str
    category: Category
    title: str
    severity: Severity
    evidence: str
    source: str


class Redirect(Model):
    url: str
    status: int
    domain: str


class TLS(Model):
    valid: bool
    issuer: str
    subject: str
    san: list[str]
    not_before: AwareDatetime
    not_after: AwareDatetime
    days_remaining: int
    hostname_match: bool
    key_type: str
    key_size: int
    signature_algorithm: str
    chain: list[str]
    ct_records_count: int
    ct_notes: list[str]
    compromised_ca_flag: bool
    findings: list[str]
    disclaimer: Literal["A valid certificate is not proof that the site is safe."]


class SecurityHeader(Model):
    issue: str
    evidence: str
    impact: str
    severity: Severity
    remediation: str
    limitations: str


class IntelMatch(Model):
    source: str
    matched: bool
    detail: str


class Explanation(Model):
    summary: str
    tactics: list[str]
    recommended_actions: list[str]
    model: str


class Impersonation(Model):
    detected: bool
    target: str | None


class MessageAnalysis(Model):
    extracted_urls: list[str]
    extracted_emails: list[str]
    extracted_phones: list[str]
    urgency_signals: list[str]
    impersonation: Impersonation
    explanation: str


class Onchain(Model):
    status: Status
    report_hash: Hash | None
    tx_hash: Hash | None
    chain_report_id: int | None
    network: str | None
    contract_address: Address | None


class ScanReport(Model):
    id: UUID
    created_at: AwareDatetime
    input_type: Literal["url", "message"]
    input_display: str
    domain: str | None
    risk: Risk
    indicators: list[Indicator]
    redirect_chain: list[Redirect]
    tls: TLS | None
    security_headers: list[SecurityHeader]
    threat_intel: list[IntelMatch]
    ai_explanation: Explanation | None
    message_analysis: MessageAnalysis | None
    precautions: list[str]
    limitations: list[str]
    onchain: Onchain


class ReportList(Model):
    items: list[ScanReport]
    total: int


class History(Model):
    status: str
    tx_hash: Hash
    timestamp: AwareDatetime


class VerifyResult(Model):
    report_id: UUID
    match: bool
    recomputed_hash: Hash
    onchain_hash: Hash | None
    status: str
    network: str
    contract_address: Address
    history: list[History]
    note: Literal["The blockchain proves integrity and history of a report, not the truth of its contents."]


class Cluster(Model):
    id: str
    shared_indicator: str
    indicator_type: Literal["ip", "redirect_target", "cert_fingerprint", "registrar", "phone", "email"]
    report_ids: list[UUID]
    summary: str


class Correlations(Model):
    clusters: list[Cluster]


class ErrorDetail(Model):
    code: str
    message: str


class ErrorResponse(Model):
    error: ErrorDetail
