/**
 * Shared OCR pipeline types.
 *
 * Stage progression for a single file:
 *   pending → extract → parse | ai → upload → done
 *                                ↘ error / cancelled
 */

export type OCRStage =
  | "pending"
  | "extract"
  | "parse"
  | "ai"
  | "upload"
  | "done"
  | "error"
  | "cancelled";

/** Source label used for audit + observability. */
export type OCRSource =
  | "deterministic-pdf"
  | "deterministic-text"
  | "ai-image"
  | "ai-pdf"
  | "ai-office";

export interface OCRGroupValues {
  /** ISO date (YYYY-MM-DD) or "unknown". */
  date: string;
  /** Lab key → string value (kept as string for UI editing). */
  values: Record<string, string>;
  /** Lab key → 0-100 confidence. */
  confidence: Record<string, number>;
  /** Lab key → original raw line/snippet (best-effort). */
  originalText: Record<string, string>;
}

export interface OCRResult {
  groups: OCRGroupValues[];
  reportType: string;
  reportUrl: string | null;
  source: OCRSource;
}

export interface OCRProcessOptions {
  patientId: string;
  fileIndex?: number;
  /** External cancellation signal. Coordinator chains an internal controller for timeouts. */
  signal: AbortSignal;
  /** Optional UI hook called as the file moves through stages. */
  onStage?: (stage: OCRStage) => void;
}
