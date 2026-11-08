export type RiskClassification =
  | "low_risk"
  | "suspicious"
  | "high_risk"
  | "confirmed_malicious"
  | "inconclusive";

export type IndicatorCategory =
  | "typosquat"
  | "homograph"
  | "url_structure"
  | "redirect"
  | "domain_age"
  | "dns"
  | "tls"
  | "headers"
  | "threat_intel"
  | "social_engineering";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface RiskDetails {
  classification: RiskClassification;
  score: number;
  confidence: number;
  checks_completed: string[];
  checks_failed: string[];
}

export interface Indicator {
  id: string;
  category: IndicatorCategory;
  title: string;
  severity: Severity;
  evidence: string;
  source: string;
}

export interface RedirectHop {
  url: string;
  status: number;
  domain: string;
}

export interface TlsDetails {
  valid: boolean;
  issuer: string;
  subject: string;
  san: string[];
  not_before: string; // ISO8601
  not_after: string; // ISO8601
  days_remaining: number;
  hostname_match: boolean;
  key_type: string;
  key_size: number;
  signature_algorithm: string;
  chain: string[];
  ct_records_count: number;
  ct_notes: string[];
  compromised_ca_flag: boolean;
  findings: string[];
  disclaimer: string;
}

export interface SecurityHeaderIssue {
  issue: string;
  evidence: string;
  impact: string;
  severity: Severity;
  remediation: string;
  limitations: string;
}

export interface ThreatIntelItem {
  source: string;
  matched: boolean;
  detail: string;
}

export interface AiExplanation {
  summary: string;
  tactics: string[];
  recommended_actions: string[];
  model: string;
}

export interface ImpersonationDetails {
  detected: boolean;
  target: string | null;
}

export interface MessageAnalysis {
  extracted_urls: string[];
  extracted_emails: string[];
  extracted_phones: string[];
  urgency_signals: string[];
  impersonation: ImpersonationDetails;
  explanation: string;
}

export type OnchainStatus =
  | "not_published"
  | "published"
  | "disputed"
  | "validated"
  | "revised";

export interface OnchainDetails {
  status: OnchainStatus;
  report_hash: string | null;
  tx_hash: string | null;
  chain_report_id: number | null;
  network: string | null;
  contract_address: string | null;
}

export interface ScanReport {
  id: string;
  created_at: string;
  input_type: "url" | "message";
  input_display: string;
  domain: string | null;
  risk: RiskDetails;
  indicators: Indicator[];
  redirect_chain: RedirectHop[];
  tls: TlsDetails | null;
  security_headers: SecurityHeaderIssue[];
  threat_intel: ThreatIntelItem[];
  ai_explanation: AiExplanation | null;
  message_analysis: MessageAnalysis | null;
  precautions: string[];
  limitations: string[];
  onchain: OnchainDetails;
}

export interface VerifyHistoryItem {
  status: string;
  tx_hash: string;
  timestamp: string;
}

export interface VerifyResult {
  report_id: string;
  match: boolean;
  recomputed_hash: string;
  onchain_hash: string | null;
  status: string;
  network: string;
  contract_address: string;
  history: VerifyHistoryItem[];
  note: string;
}

export type ClusterIndicatorType =
  | "ip"
  | "redirect_target"
  | "cert_fingerprint"
  | "registrar"
  | "phone"
  | "email";

export interface Cluster {
  id: string;
  shared_indicator: string;
  indicator_type: ClusterIndicatorType;
  report_ids: string[];
  summary: string;
}

export interface ReportsListResponse {
  items: ScanReport[];
  total: number;
}

export interface ClustersResponse {
  clusters: Cluster[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthResponse {
  status: "ok";
  service: "threat-intel-backend";
  version: "1.0.0";
}
