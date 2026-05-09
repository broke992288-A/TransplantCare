# OCR Pipeline Hardening — Phased Refactor Plan

Goal: turn the current OCR flow into a production-grade clinical ingestion system **without a single risky rewrite**. Each phase is independently shippable, fully tested, and reversible.

Current state (already done in earlier phases):
- Deterministic PDF text extraction (`pdfTextExtractor.ts`)
- Deterministic regex parser (`deterministicLabParser.ts`)
- Multilingual alias dictionary (`labAliases.ts`)
- AbortController lifecycle in `LabUploadDialog`
- Validation engine skeleton (`labValidation.ts`)

What's still wrong:
- `LabUploadDialog.tsx` owns upload + extract + parse + validate + AI fallback + state
- Files upload to Storage **before** OCR confirms → orphans on failure
- Timeouts are loose, no per-file progress, sequential only
- No structured metrics / observability
- Validation is partly in components
- Stale-response protection is incomplete (only top-level `processId`)

---

## Phase A — Service extraction & orphan cleanup (this iteration)

Smallest safe slice that delivers the biggest architectural win.

### New services (pure, no React)
```
src/services/ocr/
  ├── OCRCoordinator.ts        # orchestrates one file end-to-end
  ├── UploadManager.ts         # upload + delete-on-failure (orphan cleanup)
  ├── OCRLogger.ts             # structured stage logs + durations
  ├── OCRTimeouts.ts           # central timeout constants
  ├── pdfTextExtractor.ts      # (existing)
  ├── deterministicLabParser.ts# (existing)
  ├── labAliases.ts            # (existing)
  └── types.ts                 # OCRStage, OCRResult, OCRError
```

### Behavior changes
1. **Upload-after-confirm**: extract & parse first; only upload to `lab_reports` bucket once we have *either* a deterministic result *or* a successful AI fallback. On any failure → no upload happens, nothing to clean.
2. **Orphan cleanup safety net**: if upload succeeds but a later step (DB insert) fails, `UploadManager.cleanup(path)` removes the storage object inside the catch block.
3. **Tight timeouts** (centralized): `EXTRACT=20s`, `AI_OCR=35s`, `UPLOAD=20s`. Each stage races its own `AbortController`.
4. **Stale-response guard**: every async resolve checks `signal.aborted` before mutating state. Coordinator returns early instead of throwing on cancel.
5. **Structured logs**: every stage emits `{file, stage, durationMs, ok, source, markerCount}` via `OCRLogger`. Easy to forward to a metrics endpoint later.

### LabUploadDialog.tsx
Becomes a **thin orchestrator** that:
- maintains UI state per file (`pending|extracting|parsing|ai|uploading|done|error`)
- calls `OCRCoordinator.process(file, { signal, onStage })`
- renders results

No clinical logic, no pdfjs, no supabase storage calls inline.

### Tests
- `OCRCoordinator.test.ts` — happy path (deterministic), AI fallback path, cancel mid-flight, upload failure → cleanup invoked.
- Existing `deterministicLabParser.test.ts` keeps passing.

---

## Phase B — Concurrency, queue & per-file progress

- `OCRQueue` with `maxConcurrent=2`, FIFO, per-file `AbortController`.
- UI shows per-file progress bar + cancel button.
- Backpressure: drag-drop of 20 files → only 2 run at a time, rest queued.
- Memory audit: ensure pdfjs `pdf.destroy()` + `page.cleanup()` on every exit path (already done in extractor; verify across coordinator).

## Phase C — Validation engine consolidation + confidence-aware UI

- Move all suspicious-threshold + unit-conversion logic into `ValidationEngine` service (extends current `labValidation.ts`).
- Coordinator returns `{ values, validation, confidence }`.
- Dialog renders: blocked (impossible) / must-confirm (low confidence or suspicious) / auto-accepted.
- Audit log entry on every accepted import noting confidence + source (deterministic vs AI).

## Phase D — Observability & file-type allow-list

- Strict accept list: `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/csv`. Reject others with clear toast before any processing.
- `OCRLogger` ships aggregated metrics to a new `ocr_metrics` table (or reuses `audit_logs`) — daily success rates, AI fallback %, p95 durations.
- Optional: small `/system-health` panel surface.

---

## Why this order

- **A first** because it removes the biggest production risks (orphan uploads, runaway timeouts, monolithic component) with the smallest blast radius.
- **B** is a pure UX/perf layer on top of A's clean coordinator.
- **C** depends on coordinator returning structured confidence — needs A.
- **D** is polish + metrics, safe to ship last.

Each phase: ~1 iteration, fully tested, no schema changes in A/B, optional schema in D.

---

## Ask before I start Phase A

1. **Upload timing**: confirm switch from "upload-then-process" → "process-then-upload". This changes the audit trail slightly (failed OCR = no stored file). Acceptable, or do you want failed files retained for debugging?
2. **Cancel semantics**: when the user closes the dialog mid-process, should in-flight uploads be deleted from storage, or kept?
3. **Scope of Phase A**: ship only services + orphan cleanup + tight timeouts + thin dialog (no concurrency yet)?
