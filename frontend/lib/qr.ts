import jsQR from "jsqr";

export interface UpiInfo {
  isUpi: boolean;
  payeeName?: string;
  payeeVpa?: string;
  amount?: string;
  currency?: string;
  note?: string;
}

export type QrPayload =
  | { type: "web"; url: string; isShort: boolean }
  | { type: "upi"; upi: UpiInfo }
  | { type: "blocked_scheme"; scheme: string }
  | { type: "non_web"; category: string };

export interface QrDecodeResult {
  data: string;
  attempt: "original" | "downscaled" | "contrast_enhanced";
}

const KNOWN_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "adf.ly",
  "bit.do",
  "rebrand.ly",
  "cutt.ly",
  "qr.net",
  "v.gd",
  "rb.gy",
  "shorturl.at"
]);

export function defangText(text: string): string {
  if (!text) return "";
  return text
    .replace(/https:\/\//gi, "hxxps://")
    .replace(/http:\/\//gi, "hxxp://")
    .replace(/\./g, "[.]");
}

export function isShortUrl(rawUrl: string): boolean {
  try {
    const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(withProto);
    return KNOWN_SHORTENERS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function parseUpi(raw: string): UpiInfo {
  if (!/^upi:\/\/pay/i.test(raw.trim())) {
    return { isUpi: false };
  }
  const qIdx = raw.indexOf("?");
  const queryString = qIdx >= 0 ? raw.slice(qIdx + 1) : "";
  const params = new URLSearchParams(queryString);
  const pa = params.get("pa") || undefined;
  const pn = params.get("pn") || undefined;
  const am = params.get("am") || undefined;
  const cu = params.get("cu") || "INR";
  const tn = params.get("tn") || undefined;

  return {
    isUpi: true,
    payeeVpa: pa ? decodeURIComponent(pa) : undefined,
    payeeName: pn ? decodeURIComponent(pn) : undefined,
    amount: am ? decodeURIComponent(am) : undefined,
    currency: cu ? decodeURIComponent(cu) : undefined,
    note: tn ? decodeURIComponent(tn) : undefined
  };
}

export function classifyQrPayload(text: string): QrPayload {
  const trimmed = text.trim();

  // 1. UPI payment QR code
  if (/^upi:\/\/pay/i.test(trimmed)) {
    return { type: "upi", upi: parseUpi(trimmed) };
  }

  // 2. Dangerous schemes blocked
  const blockedList = ["javascript", "data", "file", "vbscript", "about", "blob"];
  for (const scheme of blockedList) {
    if (new RegExp(`^${scheme}:`, "i").test(trimmed)) {
      return { type: "blocked_scheme", scheme };
    }
  }

  // 3. Web links (http:// or https://)
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      type: "web",
      url: trimmed,
      isShort: isShortUrl(trimmed)
    };
  }

  // 4. Non-web schemas
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const s = schemeMatch[1].toLowerCase();
    if (s === "wifi") return { type: "non_web", category: "Wi-Fi" };
    if (s === "mailto") return { type: "non_web", category: "Email" };
    if (s === "tel") return { type: "non_web", category: "Phone" };
    if (s === "smsto" || s === "sms") return { type: "non_web", category: "SMS" };
    if (s === "geo") return { type: "non_web", category: "Geolocation" };
    return { type: "non_web", category: `${s.toUpperCase()} URI` };
  }

  if (trimmed.startsWith("BEGIN:VCARD") || trimmed.startsWith("MECARD:")) {
    return { type: "non_web", category: "Contact" };
  }
  if (trimmed.startsWith("WIFI:")) {
    return { type: "non_web", category: "Wi-Fi" };
  }

  return { type: "non_web", category: "Plain text" };
}

export function decodeQrFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): QrDecodeResult | null {
  if (width <= 0 || height <= 0) return null;

  // 1. Original image decode attempt
  try {
    const origData = ctx.getImageData(0, 0, width, height);
    const origCode = jsQR(origData.data, width, height, { inversionAttempts: "attemptBoth" });
    if (origCode && origCode.data) {
      return { data: origCode.data, attempt: "original" };
    }
  } catch {
    // Canvas reading failed
  }

  // 2. Downscaled copy attempt
  try {
    const maxDim = 800;
    const scale = Math.min(0.6, maxDim / Math.max(width, height));
    const dw = Math.max(80, Math.round(width * scale));
    const dh = Math.max(80, Math.round(height * scale));

    const downCanvas = document.createElement("canvas");
    downCanvas.width = dw;
    downCanvas.height = dh;
    const downCtx = downCanvas.getContext("2d", { willReadFrequently: true });
    if (downCtx) {
      downCtx.drawImage(ctx.canvas, 0, 0, dw, dh);
      const downData = downCtx.getImageData(0, 0, dw, dh);
      const downCode = jsQR(downData.data, dw, dh, { inversionAttempts: "attemptBoth" });
      if (downCode && downCode.data) {
        return { data: downCode.data, attempt: "downscaled" };
      }
    }
  } catch {
    // Downscale attempt failed
  }

  // 3. Contrast-enhanced copy attempt
  try {
    const origData = ctx.getImageData(0, 0, width, height);
    const enhCanvas = document.createElement("canvas");
    enhCanvas.width = width;
    enhCanvas.height = height;
    const enhCtx = enhCanvas.getContext("2d", { willReadFrequently: true });
    if (enhCtx) {
      const enhData = enhCtx.createImageData(width, height);
      const contrast = 75; // Contrast adjustment (-255 to 255)
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < origData.data.length; i += 4) {
        enhData.data[i] = Math.min(255, Math.max(0, factor * (origData.data[i] - 128) + 128));
        enhData.data[i + 1] = Math.min(255, Math.max(0, factor * (origData.data[i + 1] - 128) + 128));
        enhData.data[i + 2] = Math.min(255, Math.max(0, factor * (origData.data[i + 2] - 128) + 128));
        enhData.data[i + 3] = origData.data[i + 3];
      }
      const enhCode = jsQR(enhData.data, width, height, { inversionAttempts: "attemptBoth" });
      if (enhCode && enhCode.data) {
        return { data: enhCode.data, attempt: "contrast_enhanced" };
      }
    }
  } catch {
    // Contrast enhanced attempt failed
  }

  return null;
}

export function decodeQrFromImageSrc(src: string): Promise<QrDecodeResult | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      if (width === 0 || height === 0) {
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const res = decodeQrFromCanvas(ctx, width, height);
      resolve(res);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
