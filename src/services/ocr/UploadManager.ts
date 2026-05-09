/**
 * Upload + orphan cleanup for lab report files.
 *
 * Contract:
 *   - `uploadLabReport` is called only AFTER OCR/parse succeeds.
 *   - If anything later fails (or the user cancels mid-flight), the caller
 *     MUST call `cleanupOrphanUpload(handle.path)` to avoid storage orphans.
 *   - `cleanupOrphanUpload` never throws — it logs and swallows errors so a
 *     cleanup failure cannot mask the original error.
 */

import { supabase } from "@/integrations/supabase/client";
import { logOCR } from "./OCRLogger";

const BUCKET = "lab_reports";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

export interface UploadHandle {
  /** Storage path within the bucket. Use this for cleanup. */
  path: string;
  /** Time-limited signed URL for downstream display. May be null if signing failed. */
  signedUrl: string | null;
}

function safeExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  // Allow only short, alphanumeric extensions to avoid path injection.
  if (!ext || ext.length > 8 || !/^[a-z0-9]+$/.test(ext)) return "bin";
  return ext;
}

export async function uploadLabReport(
  file: File,
  patientId: string,
  fileIndex = 0,
): Promise<UploadHandle> {
  const ext = safeExtension(file.name);
  const path = `${patientId}/${Date.now()}_${fileIndex}.${ext}`;
  const t0 = performance.now();

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file);
  if (uploadErr) {
    logOCR("upload", { path, ok: false, error: uploadErr.message });
    throw uploadErr;
  }

  let signedUrl: string | null = null;
  try {
    const { data, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signErr) throw signErr;
    signedUrl = data?.signedUrl ?? null;
  } catch (err) {
    // Don't fail the whole flow just because URL signing hiccuped — the
    // file is uploaded, we just won't have a preview link.
    logOCR("upload", {
      path,
      ok: true,
      signedUrl: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logOCR("upload", {
    path,
    ms: Math.round(performance.now() - t0),
    ok: true,
    signedUrl: signedUrl != null,
  });
  return { path, signedUrl };
}

/**
 * Best-effort orphan cleanup. Never throws.
 */
export async function cleanupOrphanUpload(path: string): Promise<void> {
  if (!path) return;
  const t0 = performance.now();
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    logOCR("cleanup", {
      path,
      ms: Math.round(performance.now() - t0),
      ok: true,
    });
  } catch (err) {
    logOCR("cleanup", {
      path,
      ms: Math.round(performance.now() - t0),
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
