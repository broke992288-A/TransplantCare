/**
 * OCRCoordinator — orchestrates one file end-to-end.
 *
 * Order of operations (process-first, upload-last):
 *   1. extract     — preprocessLabImage (PDF native text OR image pipeline)
 *   2. parse       — deterministic groups (PDFs/text); skip AI entirely
 *      OR
 *      ai         — Edge function ocr-lab-report fallback
 *   3. upload      — only after we have usable groups
 *
 * Cancellation:
 *   - The caller passes an external `signal`. We chain it to an internal
 *     controller that ALSO trips on per-stage timeouts.
 *   - If the file was uploaded but the user cancelled before we returned,
 *     the upload is removed via `cleanupOrphanUpload` (no orphan).
 *
 * Errors:
 *   - On any non-cancel failure after upload, cleanup runs in the catch.
 *   - Errors propagate to the caller verbatim; cancellations preserve the
 *     standard `AbortError` name.
 */

import { preprocessLabImage } from "@/utils/imagePreprocess";
import { supabase } from "@/integrations/supabase/client";
import {
  cleanupOrphanUpload,
  uploadLabReport,
  type UploadHandle,
} from "./UploadManager";
import { OCR_TIMEOUTS } from "./OCRTimeouts";
import { logOCR } from "./OCRLogger";
import type {
  OCRGroupValues,
  OCRProcessOptions,
  OCRResult,
  OCRSource,
} from "./types";

interface OcrEdgeDateGroup {
  date?: string;
  data?: Record<string, number | null>;
  confidence?: Record<string, number>;
  originalText?: Record<string, string>;
  units?: Record<string, string>;
  unitSources?: Record<string, "detected" | "assumed" | "unknown">;
}

interface OcrEdgeResponse {
  error?: string;
  multiDate?: boolean;
  dateGroups?: OcrEdgeDateGroup[];
  data?: Record<string, number | null>;
  confidence?: Record<string, number>;
  originalText?: Record<string, string>;
  units?: Record<string, string>;
  reportType?: string;
}

function abortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("OCR processing was cancelled", "AbortError");
  }
  const e = new Error("OCR processing was cancelled");
  e.name = "AbortError";
  return e;
}

function isAbort(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  return e instanceof Error && e.name === "AbortError";
}

/**
 * Race a promise against a hard timeout, aborting the controller on expiry.
 */
function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
  controller: AbortController,
): Promise<T> {
  let id: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    id = window.setTimeout(() => {
      logOCR("timeout", { label, ms });
      controller.abort();
      reject(new Error(`${label}_TIMEOUT_${ms}ms`));
    }, ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (id !== undefined) window.clearTimeout(id);
  }) as Promise<T>;
}

function valuesFromData(
  data: Record<string, number | null> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const [k, v] of Object.entries(data)) {
    if (v != null && Number.isFinite(v)) out[k] = String(v);
  }
  return out;
}

function countMarkers(groups: OCRGroupValues[]): number {
  return groups.reduce((s, g) => s + Object.keys(g.values).length, 0);
}

/**
 * Strip PHI / raw OCR contents from error messages before logging.
 * Keeps only error class + short code; truncates aggressively.
 */
function sanitizeErrorSummary(err: unknown): string {
  if (!err) return "unknown";
  const raw = err instanceof Error ? `${err.name}:${err.message}` : String(err);
  // Drop anything that looks like a value (numbers, names) — keep code-shape tokens only.
  const stripped = raw
    .replace(/[\u0400-\u04FF]+/g, "") // Cyrillic (patient names)
    .replace(/\b\d[\d.,/-]*\b/g, "") // numeric values
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 120);
}

/**
 * Best-effort OCR failure audit log.
 * Never throws, never includes raw OCR contents or PHI.
 */
async function logOCRFailure(
  patientId: string,
  fileType: string | undefined,
  err: unknown,
  fallbackUsed: boolean,
) {
  try {
    await supabase.from("audit_logs").insert({
      action: "ocr_failed",
      entity_type: "patient",
      entity_id: patientId,
      metadata: {
        file_type: fileType ?? "unknown",
        sanitized_error_summary: sanitizeErrorSummary(err),
        fallback_used: fallbackUsed,
      },
    } as never);
  } catch {
    /* silently ignore — audit must never break workflow */
  }
}

/**
 * Process a single file end-to-end. Returns OCR groups + storage handle.
 */
