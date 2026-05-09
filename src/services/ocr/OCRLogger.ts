/**
 * Structured OCR pipeline logger.
 *
 * Emits one JSON object per stage so logs can be grep'd / shipped to
 * external observability later without changing call sites.
 */

export type OCRLogStage =
  | "extract"
  | "parse"
  | "ai"
  | "upload"
  | "cleanup"
  | "timeout"
  | "cancel"
  | "error"
  | "done";

export interface OCRLogPayload {
  file?: string;
  ms?: number;
  ok?: boolean;
  source?: string;
  groups?: number;
  markers?: number;
  path?: string;
  label?: string;
  error?: string;
  [key: string]: unknown;
}

export function logOCR(stage: OCRLogStage, payload: OCRLogPayload = {}): void {
  try {
    // Single-line JSON for easy ingestion.
    // eslint-disable-next-line no-console
    console.info(
      JSON.stringify({
        scope: "ocr",
        stage,
        ts: new Date().toISOString(),
        ...payload,
      }),
    );
  } catch {
    // eslint-disable-next-line no-console
    console.info("[ocr]", stage, payload);
  }
}
