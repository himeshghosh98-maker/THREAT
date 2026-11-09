"use client";

import * as React from "react";
import {
  QrCode,
  Camera,
  RefreshCw,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Radar,
  Copy,
  Check,
  ShieldCheck,
  Square,
  ExternalLink,
  Ban,
  Wallet
} from "lucide-react";
import { ImageIntake } from "@/components/ImageIntake";
import {
  decodeQrFromCanvas,
  decodeQrFromImageSrc,
  classifyQrPayload,
  defangText,
  QrPayload
} from "@/lib/qr";

interface QrScannerProps {
  onAnalyzeUrl: (url: string) => void;
  isScanning: boolean;
  isActive?: boolean;
}

const MAX_QR_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getHasCameraSupport() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function")
  );
}

export function QrScanner({ onAnalyzeUrl, isScanning, isActive = true }: QrScannerProps) {
  // Input image state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = React.useState<{ width: number; height: number } | null>(null);
  const [isDownscaled, setIsDownscaled] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Decoding state
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [decodedText, setDecodedText] = React.useState<string | null>(null);
  const [noQrFound, setNoQrFound] = React.useState(false);
  const [decodeAttempt, setDecodeAttempt] = React.useState<string | null>(null);

  // Camera state
  const isCameraSupported = React.useSyncExternalStore(
    () => () => {},
    getHasCameraSupport,
    () => false
  );
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = React.useState(false);

  // Sample load state
  const [isLoadingExample, setIsLoadingExample] = React.useState(false);

  // Copy feedback
  const [isCopied, setIsCopied] = React.useState(false);

  // Refs for camera stream and video
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const isScanningCameraRef = React.useRef(false);

  const stopCamera = React.useCallback(() => {
    isScanningCameraRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsLoadingCamera(false);
  }, []);

  // Stop camera if user navigates to another tab
  React.useEffect(() => {
    if (!isActive) {
      isScanningCameraRef.current = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isActive]);

  React.useEffect(() => {
    return () => {
      isScanningCameraRef.current = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const resetAll = React.useCallback(() => {
    stopCamera();
    setSelectedFile(null);
    setImagePreview(null);
    setImageDimensions(null);
    setIsDownscaled(false);
    setValidationError(null);
    setIsDecoding(false);
    setDecodedText(null);
    setNoQrFound(false);
    setDecodeAttempt(null);
    setCameraError(null);
  }, [stopCamera]);

  // Decode uploaded image
  const handleProcessImage = React.useCallback(async (dataUrl: string) => {
    setIsDecoding(true);
    setValidationError(null);
    setNoQrFound(false);
    setDecodedText(null);

    try {
      const result = await decodeQrFromImageSrc(dataUrl);
      setIsDecoding(false);
      if (result && result.data) {
        setDecodedText(result.data);
        setDecodeAttempt(result.attempt);
        setNoQrFound(false);
      } else {
        setNoQrFound(true);
      }
    } catch {
      setIsDecoding(false);
      setNoQrFound(true);
    }
  }, []);

  const handleFileLoaded = React.useCallback(
    (data: { file: File; dataUrl: string; width: number; height: number; downscaled: boolean }) => {
      stopCamera();
      setSelectedFile(data.file);
      setImagePreview(data.dataUrl);
      setImageDimensions({ width: data.width, height: data.height });
      setIsDownscaled(data.downscaled);
      handleProcessImage(data.dataUrl);
    },
    [handleProcessImage, stopCamera]
  );

  const startCamera = async () => {
    resetAll();
    setCameraError(null);
    setIsLoadingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera scanning is not supported by your browser or connection (requires HTTPS).");
      setIsLoadingCamera(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Prefer environment-facing camera on mobile
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        // Fallback to any available video stream
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setIsLoadingCamera(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        isScanningCameraRef.current = true;

        const scanFrame = () => {
          if (!isScanningCameraRef.current || !videoRef.current) return;
          const video = videoRef.current;

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const width = video.videoWidth;
            const height = video.videoHeight;

            if (width > 0 && height > 0) {
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, width, height);
                const result = decodeQrFromCanvas(ctx, width, height);
                if (result && result.data) {
                  // Successful decode: stop stream immediately
                  stopCamera();
                  setDecodedText(result.data);
                  setDecodeAttempt("camera");
                  setNoQrFound(false);
                  return;
                }
              }
            }
          }

          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      setIsLoadingCamera(false);
      setIsCameraActive(false);
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setCameraError("Camera access was denied. Please allow camera permissions in your browser or upload an image instead.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setCameraError("No camera device was detected on your system.");
      } else {
        setCameraError("Unable to access camera. Please check permissions or upload an image.");
      }
    }
  };

  // Sample QR load handler
  const handleTryExample = async () => {
    try {
      resetAll();
      setIsLoadingExample(true);
      const res = await fetch("/sample-qr.png");
      if (!res.ok) throw new Error("Could not load bundled sample QR image.");
      const blob = await res.blob();
      const file = new File([blob], "sample-qr.png", { type: "image/png" });
      const objectUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setImagePreview(objectUrl);
      setIsLoadingExample(false);
      await handleProcessImage(objectUrl);
    } catch {
      setIsLoadingExample(false);
      setValidationError("Failed to load sample QR image. You can upload any PNG, JPG, or WEBP image.");
    }
  };

  const handleCopyDefanged = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
      })
      .catch(() => {});
  };

  // Classify payload if decoded
  const payload: QrPayload | null = React.useMemo(() => {
    if (!decodedText) return null;
    return classifyQrPayload(decodedText);
  }, [decodedText]);

  return (
    <div className="space-y-6">
      {/* 1. Camera Viewfinder (if active) */}
      {isCameraActive ? (
        <div className="bg-white/95 rounded-3xl p-6 sm:p-8 border border-white/95 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8EFFE]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-sm text-[#0F1E4A]">Live Camera Scanner Active</span>
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Camera</span>
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-80 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Viewfinder reticle overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-[#5BC8FF] rounded-2xl relative shadow-[0_0_20px_rgba(91,200,255,0.4)]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white rounded-br" />
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#5BC8FF] to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-[#526085]">
            Point your camera at a QR code. Frames are processed locally on your device and are never recorded or transmitted.
          </p>
        </div>
      ) : !decodedText && !noQrFound ? (
        /* 2. Standard Dropzone / Intake Area */
        <ImageIntake
          id="qr-file-input"
          maxFileSizeBytes={MAX_QR_FILE_SIZE}
          maxSizeLabel="5 MB"
          title="Upload or Scan QR Code"
          description="Drag and drop a QR image, paste with Ctrl+V, or scan live with your camera."
          buttonText="Select QR Image"
          icon={<QrCode className="w-7 h-7" />}
          selectedFile={selectedFile}
          imagePreview={imagePreview}
          imageDimensions={imageDimensions}
          isDownscaled={isDownscaled}
          disabled={isScanning || isDecoding}
          onFileLoaded={handleFileLoaded}
          onRemove={resetAll}
          onError={(err) => setValidationError(err)}
          actionButtons={
            <>
              {isCameraSupported && (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isLoadingCamera || isScanning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#F0F4FF] text-[#4F6BFF] border border-[#D6E2FF] text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <Camera className="w-4 h-4 text-[#4F6BFF]" />
                  <span>{isLoadingCamera ? "Opening Camera..." : "Use Camera"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTryExample}
                disabled={isLoadingExample || isScanning}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-[#F0F4FF] text-[#4F6BFF] border border-[#D6E2FF] text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#5BC8FF]" />
                <span>{isLoadingExample ? "Loading sample..." : "Try an example QR"}</span>
              </button>
            </>
          }
        >
          {/* Decoding indicator if preview is loaded */}
          {isDecoding && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-[#4F6BFF] font-medium" aria-live="polite">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Decoding QR code locally on device...</span>
            </div>
          )}
        </ImageIntake>
      ) : null}

      {/* 3. Empty State: No QR Code Found / Blurry Notice */}
      {noQrFound && (
        <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No QR code detected in this image.</span>
          </div>

          <p className="text-xs text-amber-800 leading-relaxed pl-6">
            The decoder checked the original image, a downscaled copy, and a contrast-enhanced copy, but could not detect valid QR finder patterns.
          </p>

          <div className="text-xs text-amber-900 space-y-1.5 pl-6">
            <p className="font-semibold">Tips for scanning QR codes:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>Ensure the three square corner finder patterns are fully visible and not cropped.</li>
              <li>Avoid blurry, low-resolution, or heavily glare-affected screenshots.</li>
              <li>If the code is printed on a textured surface, try scanning with your camera or increasing contrast.</li>
            </ul>
          </div>

          <div className="pt-2 pl-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan another image</span>
            </button>

            {isCameraSupported && (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Try with camera</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. SUCCESS RESULT CARD */}
      {decodedText && payload && (
        <div className="bg-white/95 rounded-3xl p-6 sm:p-8 border border-white/95 shadow-sm space-y-5" aria-live="polite">
          {/* Header Row: Type badge and attempt badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8EFFE]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm sm:text-base text-[#0F1E4A]">
                QR Code Decoded Successfully
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {payload.type === "web" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{payload.isShort ? "Web link (Short URL)" : "Web link"}</span>
                </span>
              )}

              {payload.type === "upi" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Not a web link (UPI Payment)</span>
                </span>
              )}

              {payload.type === "blocked_scheme" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <Ban className="w-3.5 h-3.5" />
                  <span>Blocked Scheme ({payload.scheme}:)</span>
                </span>
              )}

              {payload.type === "non_web" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <span>Not a web link ({payload.category})</span>
                </span>
              )}

              {decodeAttempt && decodeAttempt !== "camera" && (
                <span className="text-[11px] font-mono text-[#526085] bg-[#F0F4FF] px-2.5 py-0.5 rounded-full border border-[#D6E2FF]">
                  pass: {decodeAttempt}
                </span>
              )}
            </div>
          </div>

          {/* Decoded content: Plain text in monospace, STRICTLY NON-CLICKABLE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#526085]">
              <span className="font-semibold text-[#0F1E4A]">
                Decoded Content (Defanged Plain Text — Non-Clickable):
              </span>
              <button
                type="button"
                onClick={() => handleCopyDefanged(defangText(decodedText))}
                className="inline-flex items-center gap-1 text-xs text-[#4F6BFF] hover:text-[#0F1E4A] transition-colors cursor-pointer"
                title="Copy defanged string"
                aria-label="Copy defanged string"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? "Copied" : "Copy defanged"}</span>
              </button>
            </div>

            {/* Plain text container only - NEVER an anchor tag */}
            <div className="rounded-xl bg-[#F8FAFF] border border-[#D6E2FF] p-3.5 font-mono text-xs sm:text-sm text-[#0F1E4A] break-all select-all leading-relaxed">
              {defangText(decodedText)}
            </div>
          </div>

          {/* Special Payload: UPI Payment Details */}
          {payload.type === "upi" && (
            <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-4 space-y-3">
              <div className="flex items-start gap-2.5 text-amber-900 font-semibold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Payment QR codes can move money. Only scan codes you expect.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200 text-xs">
                <div>
                  <span className="text-amber-800 font-medium block text-[11px] font-mono uppercase tracking-wider">
                    Payee:
                  </span>
                  <span className="font-mono font-bold text-amber-950 select-all block">
                    {payload.upi.payeeName || payload.upi.payeeVpa || "Not specified in QR"}
                  </span>
                  {payload.upi.payeeName && payload.upi.payeeVpa && (
                    <span className="font-mono text-[11px] text-amber-800 block select-all">
                      {payload.upi.payeeVpa}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-amber-800 font-medium block text-[11px] font-mono uppercase tracking-wider">
                    Amount:
                  </span>
                  <span className="font-mono font-bold text-amber-950 block">
                    {payload.upi.amount
                      ? `${payload.upi.currency || "INR"} ${payload.upi.amount}`
                      : "User entered / dynamic"}
                  </span>
                  {payload.upi.note && (
                    <span className="text-[11px] text-amber-800 block italic">
                      Note: {payload.upi.note}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Special Payload: Blocked URI Scheme */}
          {payload.type === "blocked_scheme" && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Blocked unsafe URI scheme ({payload.scheme}:)
                </p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">
                  Only http:// and https:// web links may be analyzed. Embedded scripts, data URLs, and local file schemes are blocked to protect your environment.
                </p>
              </div>
            </div>
          )}

          {/* Special Payload: Generic Non-Web Payload */}
          {payload.type === "non_web" && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">Payload is not a web link.</p>
              <p className="text-slate-600 leading-relaxed">
                The threat analyzer processes web URLs and domains. Non-web payloads ({payload.category}) cannot be scanned by the API.
              </p>
            </div>
          )}

          {/* Action Buttons: Analyze this link (Web only) & Scan another */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E8EFFE]">
            <button
              type="button"
              onClick={resetAll}
              disabled={isScanning}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-[#526085] hover:text-[#0F1E4A] hover:bg-[#F0F4FF] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan another</span>
            </button>

            {payload.type === "web" && (
              <button
                type="button"
                onClick={() => onAnalyzeUrl(payload.url)}
                disabled={isScanning}
                className="btn-pill-gradient w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-xs sm:text-sm font-semibold text-white rounded-full cursor-pointer shadow-sm hover:shadow disabled:opacity-60"
              >
                <Radar className="w-4 h-4" />
                <span>{isScanning ? "Submitting for analysis..." : "Analyze this link"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Validation or Camera Error Alerts */}
      {(validationError || cameraError) && (
        <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError || cameraError}</span>
        </div>
      )}

      {/* Privacy Copy & Note under tab */}
      <div className="rounded-2xl bg-[#F0F4FF]/70 border border-[#E2E8F8] p-4 text-xs text-[#526085] space-y-2.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#4F6BFF] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#0F1E4A]">On-Device Privacy:</strong>{" "}
            QR codes can hide malicious links. The code is decoded on your device and the link is analyzed by the backend. This page never opens it.
          </p>
        </div>
        <div className="flex items-start gap-2.5 border-t border-[#E2E8F8]/80 pt-2">
          <AlertCircle className="w-4 h-4 text-[#7C8CFF] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#0F1E4A]">Safe Redirection:</strong>{" "}
            Shortened URLs (like bit.ly, t.co, or tinyurl) are analyzed as normal links. The backend follows redirect hops in an isolated, SSRF-safe sandbox.
          </p>
        </div>
      </div>
    </div>
  );
}
