/**
 * Client-side image preprocessing for OCR accuracy improvement.
 * Pipeline: Auto-crop → Contrast enhancement → Sharpen → Denoise → Export
 * Also supports text-based files (TXT, CSV) and Office documents (DOCX, XLSX).
 */

/** Load an image file into an HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

/** Get pixel data from canvas context */
function getPixels(ctx: CanvasRenderingContext2D, w: number, h: number) {
  return ctx.getImageData(0, 0, w, h);
}

/** Convert to grayscale luminance for analysis */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Auto-crop: detect document edges by finding rows/cols with content.
 */
function autoCrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number } {
  const imageData = getPixels(ctx, w, h);
  const data = imageData.data;

  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(luminance(data[i], data[i + 1], data[i + 2]));
    hist[lum]++;
  }

  const total = w * h;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVar) {
      maxVar = variance;
      threshold = t;
    }
  }

  let top = h, bottom = 0, left = w, right = 0;
  const margin = 0.02;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const lum = luminance(data[idx], data[idx + 1], data[idx + 2]);
      if (lum < threshold * 0.95) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  const pad = Math.round(Math.min(w, h) * margin);
  top = Math.max(0, top - pad);
  left = Math.max(0, left - pad);
  bottom = Math.min(h - 1, bottom + pad);
  right = Math.min(w - 1, right + pad);

  const cropW = right - left + 1;
  const cropH = bottom - top + 1;
  if (cropW < w * 0.3 || cropH < h * 0.3) {
    return { x: 0, y: 0, w, h };
  }

  return { x: left, y: top, w: cropW, h: cropH };
}

/** Enhance contrast using adaptive histogram stretching. */
function enhanceContrast(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = getPixels(ctx, w, h);
  const data = imageData.data;

  const hist = new Array(256).fill(0);
  const total = w * h;
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(luminance(data[i], data[i + 1], data[i + 2]));
    hist[lum]++;
  }

  let cumSum = 0;
  let low = 0, high = 255;
  for (let i = 0; i < 256; i++) {
    cumSum += hist[i];
    if (cumSum >= total * 0.025 && low === 0) low = i;
    if (cumSum >= total * 0.975) { high = i; break; }
  }

  if (high <= low) { low = 0; high = 255; }
  const range = high - low;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const val = data[i + c];
      data[i + c] = Math.max(0, Math.min(255, Math.round(((val - low) / range) * 255)));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Sharpen using unsharp mask via 3x3 kernel convolution. */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.4) {
  const imageData = getPixels(ctx, w, h);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  const k = strength;
  const kernel = [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            val += src[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        dst[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Denoise using a simple 3x3 median filter. */
function denoise(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = getPixels(ctx, w, h);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const neighbors: number[][] = [];
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4;
          neighbors.push([src[idx], src[idx + 1], src[idx + 2]]);
        }
      }
      neighbors.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2]));
      const med = neighbors[4];
      const idx = (y * w + x) * 4;
      dst[idx] = med[0];
      dst[idx + 1] = med[1];
      dst[idx + 2] = med[2];
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/** File type categories */
const TEXT_EXTENSIONS = ["txt", "csv", "tsv", "log", "text"];
const OFFICE_EXTENSIONS = ["docx", "xlsx", "xls", "doc"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"];

/** Determine file category from extension */
function getFileCategory(fileName: string): "image" | "pdf" | "text" | "office" {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (TEXT_EXTENSIONS.includes(ext)) return "text";
  if (OFFICE_EXTENSIONS.includes(ext)) return "office";
  return "image";
}

/** Apply OCR-oriented cleanup to a canvas before export */
function enhanceCanvasForOcr(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize canvas context");

  const crop = autoCrop(ctx, canvas.width, canvas.height);
  if (crop.x !== 0 || crop.y !== 0 || crop.w !== canvas.width || crop.h !== canvas.height) {
    const cropped = ctx.getImageData(crop.x, crop.y, crop.w, crop.h);
    canvas.width = crop.w;
    canvas.height = crop.h;
    ctx.putImageData(cropped, 0, 0);
  }

  const width = canvas.width;
  const height = canvas.height;

  denoise(ctx, width, height);
  enhanceContrast(ctx, width, height);
  sharpen(ctx, width, height, 0.5);
}

/** Export a prepared canvas as JPEG/base64 for OCR */
async function canvasToProcessedResult(
  canvas: HTMLCanvasElement,
  originalName: string
): Promise<Pick<PreprocessResult, "base64" | "file" | "fileType">> {
  enhanceCanvasForOcr(canvas);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = dataUrl.split(",")[1];

  const blob = await (await fetch(dataUrl)).blob();
  const processedFile = new File([blob], originalName.replace(/\.[^.]+$/, "_processed.jpg"), {
    type: "image/jpeg",
  });

  return { base64, file: processedFile, fileType: "jpeg" };
}

/** Render the first page of a PDF to canvas for OCR */
async function renderPdfAllPages(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  // Use fake (inline) worker to avoid cross-origin dynamic import issues
  pdfjs.GlobalWorkerOptions.workerSrc = "";
  const pdfData = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: pdfData, isEvalSupported: false } as any);
  const pdf = await loadingTask.promise;

  try {
   const canvases: HTMLCanvasElement[] = [];

for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  const page = await pdf.getPage(pageNum);

  const initialViewport = page.getViewport({ scale: 1 });
  const longestSide =
    Math.max(initialViewport.width, initialViewport.height) || 1;

  const scale = Math.max(1.5, Math.min(2.5, 2200 / longestSide));
  const viewport = page.getViewport({ scale });

  const pageCanvas = document.createElement("canvas");
  const pageCtx = pageCanvas.getContext("2d");

  if (!pageCtx) throw new Error("Could not initialize PDF canvas");

  pageCanvas.width = Math.ceil(viewport.width);
  pageCanvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: pageCtx,
    viewport,
  } as any).promise;

  canvases.push(pageCanvas);
  page.cleanup();
}

