# Roadmap

- [x] Email infra for notify.transplantcare.uz: scaffolded auth email templates, styled with TransplantCare branding (Uzbek copy, medical cyan), deployed auth-email-hook

## Production-grade stability sprint

- [x] P0 AddLabDialog cursor/focus bug — LabField extracted to its own memoized module
- [x] P0 Unit normalization order — normalize (explicit source unit) → hard validation → save
- [x] P0 auto-notify 503 — AUTO_NOTIFY_SECRET configured, health check, idempotency log, bounded retry
- [x] P0 Doctor dashboard latest lab — DISTINCT ON RPC `get_latest_labs_for_patients`
- [x] P1 DB indexes (labs, meds, events, roles, patients, alerts, snapshots, schedules)
- [x] P1 Polling reduced (alerts 30s→5m, overdue labs 1m→5m, background polling off)
- [x] P1 PWA precache trimmed (heavy PDF/chart chunks moved to runtime CacheFirst)

### Open (not yet done)
- [ ] Offline last-known-safe read cache + stale/offline badge on patient data
- [ ] Local draft/queue for lab submission on unstable networks
- [ ] Pagination/infinite loading for large patient and lab lists
- [ ] AbortController-based cancellation for stale list/search requests
- [ ] Unify dual risk engines (TypeScript v4/v5 vs SQL v5.1) — UI/DB score divergence risk
- [ ] recalculate-risk edge function: add patient-ownership check at the edge layer
- [ ] Remove remaining `any` casts in supabase/functions/recalculate-risk (pre-existing lint errors)
- [ ] clinical_thresholds seed file for reproducibility (production config not version controlled)
