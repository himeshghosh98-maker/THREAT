import {
  ScanReport,
  VerifyResult,
  ReportsListResponse,
  ClustersResponse,
  HealthResponse,
  ApiError,
  RiskClassification
} from "./types";
import {
  MOCK_REPORTS,
  MOCK_VERIFY_MATCH_TRUE,
  MOCK_VERIFY_MATCH_FALSE,
  MOCK_CLUSTERS
} from "./mocks";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export class ApiClientError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// In-memory store for mocks during dev/testing so publications persist in session
const mockReportsStore: ScanReport[] = [...MOCK_REPORTS];

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorData: ApiError | null = null;
    try {
      errorData = (await res.json()) as ApiError;
    } catch {
      // response not JSON
    }
    const code = errorData?.error?.code || `HTTP_${res.status}`;
    const message = errorData?.error?.message || res.statusText || "Request failed";
    throw new ApiClientError(code, message, res.status);
  }
  return res.json() as Promise<T>;
}

export async function health(): Promise<HealthResponse> {
  if (USE_MOCKS) {
    return {
      status: "ok",
      service: "threat-intelligence-engine",
      version: "1.0.0",
      timestamp: new Date().toISOString()
    };
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/health`);
  return handleResponse<HealthResponse>(res);
}

export async function scanUrl(url: string): Promise<ScanReport> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 600));
    const lower = url.toLowerCase();
    let matched: ScanReport | undefined;

    if (lower.includes("paypa") || lower.includes("paypa1")) {
      matched = mockReportsStore.find((r) => r.id === "a1b2c3d4-e5f6-7a8b-9c0d-111111111111");
    } else if (lower.includes("apple") || lower.includes("xn--")) {
      matched = mockReportsStore.find((r) => r.id === "b2c3d4e5-f6a7-8b9c-0d1e-222222222222");
    } else if (lower.includes("chase") || lower.includes("bank")) {
      matched = mockReportsStore.find((r) => r.id === "c3d4e5f6-a7b8-9c0d-1e2f-333333333333");
    } else if (lower.includes("github")) {
      matched = mockReportsStore.find((r) => r.id === "d4e5f6a7-b8c9-0d1e-2f3a-444444444444");
    } else if (lower.includes("mit") || lower.includes("edu")) {
      matched = mockReportsStore.find((r) => r.id === "e5f6a7b8-c9d0-1e2f-3a4b-555555555555");
    } else if (lower.includes("unknown") || lower.includes("biz")) {
      matched = mockReportsStore.find((r) => r.id === "f6a7b8c9-d01e-2f3a-4b5c-666666666666");
    }

    if (!matched) {
      // Return first mock as default template but defang input
      const template = mockReportsStore[0];
      const defanged = url.replace(/https?:\/\//, "hxxps://").replace(/\./g, "[.]");
      return {
        ...template,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        input_display: defanged,
        domain: url.replace(/^https?:\/\//i, "").split("/")[0] || null
      };
    }
    return matched;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/scan/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  return handleResponse<ScanReport>(res);
}

export async function scanMessage(message: string): Promise<ScanReport> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 700));
    const msgReport = mockReportsStore.find((r) => r.input_type === "message");
    if (msgReport) {
      return msgReport;
    }
    return mockReportsStore[0];
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/scan/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  return handleResponse<ScanReport>(res);
}

export async function listReports(params?: {
  risk?: RiskClassification | string;
  limit?: number;
  offset?: number;
}): Promise<ReportsListResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 300));
    let filtered = [...mockReportsStore];
    if (params?.risk) {
      filtered = filtered.filter((r) => r.risk.classification === params.risk);
    }
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    const items = filtered.slice(offset, offset + limit);
    return {
      items,
      total: filtered.length
    };
  }

  const query = new URLSearchParams();
  if (params?.risk) query.set("risk", params.risk);
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.offset !== undefined) query.set("offset", String(params.offset));

  const qs = query.toString();
  const url = `${API_BASE_URL}/api/v1/reports${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  return handleResponse<ReportsListResponse>(res);
}

export async function getReport(id: string): Promise<ScanReport> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 200));
    const found = mockReportsStore.find((r) => r.id === id);
    if (!found) {
      throw new ApiClientError("NOT_FOUND", `Report with id '${id}' not found`, 404);
    }
    return found;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/reports/${encodeURIComponent(id)}`);
  return handleResponse<ScanReport>(res);
}

export async function publishReport(id: string): Promise<ScanReport> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 600));
    const index = mockReportsStore.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new ApiClientError("NOT_FOUND", `Report with id '${id}' not found`, 404);
    }
    const existing = mockReportsStore[index];
    const updated: ScanReport = {
      ...existing,
      onchain: {
        status: "published",
        report_hash: "0x8fa134d1b3e8e72c8469d7b425ef8197aa3b72c5a2c4e365022e379ff7372bc1",
        tx_hash: "0x9ab718e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049a463",
        chain_report_id: 1042,
        network: "Arbitrum Sepolia",
        contract_address: "0x3B62e6D109fD5c697204689E41Eb75945C992c6C"
      }
    };
    mockReportsStore[index] = updated;
    return updated;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/reports/${encodeURIComponent(id)}/publish`, {
    method: "POST"
  });
  return handleResponse<ScanReport>(res);
}

export async function verifyReport(id: string): Promise<VerifyResult> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 400));
    if (id === MOCK_VERIFY_MATCH_TRUE.report_id) {
      return MOCK_VERIFY_MATCH_TRUE;
    }
    if (id === MOCK_VERIFY_MATCH_FALSE.report_id) {
      return MOCK_VERIFY_MATCH_FALSE;
    }
    // Check if report exists and has onchain data
    const found = mockReportsStore.find((r) => r.id === id);
    if (found?.onchain.status === "published" && found.onchain.report_hash) {
      return {
        report_id: id,
        match: true,
        recomputed_hash: found.onchain.report_hash,
        onchain_hash: found.onchain.report_hash,
        status: "validated",
        network: found.onchain.network || "Arbitrum Sepolia",
        contract_address: found.onchain.contract_address || "0x3B62e6D109fD5c697204689E41Eb75945C992c6C",
        history: [
          {
            status: "published",
            tx_hash: found.onchain.tx_hash || "0x9ab718e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049a463",
            timestamp: new Date().toISOString()
          }
        ],
        note: "The blockchain proves integrity and history of a report, not the truth of its contents."
      };
    }
    // Return match false result for unverified or tampered reports
    return {
      ...MOCK_VERIFY_MATCH_FALSE,
      report_id: id
    };
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/reports/${encodeURIComponent(id)}/verify`);
  return handleResponse<VerifyResult>(res);
}

export async function getCorrelations(): Promise<ClustersResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 300));
    return { clusters: MOCK_CLUSTERS };
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/intel/correlations`);
  return handleResponse<ClustersResponse>(res);
}