const finalCanvas = document.createElement("canvas");
const finalCtx = finalCanvas.getContext("2d");

if (!finalCtx) throw new Error("Could not initialize final canvas");

finalCanvas.width = Math.max(...canvases.map(c => c.width));
finalCanvas.height = canvases.reduce((sum, c) => sum + c.height, 0);

let yOffset = 0;

for (const canvas of canvases) {
  finalCtx.drawImage(canvas, 0, yOffset);
  yOffset += canvas.height;
}

return finalCanvas;
  } finally {
    await pdf.destroy();
  }
}

/** Read text file content */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/** Convert file to base64 */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

export interface PreprocessResult {
  base64: string;
  file: File;
  storageFile?: File;
  fileType: string;
  /** For text/office files, extracted text content sent directly */
  textContent?: string;
}

/**
 * Full preprocessing pipeline.
 * Supports: images, PDFs, text files (TXT/CSV), Office files (DOCX/XLSX).
 */
export async function preprocessLabImage(file: File): Promise<PreprocessResult> {
  const category = getFileCategory(file.name);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  // ─── Text files: read content directly ───
  if (category === "text") {
    const textContent = await readTextFile(file);
    const base64 = fileToBase64ToString(textContent);
    return { base64, file, fileType: ext, textContent };
  }

  // ─── Office files: send as binary for server-side parsing ───
  if (category === "office") {
    const base64 = await fileToBase64(file);
    return { base64, file, fileType: ext };
  }

  // ─── PDF: pass through without image preprocessing ───
  if (category === "pdf") {
    const renderedCanvas = await renderPdfAllPages(file);
    const processed = await canvasToProcessedResult(renderedCanvas, file.name);
    return { ...processed, storageFile: file };
  }

  // ─── Images: full preprocessing pipeline ───
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const MAX_DIM = 2048;
  let drawW = img.naturalWidth;
  let drawH = img.naturalHeight;
  if (drawW > MAX_DIM || drawH > MAX_DIM) {
    const scale = MAX_DIM / Math.max(drawW, drawH);
    drawW = Math.round(drawW * scale);
    drawH = Math.round(drawH * scale);
  }

  canvas.width = drawW;
  canvas.height = drawH;
  ctx.drawImage(img, 0, 0, drawW, drawH);

  const processed = await canvasToProcessedResult(canvas, file.name);

  URL.revokeObjectURL(img.src);

  return processed;
}

/** Helper: encode plain text string to base64 */
function fileToBase64ToString(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return btoa(text);
  }
}

/** Get accepted file types string for file input */
export function getAcceptedFileTypes(includeCamera = false): string {
  const types = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    // Text files
    ".txt",
    ".csv",
    ".tsv",
    // Office files
    ".docx",
    ".xlsx",
    ".xls",
    ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/msword",
    "text/plain",
    "text/csv",
  ];
  return types.join(",");
}

/** Get camera-only accepted types */
export function getCameraAcceptedTypes(): string {
  return "image/jpeg,image/jpg,image/png";
}
