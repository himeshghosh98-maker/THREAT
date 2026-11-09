"use client";

import * as React from "react";
import {
  Upload,
  Camera,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Radar,
  RefreshCw,
  Crop,
  ShieldCheck,
  FileText,
  Link as LinkIcon,
  Mail,
  Phone,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_MESSAGE_LENGTH = 5000;
const OCR_TIMEOUT_MS = 60000; // 60s timeout
const AMBIGUOUS_CHARS = ["l", "1", "I", "0", "O", "rn", "m", "vv", "w"];

interface WordConfidence {
  text: string;
  confidence: number;
}

interface DetectedEntities {
  urls: string[];
  emails: string[];
  phones: string[];
}

export function extractEntities(text: string): DetectedEntities {
  if (!text) return { urls: [], emails: [], phones: [] };

  const urlRegex = /(?:(?:https?|hxxps?):\/\/|www\.)[^\s<>"'{}|\\^`]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s<>"'{}|\\^`]*)?/gi;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/g;

  const rawEmails = Array.from(text.matchAll(emailRegex), (m) => m[0]);
  const emails = Array.from(new Set(rawEmails));

  const emailSet = new Set(emails.map((e) => e.toLowerCase()));
  const rawUrls = Array.from(text.matchAll(urlRegex), (m) => m[0]).filter(
    (u) => !emailSet.has(u.toLowerCase())
  );
  const urls = Array.from(new Set(rawUrls));

  const rawPhones = Array.from(text.matchAll(phoneRegex), (m) => m[0]);
  const phones = Array.from(new Set(rawPhones));

  return { urls, emails, phones };
}

export function findAmbiguousChars(target: string): string[] {
  const found: string[] = [];
  for (const c of AMBIGUOUS_CHARS) {
    if (target.includes(c) && !found.includes(c)) {
      found.push(c);
    }
  }
  return found;
}

export function isOnlyUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes(" ") || trimmed.includes("\n")) return false;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

function processImageFile(
  file: File
): Promise<{ dataUrl: string; width: number; height: number; downscaled: boolean }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: width, naturalHeight: height } = img;

      if (width === 0 || height === 0) {
        reject(new Error("Image has invalid or corrupt dimensions (0x0)."));
        return;
      }

      // Downscale very large images before OCR to prevent UI freezing
      const MAX_DIM = 2200;
      let targetW = width;
      let targetH = height;
      let downscaled = false;

      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        targetW = Math.round(width * ratio);
        targetH = Math.round(height * ratio);
        downscaled = true;
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to create canvas context for image processing."));
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL("image/png");
      resolve({ dataUrl, width: targetW, height: targetH, downscaled });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Corrupt or invalid image file. Could not read image dimensions."));
    };

    img.src = objectUrl;
  });
}

interface ScreenshotScannerProps {
  onAnalyzeUrl: (url: string) => void;
  onAnalyzeMessage: (message: string) => void;
  isScanning: boolean;
}

