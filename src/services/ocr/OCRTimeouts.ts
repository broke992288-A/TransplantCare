/**
 * Centralized OCR pipeline timeouts.
 *
 * Tightened from the previous 60s/90s defaults to fail fast and keep the
 * doctor's UI responsive. Anything longer than these means something is
 * wrong (worker stuck, AI gateway down, network blip) and we should surface
 * it instead of waiting silently.
 */
export const OCR_TIMEOUTS = {
  /** Native PDF text extraction OR full image preprocessing pipeline. */
  EXTRACT_MS: 60_000,
  /** AI OCR fallback round-trip (only when deterministic parse failed). */
  AI_OCR_MS: 90_000,
  /** Storage upload + signed URL creation. */
  UPLOAD_MS: 120_000,
  /** Best-effort orphan cleanup. */
  CLEANUP_MS: 10_000,
} as const;