export async function processFileOCR(
  file: File,
  options: OCRProcessOptions,
): Promise<OCRResult> {
  const { patientId, fileIndex = 0, signal, onStage } = options;

  // Internal controller chained to the external signal so timeouts and
  // user-cancel both abort the same downstream operations.
  const controller = new AbortController();
  if (signal.aborted) throw abortError();
  const onExternalAbort = () => controller.abort();
  signal.addEventListener("abort", onExternalAbort, { once: true });

  const tStart = performance.now();
  let upload: UploadHandle | null = null;
  let aiFallbackUsed = false;
  let observedFileType: string | undefined = file.type || undefined;

  try {
    // ─── Stage 1: extract (preprocess for OCR; also yields storage file) ───
    onStage?.("extract");
    const tExtract = performance.now();
    const preprocessed = await withTimeout(
      preprocessLabImage(file, { signal: controller.signal }),
      OCR_TIMEOUTS.EXTRACT_MS,
      "EXTRACT",
      controller,
    );
    logOCR("extract", {
      file: file.name,
      ms: Math.round(performance.now() - tExtract),
      ok: true,
      source: preprocessed.extractionSource,
    });
    if (controller.signal.aborted) throw abortError();

    const source: OCRSource = preprocessed.extractionSource ?? "ai-image";
    const hasDeterministic =
      !!preprocessed.deterministicGroups && preprocessed.deterministicGroups.length > 0;
    observedFileType = preprocessed.fileType ?? observedFileType;
    aiFallbackUsed = !hasDeterministic;
    // Upload is short and predictable; doing it before AI OCR prevents the
    // combined wall-clock from blowing past a single timeout budget.
    onStage?.("upload");
    const fileToUpload = preprocessed.storageFile ?? preprocessed.file;
    upload = await withTimeout(
      uploadLabReport(fileToUpload, patientId, fileIndex),
      OCR_TIMEOUTS.UPLOAD_MS,
      "UPLOAD",
      controller,
    );
    if (controller.signal.aborted) {
      const path = upload.path;
      upload = null;
      await cleanupOrphanUpload(path);
      throw abortError();
    }

    // ─── Stage 3: parse (deterministic) OR AI OCR fallback ───
    let groups: OCRGroupValues[] = [];
    let reportType = "";

    /** Build unitSources from a units map: detected when non-empty, else unknown. */
    const unitSourcesFromUnits = (
      units: Record<string, string> | undefined,
      values: Record<string, string>,
    ): Record<string, "detected" | "assumed" | "unknown"> => {
      const out: Record<string, "detected" | "assumed" | "unknown"> = {};
      for (const k of Object.keys(values)) {
        const u = units?.[k];
        out[k] = u && u.trim() !== "" ? "detected" : "unknown";
      }
      return out;
    };

    if (hasDeterministic) {
      onStage?.("parse");
      groups = preprocessed.deterministicGroups!.map((g) => {
        const values = valuesFromData(g.data as Record<string, number | null> | undefined);
        const units = (g.units ?? {}) as Record<string, string>;
        return {
          date: g.date ?? "unknown",
          values,
          confidence: (g.confidence ?? {}) as Record<string, number>,
          originalText: (g.originalText ?? {}) as Record<string, string>,
          units,
          unitSources:
            (g.unitSources as Record<string, "detected" | "assumed" | "unknown">) ??
            unitSourcesFromUnits(units, values),
        };
      });
      reportType = "deterministic";
      logOCR("parse", {
        file: file.name,
        source,
        groups: groups.length,
        markers: countMarkers(groups),
      });
    } else {
      onStage?.("ai");
      const tAi = performance.now();
      const aiPromise = supabase.functions.invoke<OcrEdgeResponse>(
        "ocr-lab-report",
        {
          body: {
            imageBase64: preprocessed.base64,
            fileType: preprocessed.fileType,
            textContent: preprocessed.textContent,
            reportUrl: upload.signedUrl,
          },
        },
      );
      const result = await withTimeout(
        aiPromise,
        OCR_TIMEOUTS.AI_OCR_MS,
        "AI_OCR",
        controller,
      );
      logOCR("ai", {
        file: file.name,
        ms: Math.round(performance.now() - tAi),
        ok: !result.error,
      });

      if (result.error) {
        throw new Error(result.error.message || "AI OCR service unavailable");
      }
      const data = result.data;
      if (!data || typeof data !== "object") {
        throw new Error("Invalid AI OCR response");
      }
      if (data.error) throw new Error(data.error);

      const responseDateGroups = Array.isArray(data.dateGroups) ? data.dateGroups : [];
      if (data.multiDate && responseDateGroups.length > 0) {
        groups = responseDateGroups.map((g) => {
          const values = valuesFromData(g.data);
          const units = g.units ?? {};
          return {
            date: g.date ?? "unknown",
            values,
            confidence: g.confidence ?? {},
            originalText: g.originalText ?? {},
            units,
            unitSources: unitSourcesFromUnits(units, values),
          };
        });
      } else {
        const values = valuesFromData(data.data);
        const units = data.units ?? {};
        groups = [
          {
            date: "unknown",
            values,
            confidence: data.confidence ?? {},
            originalText: data.originalText ?? {},
            units,
            unitSources: unitSourcesFromUnits(units, values),
          },
        ];
      }
      reportType = data.reportType ?? "ai";
    }

    // No usable values → cleanup the uploaded file (orphan protection).
    if (countMarkers(groups) === 0) {
      throw new Error("No lab values extracted from file");
    }
    if (controller.signal.aborted) throw abortError();

    onStage?.("done");
    logOCR("done", {
      file: file.name,
      ms: Math.round(performance.now() - tStart),
      source,
      groups: groups.length,
      markers: countMarkers(groups),
      ok: true,
    });

    return {
      groups,
      reportType,
      reportUrl: upload.signedUrl,
      source,
    };
  } catch (err) {
    // Orphan cleanup if upload completed before failure.
    if (upload) {
      const path = upload.path;
      upload = null;
      await cleanupOrphanUpload(path);
    }
    if (isAbort(err)) {
      logOCR("cancel", {
        file: file.name,
        ms: Math.round(performance.now() - tStart),
      });
    } else {
      logOCR("error", {
        file: file.name,
        ms: Math.round(performance.now() - tStart),
        error: err instanceof Error ? err.message : String(err),
      });
      void logOCRFailure(patientId, observedFileType, err, aiFallbackUsed);
    }
    throw err;
  } finally {
    signal.removeEventListener("abort", onExternalAbort);
  }
}
