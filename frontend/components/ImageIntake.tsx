"use client";

import * as React from "react";
import { Upload, X, FileText } from "lucide-react";

export const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function processImageFile(
  file: File,
  maxDim = 2200
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

      let targetW = width;
      let targetH = height;
      let downscaled = false;

      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
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

export interface ImageIntakeProps {
  id: string;
  maxFileSizeBytes: number;
  maxSizeLabel: string;
  title: string;
  description?: string;
  buttonText: string;
  icon?: React.ReactNode;
  selectedFile: File | null;
  imagePreview: string | null;
  imageDimensions: { width: number; height: number } | null;
  isDownscaled?: boolean;
  disabled?: boolean;
  onFileLoaded: (data: { file: File; dataUrl: string; width: number; height: number; downscaled: boolean }) => void;
  onRemove: () => void;
  onError: (errorMessage: string) => void;
  actionButtons?: React.ReactNode;
  children?: React.ReactNode;
  altText?: string;
}

export function ImageIntake({
  id,
  maxFileSizeBytes,
  maxSizeLabel,
  title,
  description,
  buttonText,
  icon,
  selectedFile,
  imagePreview,
  imageDimensions,
  isDownscaled,
  disabled = false,
  onFileLoaded,
  onRemove,
  onError,
  actionButtons,
  children,
  altText = "Selected image preview"
}: ImageIntakeProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateAndProcessFile = React.useCallback(
    async (file: File) => {
      // Validate MIME type
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
        onError("Unsupported file format. Please upload a PNG, JPG, or WEBP image.");
        return;
      }

      // Validate size
      if (file.size > maxFileSizeBytes) {
        onError(`File size exceeds the ${maxSizeLabel} maximum limit. Please select a smaller image.`);
        return;
      }

      try {
        const result = await processImageFile(file);
        onFileLoaded({ file, ...result });
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to load and validate image.");
      }
    },
    [maxFileSizeBytes, maxSizeLabel, onError, onFileLoaded]
  );

  // Paste handler for Ctrl+V
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled || imagePreview) return;
      if (!e.clipboardData) return;

      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            validateAndProcessFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, imagePreview, validateAndProcessFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !imagePreview) {
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
    if (disabled || imagePreview) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
    // Reset file input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!imagePreview) {
    return (
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
          accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="sr-only"
          id={id}
          aria-label={title}
        />

        <div className="max-w-md mx-auto space-y-4">
          {icon && (
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#4F6BFF]/15 to-[#5BC8FF]/20 flex items-center justify-center text-[#4F6BFF] shadow-xs">
              {icon}
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F1E4A]">{title}</h3>
            <p className="text-xs text-[#526085]">
              {description || (
                <>
                  Drag and drop image here, paste with{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#D6E2FF] font-mono text-[11px] text-[#0F1E4A] font-semibold">
                    Ctrl+V
                  </kbd>
                  , or browse files.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label
              htmlFor={id}
              className="btn-pill-gradient inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-full cursor-pointer shadow-sm hover:shadow"
            >
              <Upload className="w-4 h-4" />
              <span>{buttonText}</span>
            </label>

            {actionButtons}
          </div>

          <p className="text-[11px] text-[#8896B8]">
            Supports PNG, JPG, or WEBP (Max {maxSizeLabel}). Processed strictly on-device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border border-white/95 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8EFFE]">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-[#4F6BFF] shrink-0" />
            <span className="font-semibold text-xs sm:text-sm text-[#0F1E4A] truncate">
              {selectedFile?.name || "image.png"}
            </span>
            {imageDimensions && (
              <span className="text-[11px] font-mono text-[#526085] bg-[#F0F4FF] px-2 py-0.5 rounded">
                {imageDimensions.width} × {imageDimensions.height} px
              </span>
            )}
            {isDownscaled && (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Auto-scaled
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              aria-label="Remove image"
              className="inline-flex items-center gap-1 text-xs text-[#526085] hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              <span>Remove</span>
            </button>
          </div>
        </div>

        {/* Thumbnail Preview */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200/80 max-h-64 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt={altText}
            className="max-h-64 w-auto object-contain rounded-lg"
          />
        </div>

        {children}
      </div>
    </div>
  );
}
