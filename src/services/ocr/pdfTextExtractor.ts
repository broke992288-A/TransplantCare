/**
 * PDF Text Extractor — uses pdfjs `getTextContent()` to pull selectable text
 * directly from PDFs without rendering or OCR. Returns text + quality signal.
 *
 * Worker is the same one used by image rendering (loaded via Vite ?url).
 * Cooperative cancellation via AbortSignal.
 */

import type { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";

export interface PdfTextExtractionResult {
  /** Concatenated text across all extracted pages, page-separated by \f */
  text: string;
  /** Per-page text */
  pages: string[];
  /** Native extraction quality. "good" → safe to skip AI OCR. */
  quality: "good" | "poor" | "empty";
  /** Total characters across pages */
  charCount: number;
  /** Letter character count (latin/cyrillic) */
  letterCount: number;
  /** Pages actually processed (may be capped) */
  processedPages: number;
  /** Total pages in document */
  totalPages: number;
  /** ms taken */
  durationMs: number;
}

const MAX_PAGES = 10;
/** Min letters across whole document to consider extraction "good". */
const MIN_LETTERS = 80;
/** Min total characters to even consider "good". */
const MIN_CHARS = 200;

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("PDF text extraction was cancelled", "AbortError");
  }
  const e = new Error("PDF text extraction was cancelled");
  e.name = "AbortError";
  return e;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError();
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item;
}

function joinTextContent(content: TextContent): string {
  const lines: string[] = [];
  let currentY: number | null = null;
  let buffer: string[] = [];
  for (const item of content.items) {
    if (!isTextItem(item)) continue;
    const y = item.transform?.[5] ?? 0;
    if (currentY === null) {
      currentY = y;
    } else if (Math.abs(y - currentY) > 2) {
      lines.push(buffer.join(" ").trim());
      buffer = [];
      currentY = y;
    }
    if (item.str) buffer.push(item.str);
  }
  if (buffer.length) lines.push(buffer.join(" ").trim());
  return lines.filter(Boolean).join("\n");
}

function countLetters(text: string): number {
  const matches = text.match(/[\p{L}]/gu);
  return matches ? matches.length : 0;
}

/**
 * Extract selectable text from a PDF File. Falls back to "poor" quality
 * if pages contain no embedded text (typical for scanned PDFs).
 */
export async function extractPdfText(
  file: File,
  signal?: AbortSignal
): Promise<PdfTextExtractionResult> {
  const t0 = performance.now();
  throwIfAborted(signal);

  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  throwIfAborted(signal);
  const data = new Uint8Array(await file.arrayBuffer());

  const loadingTask = pdfjs.getDocument({ data });
  const onAbortLoad = () => loadingTask.destroy();
  signal?.addEventListener("abort", onAbortLoad, { once: true });

  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (err) {
    signal?.removeEventListener("abort", onAbortLoad);
    if (signal?.aborted) throw createAbortError();
    throw err;
  }

  try {
    const totalPages = pdf.numPages;
    const processedPages = Math.min(totalPages, MAX_PAGES);
    const pages: string[] = [];

    for (let i = 1; i <= processedPages; i++) {
      throwIfAborted(signal);
      const page = await pdf.getPage(i);
      try {
        const content = await page.getTextContent();
        pages.push(joinTextContent(content));
      } finally {
        page.cleanup();
      }
    }

    const text = pages.join("\n\f\n");
    const charCount = text.length;
    const letterCount = countLetters(text);

    let quality: PdfTextExtractionResult["quality"];
    if (charCount === 0) quality = "empty";
    else if (charCount >= MIN_CHARS && letterCount >= MIN_LETTERS) quality = "good";
    else quality = "poor";

    return {
      text,
      pages,
      quality,
      charCount,
      letterCount,
      processedPages,
      totalPages,
      durationMs: Math.round(performance.now() - t0),
    };
  } finally {
    signal?.removeEventListener("abort", onAbortLoad);
    await pdf.destroy();
  }
}

/** Read a plain text file (txt/csv/tsv) into a UTF-8 string with abort support. */
export async function readTextFileAsString(file: File, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(createAbortError());
    const reader = new FileReader();
    const onAbort = () => {
      reader.abort();
      reject(createAbortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    reader.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve(String(reader.result ?? ""));
    };
    reader.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(reader.error ?? new Error("Could not read text file"));
    };
    reader.readAsText(file, "utf-8");
  });
}
