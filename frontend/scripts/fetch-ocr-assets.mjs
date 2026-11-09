// scripts/fetch-ocr-assets.mjs
// Script to bundle or refresh offline OCR assets under frontend/public/ocr/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(__dirname, "../public/ocr");

fs.mkdirSync(targetDir, { recursive: true });

console.log("Setting up offline Tesseract OCR assets in:", targetDir);

// 1. Copy worker from node_modules
const workerSrc = path.resolve(__dirname, "../node_modules/tesseract.js/dist/worker.min.js");
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, path.join(targetDir, "worker.min.js"));
  console.log("✓ Copied worker.min.js");
} else {
  console.warn("! worker.min.js not found in node_modules/tesseract.js/dist");
}

// 2. Copy wasm/core files from node_modules/tesseract.js-core
const coreFiles = [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js"
];

for (const file of coreFiles) {
  const src = path.resolve(__dirname, "../node_modules/tesseract.js-core", file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetDir, file));
    console.log(`✓ Copied ${file}`);
  } else {
    console.warn(`! ${file} not found in node_modules/tesseract.js-core`);
  }
}

// 3. Fetch traineddata for English language
const traineddataDest = path.join(targetDir, "eng.traineddata.gz");
if (!fs.existsSync(traineddataDest)) {
  console.log("Downloading eng.traineddata.gz (~2 MB)...");
  try {
    const res = await fetch("https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_fast/eng.traineddata.gz");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(traineddataDest, buf);
    console.log("✓ Downloaded eng.traineddata.gz");
  } catch (err) {
    console.error("Failed to download eng.traineddata.gz:", err);
  }
} else {
  console.log("✓ eng.traineddata.gz already exists");
}

console.log("All offline OCR assets configured successfully.");
