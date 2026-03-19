/**
 * Client-side image preprocessing for OCR accuracy improvement.
 * Pipeline: Auto-crop → Contrast enhancement → Sharpen → Denoise → Export
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
 * Uses Otsu-like threshold to separate document from background.
 */
function autoCrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number } {
  const imageData = getPixels(ctx, w, h);
  const data = imageData.data;

  // Build luminance histogram
  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(luminance(data[i], data[i + 1], data[i + 2]));
    hist[lum]++;
  }

  // Otsu threshold
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

  // Find bounding box of dark (document) pixels
  let top = h, bottom = 0, left = w, right = 0;
  const margin = 0.02; // 2% margin tolerance

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

  // Add small padding
  const pad = Math.round(Math.min(w, h) * margin);
  top = Math.max(0, top - pad);
  left = Math.max(0, left - pad);
  bottom = Math.min(h - 1, bottom + pad);
  right = Math.min(w - 1, right + pad);

  // If crop would remove >70% of image, skip cropping
  const cropW = right - left + 1;
  const cropH = bottom - top + 1;
  if (cropW < w * 0.3 || cropH < h * 0.3) {
    return { x: 0, y: 0, w, h };
  }

  return { x: left, y: top, w: cropW, h: cropH };
}

/**
 * Enhance contrast using adaptive histogram stretching.
 * Maps the middle 95% of the histogram to full range.
 */
function enhanceContrast(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = getPixels(ctx, w, h);
  const data = imageData.data;

  // Find 2.5th and 97.5th percentile
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

/**
 * Sharpen using unsharp mask via 3x3 kernel convolution.
 */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.4) {
  const imageData = getPixels(ctx, w, h);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  // Sharpening kernel
  const k = strength;
  const kernel = [
    0, -k, 0,
    -k, 1 + 4 * k, -k,
    0, -k, 0,
  ];

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

/**
 * Denoise using a simple 3x3 median filter on luminance,
 * preserving color ratios.
 */
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
      // Sort by luminance, pick median
      neighbors.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2]));
      const med = neighbors[4]; // median of 9
      const idx = (y * w + x) * 4;
      dst[idx] = med[0];
      dst[idx + 1] = med[1];
      dst[idx + 2] = med[2];
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Full preprocessing pipeline.
 * Returns a preprocessed base64 string (JPEG) and the cleaned File.
 */
export async function preprocessLabImage(file: File): Promise<{ base64: string; file: File; fileType: string }> {
  // Skip preprocessing for PDFs
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return { base64, file, fileType: "pdf" };
  }

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Resize large images to max 2048px on longest side (prevents payload too large errors)
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

  // Step 1: Auto-crop (detect document edges)
  const crop = autoCrop(ctx, canvas.width, canvas.height);

  // Apply crop if different from original
  if (crop.x !== 0 || crop.y !== 0 || crop.w !== canvas.width || crop.h !== canvas.height) {
    const cropped = ctx.getImageData(crop.x, crop.y, crop.w, crop.h);
    canvas.width = crop.w;
    canvas.height = crop.h;
    ctx.putImageData(cropped, 0, 0);
  }

  const w = canvas.width;
  const h = canvas.height;

  // Step 2: Denoise first (remove noise before enhancing)
  denoise(ctx, w, h);

  // Step 3: Enhance contrast
  enhanceContrast(ctx, w, h);

  // Step 4: Sharpen text
  sharpen(ctx, w, h, 0.5);

  // Export as high-quality JPEG
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = dataUrl.split(",")[1];

  // Convert to File for storage upload
  const blob = await (await fetch(dataUrl)).blob();
  const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, "_processed.jpg"), {
    type: "image/jpeg",
  });

  // Clean up
  URL.revokeObjectURL(img.src);

  return { base64, file: processedFile, fileType: "jpeg" };
}