export function ScreenshotScanner({
  onAnalyzeUrl,
  onAnalyzeMessage,
  isScanning
}: ScreenshotScannerProps) {
  // Input image state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = React.useState<{ width: number; height: number } | null>(null);
  const [isDownscaled, setIsDownscaled] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // OCR state
  const [isOcrRunning, setIsOcrRunning] = React.useState(false);
  const [ocrProgress, setOcrProgress] = React.useState(0);
  const [ocrStatusText, setOcrStatusText] = React.useState("");
  const [ocrConfidence, setOcrConfidence] = React.useState<number | null>(null);
  const [lowConfidenceWords, setLowConfidenceWords] = React.useState<WordConfidence[]>([]);
  const [noTextDetected, setNoTextDetected] = React.useState(false);

  // Review state
  const [reviewedText, setReviewedText] = React.useState("");
  const [hasExtracted, setHasExtracted] = React.useState(false);
  const [isLoadingExample, setIsLoadingExample] = React.useState(false);

  // Drag state
  const [isDragging, setIsDragging] = React.useState(false);

  // Worker ref for cancellation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeWorkerRef = React.useRef<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cleanup worker on unmount
  React.useEffect(() => {
    return () => {
      if (activeWorkerRef.current) {
        activeWorkerRef.current.terminate().catch(() => {});
        activeWorkerRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = React.useCallback(async (file: File) => {
    setValidationError(null);
    setNoTextDetected(false);
    setHasExtracted(false);
    setReviewedText("");
    setOcrConfidence(null);
    setLowConfidenceWords([]);

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setValidationError("Unsupported file format. Please upload a PNG, JPG, or WEBP image.");
      return;
    }

    // Validate size (max 8 MB)
    if (file.size > MAX_FILE_SIZE) {
      setValidationError("File size exceeds the 8 MB maximum limit. Please select a smaller screenshot.");
      return;
    }

    // Process image & dimensions via Image object
    try {
      const { dataUrl, width, height, downscaled } = await processImageFile(file);
      setSelectedFile(file);
      setImagePreview(dataUrl);
      setImageDimensions({ width, height });
      setIsDownscaled(downscaled);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to load and validate image.");
    }
  }, []);

  // Paste handler for Ctrl+V
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isScanning || isOcrRunning) return;
      if (!e.clipboardData) return;

      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isScanning, isOcrRunning, handleFileSelect]);

  const resetAll = () => {
    if (activeWorkerRef.current) {
      activeWorkerRef.current.terminate().catch(() => {});
      activeWorkerRef.current = null;
    }
    setSelectedFile(null);
    setImagePreview(null);
    setImageDimensions(null);
    setIsDownscaled(false);
    setValidationError(null);
    setIsOcrRunning(false);
    setOcrProgress(0);
    setOcrStatusText("");
    setOcrConfidence(null);
    setLowConfidenceWords([]);
    setNoTextDetected(false);
    setReviewedText("");
    setHasExtracted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isScanning && !isOcrRunning) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isScanning || isOcrRunning) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleRunOcr = async () => {
    if (!imagePreview) return;

    setIsOcrRunning(true);
    setOcrProgress(5);
    setOcrStatusText("Initializing local OCR engine...");
    setValidationError(null);
    setNoTextDetected(false);

    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Dynamic import of tesseract.js for optimal code splitting
      const { createWorker } = await import("tesseract.js");

      // Initialize worker with local offline assets and cacheMethod: 'none'
      const worker = await createWorker("eng", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr",
        langPath: "/ocr",
        cacheMethod: "none",
        gzip: true,
        logger: (m) => {
          if (m && typeof m.progress === "number") {
            const pct = Math.round(m.progress * 100);
            setOcrProgress(Math.max(5, Math.min(100, pct)));
          }
          if (m && m.status) {
            setOcrStatusText(formatOcrStatus(m.status));
          }
        }
      });

      activeWorkerRef.current = worker;

      // 60-second timeout guard
      timeoutId = setTimeout(() => {
        if (activeWorkerRef.current) {
          activeWorkerRef.current.terminate().catch(() => {});
          activeWorkerRef.current = null;
          setIsOcrRunning(false);
          setValidationError(
            "OCR operation timed out after 60 seconds. Try cropping the screenshot or reducing image complexity."
          );
        }
      }, OCR_TIMEOUT_MS);

      // Perform text recognition with blocks enabled for word-level confidences
      const result = await worker.recognize(imagePreview, {}, { blocks: true });

      if (timeoutId) clearTimeout(timeoutId);

      await worker.terminate();
      activeWorkerRef.current = null;

      const rawText = result?.data?.text?.trim() || "";
      const confidence = Math.round(result?.data?.confidence || 0);

      // Extract word-level confidences for review highlighting
      const wordList: WordConfidence[] = [];
      if (result?.data?.blocks) {
        for (const b of result.data.blocks) {
          for (const p of b.paragraphs || []) {
            for (const l of p.lines || []) {
              for (const w of l.words || []) {
                if (w && w.text && typeof w.confidence === "number") {
                  wordList.push({
                    text: w.text,
                    confidence: Math.round(w.confidence)
                  });
                }
              }
            }
          }
        }
      }

      // Filter words with confidence < 80
      const lowConf = wordList.filter((w) => w.confidence < 80 && w.text.length > 1);

      setOcrConfidence(confidence);
      setLowConfidenceWords(lowConf);
      setIsOcrRunning(false);
      setHasExtracted(true);

      if (!rawText) {
        setNoTextDetected(true);
        setReviewedText("");
      } else {
        setNoTextDetected(false);
        setReviewedText(rawText);
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      if (activeWorkerRef.current) {
        activeWorkerRef.current.terminate().catch(() => {});
        activeWorkerRef.current = null;
      }
      setIsOcrRunning(false);
      setValidationError(
        err instanceof Error
          ? `OCR recognition error: ${err.message}`
          : "Local OCR engine failed to process the screenshot."
      );
    }
  };

  const handleCancelOcr = async () => {
    if (activeWorkerRef.current) {
      await activeWorkerRef.current.terminate().catch(() => {});
      activeWorkerRef.current = null;
    }
    setIsOcrRunning(false);
    setOcrProgress(0);
    setOcrStatusText("");
  };

  const handleTryExample = async () => {
    try {
      setIsLoadingExample(true);
      setValidationError(null);
      const res = await fetch("/sample-kyc-sms.png");
      if (!res.ok) throw new Error("Could not load bundled sample screenshot.");
      const blob = await res.blob();
      const file = new File([blob], "sample-kyc-sms.png", { type: "image/png" });
      await handleFileSelect(file);
    } catch {
      setValidationError("Failed to load sample screenshot. You can upload any PNG, JPG, or WEBP image.");
    } finally {
      setIsLoadingExample(false);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reviewedText.trim();
    if (!trimmed) {
      setValidationError("Extracted text is empty. Please enter or review text before analyzing.");
      return;
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setValidationError(`Text exceeds the maximum length of ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`);
      return;
    }

    setValidationError(null);

    // If text is only a URL, dispatch to scanUrl; otherwise scanMessage
    if (isOnlyUrl(trimmed)) {
      onAnalyzeUrl(trimmed);
    } else {
      onAnalyzeMessage(trimmed);
    }
  };

  const formatOcrStatus = (status: string) => {
    switch (status) {
      case "loading tesseract core":
        return "Loading WebAssembly core...";
      case "initializing tesseract":
        return "Initializing OCR engine...";
      case "loading language traineddata":
        return "Loading English model...";
      case "recognizing text":
        return "Extracting text from image...";
      default:
        return status;
    }
  };

  // Detected entities from current reviewed text
  const entities = React.useMemo(() => extractEntities(reviewedText), [reviewedText]);

  return (
    <div className="space-y-6">
      {/* 1. Image Upload & Dropzone Area */}
      {!imagePreview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all ${
            isDragging
              ? "border-[#4F6BFF] bg-[#F0F4FF]/90 shadow-md"
              : "border-[#D6E2FF] bg-white/70 hover:border-[#4F6BFF]/60 hover:bg-white/90"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            disabled={isScanning || isOcrRunning}
            className="sr-only"
            id="screenshot-file-input"
            aria-label="Upload screenshot file"
          />

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#4F6BFF]/15 to-[#5BC8FF]/20 flex items-center justify-center text-[#4F6BFF] shadow-xs">
              <Camera className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0F1E4A]">
                Upload or Paste Screenshot
              </h3>
              <p className="text-xs text-[#526085]">
                Drag and drop image here, paste with{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#D6E2FF] font-mono text-[11px] text-[#0F1E4A] font-semibold">
                  Ctrl+V
                </kbd>
                , or browse files.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label
                htmlFor="screenshot-file-input"
                className="btn-pill-gradient inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-full cursor-pointer shadow-sm hover:shadow"
              >
                <Upload className="w-4 h-4" />
                <span>Select Screenshot</span>
              </label>

              <button
                type="button"
                onClick={handleTryExample}
                disabled={isLoadingExample || isScanning}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-[#F0F4FF] text-[#4F6BFF] border border-[#D6E2FF] text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#5BC8FF]" />
                <span>{isLoadingExample ? "Loading sample..." : "Try an example screenshot"}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#8896B8]">
              Supports PNG, JPG, or WEBP (Max 8 MB). Processed strictly on-device.
            </p>
          </div>
        </div>
      ) : (
        /* Image Preview & OCR Control */
        <div className="space-y-4">
          <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border border-white/95 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8EFFE]">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-[#4F6BFF] shrink-0" />
                <span className="font-semibold text-xs sm:text-sm text-[#0F1E4A] truncate">
                  {selectedFile?.name || "screenshot.png"}
                </span>
                {imageDimensions && (
                  <span className="text-[11px] font-mono text-[#526085] bg-[#F0F4FF] px-2 py-0.5 rounded">
                    {imageDimensions.width} × {imageDimensions.height} px
                  </span>
                )}
                {isDownscaled && (
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Auto-scaled for OCR
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isScanning || isOcrRunning}
                  aria-label="Remove screenshot"
                  className="inline-flex items-center gap-1 text-xs text-[#526085] hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            {/* Image Thumbnail Preview */}
            <div className="relative rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200/80 max-h-64 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Selected screenshot preview"
                className="max-h-64 w-auto object-contain rounded-lg"
              />
            </div>

            {/* OCR Action or Progress */}
            {!hasExtracted && !isOcrRunning && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-[#526085]">
                  Ready to read text. OCR runs 100% locally in your browser.
                </span>
                <button
                  type="button"
                  onClick={handleRunOcr}
                  disabled={isScanning}
                  className="btn-pill-gradient w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-full cursor-pointer shadow-xs hover:shadow"
                >
                  <Radar className="w-4 h-4" />
                  <span>Recognize Text with OCR</span>
                </button>
              </div>
            )}

            {/* OCR In-Progress State */}
            {isOcrRunning && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-[#4F6BFF] flex items-center gap-1.5" aria-live="polite">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{ocrStatusText || "Processing screenshot with Tesseract OCR..."}</span>
                  </span>
                  <span className="font-mono text-[#0F1E4A] font-bold">{ocrProgress}%</span>
                </div>

                <div className="w-full bg-[#E8EFFE] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4F6BFF] to-[#5BC8FF] transition-all duration-200"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelOcr}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    Cancel OCR
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Empty Text Result Notice */}
      {noTextDetected && (
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No readable text was detected in this screenshot.</span>
          </div>
          <div className="text-xs text-amber-900 space-y-1.5 pl-6">
            <p className="font-medium">Tips for better recognition:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>Crop closer to the message bubble, SMS text, or suspicious notice.</li>
              <li>Zoom in or use a higher-resolution screenshot for sharper characters.</li>
              <li>Ensure the text has strong contrast against the background and is not blurred.</li>
            </ul>
          </div>
          <div className="pt-2 pl-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="text-xs text-amber-900 border-amber-300 hover:bg-amber-100"
            >
              <Crop className="w-3.5 h-3.5 mr-1" />
              <span>Try another screenshot</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. REVIEW STEP (Mandatory, accuracy-critical) */}
      {hasExtracted && !noTextDetected && (
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="bg-white/95 rounded-2xl p-5 border border-white shadow-sm space-y-4">
            {/* Header: OCR Confidence Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8EFFE]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4F6BFF]" />
                <span className="font-bold text-sm text-[#0F1E4A]">
                  Review Extracted Text
                </span>
              </div>

              {ocrConfidence !== null && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      ocrConfidence >= 85
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : ocrConfidence >= 70
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>OCR Confidence: {ocrConfidence}%</span>
                  </span>
                </div>
              )}
            </div>

            {/* Accuracy Warning Banner */}
            <div className="rounded-xl bg-amber-50/80 border border-amber-200/90 p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold">
                  Text recognition can misread similar-looking characters. Check links carefully before analysing.
                </p>
                <p className="text-amber-800 mt-0.5 text-[11px]">
                  Pay extra attention to ambiguous characters in URLs:{" "}
                  <code className="font-mono font-bold bg-amber-100/70 px-1 py-0.5 rounded text-amber-950">
                    l, 1, I, 0, O, rn, m, vv, w
                  </code>
                  . Edit the text below if any characters were misread.
                </p>
              </div>
            </div>

            {/* Editable Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#526085]">
                <label htmlFor="ocr-extracted-textarea" className="font-semibold text-[#0F1E4A]">
                  Editable Text Content:
                </label>
                <span
                  aria-live="polite"
                  className={`font-mono text-xs ${
                    reviewedText.length > MAX_MESSAGE_LENGTH
                      ? "text-rose-600 font-bold"
                      : reviewedText.length > MAX_MESSAGE_LENGTH - 500
                      ? "text-amber-600 font-semibold"
                      : "text-[#526085]"
                  }`}
                >
                  {reviewedText.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} characters
                </span>
              </div>

              <textarea
                id="ocr-extracted-textarea"
                rows={5}
                value={reviewedText}
                onChange={(e) => {
                  setReviewedText(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                disabled={isScanning}
                aria-label="Reviewed extracted text"
                className="w-full rounded-xl bg-[#F8FAFF] border border-[#D6E2FF] p-3 font-mono text-xs sm:text-sm text-[#0F1E4A] placeholder:text-[#8896B8] focus:outline-none focus:ring-2 focus:ring-[#4F6BFF]/40 selection:bg-[#4F6BFF]/20 resize-y"
              />
            </div>

            {/* Low-confidence words chips (if any detected < 80%) */}
            {lowConfidenceWords.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Lower-confidence words detected by OCR (verify accuracy):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lowConfidenceWords.slice(0, 10).map((w, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs"
                    >
                      <span>{w.text}</span>
                      <span className="text-[10px] text-amber-700 font-sans">({w.confidence}%)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detected Entities Preview (Plain Text Only, NEVER Clickable) */}
            <div className="rounded-xl bg-[#F0F4FF]/70 border border-[#E2E8F8] p-4 space-y-3">
              <div className="text-xs font-bold text-[#0F1E4A] uppercase tracking-wider font-mono flex items-center justify-between">
                <span>[ Detected Indicators Preview — Non-Clickable ]</span>
                <span className="text-[#526085] font-normal normal-case text-[11px]">
                  Verify against original screenshot
                </span>
              </div>

              {/* Detected URLs */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1E4A]">
                  <LinkIcon className="w-3.5 h-3.5 text-[#4F6BFF]" />
                  <span>Detected URLs / Hostnames ({entities.urls.length}):</span>
                </div>
                {entities.urls.length > 0 ? (
                  <div className="space-y-1.5">
                    {entities.urls.map((url, i) => {
                      const amb = findAmbiguousChars(url);
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white border border-[#E2E8F8] text-xs font-mono"
                        >
                          {/* Plain text span, NEVER an anchor tag */}
                          <span className="text-[#0F1E4A] font-medium break-all select-all">
                            {url}
                          </span>
                          {amb.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Ambiguous chars: {amb.join(", ")}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#8896B8] italic pl-5">
                    No web links detected.
                  </p>
                )}
              </div>

              {/* Detected Emails & Phones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F8]">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1E4A]">
                    <Mail className="w-3.5 h-3.5 text-[#7C8CFF]" />
                    <span>Emails ({entities.emails.length}):</span>
                  </div>
                  {entities.emails.length > 0 ? (
                    <div className="space-y-1">
                      {entities.emails.map((email, i) => (
                        <div
                          key={i}
                          className="p-1.5 rounded bg-white border border-[#E2E8F8] text-xs font-mono text-[#0F1E4A] select-all break-all"
                        >
                          {email}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#8896B8] italic pl-5">None detected</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1E4A]">
                    <Phone className="w-3.5 h-3.5 text-[#5BC8FF]" />
                    <span>Phone Numbers ({entities.phones.length}):</span>
                  </div>
                  {entities.phones.length > 0 ? (
                    <div className="space-y-1">
                      {entities.phones.map((phone, i) => (
                        <div
                          key={i}
                          className="p-1.5 rounded bg-white border border-[#E2E8F8] text-xs font-mono text-[#0F1E4A] select-all break-all"
                        >
                          {phone}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#8896B8] italic pl-5">None detected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Review Step Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E8EFFE]">
              <button
                type="button"
                onClick={resetAll}
                disabled={isScanning}
                className="text-xs text-[#526085] hover:text-[#0F1E4A] transition-colors cursor-pointer"
              >
                Start over with new screenshot
              </button>

              <button
                type="submit"
                disabled={isScanning || !reviewedText.trim() || reviewedText.length > MAX_MESSAGE_LENGTH}
                className="btn-pill-gradient w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-xs sm:text-sm font-semibold text-white rounded-full cursor-pointer shadow-sm hover:shadow disabled:opacity-60"
              >
                <Radar className="w-4 h-4" />
                <span>{isScanning ? "Submitting for analysis..." : "Analyze extracted text"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Validation / Error Message */}
      {validationError && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* 4. Privacy Copy & Honest Scope Note */}
      <div className="rounded-2xl bg-[#F0F4FF]/70 border border-[#E2E8F8] p-4 text-xs text-[#526085] space-y-2.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#4F6BFF] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#0F1E4A]">On-Device Privacy:</strong>{" "}
            Screenshots are read on your device. The image is never uploaded or stored. Only the text you confirm is sent for analysis. Screenshots can contain personal information: crop it out first.
          </p>
        </div>
        <div className="flex items-start gap-2.5 border-t border-[#E2E8F8]/80 pt-2">
          <AlertCircle className="w-4 h-4 text-[#7C8CFF] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#0F1E4A]">Honest Scope Note:</strong>{" "}
            This reads text and links from the screenshot. It does not detect fake logos or copied page layouts.
          </p>
        </div>
      </div>
    </div>
  );
}
