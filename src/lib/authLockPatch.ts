/**
 * Auth Lock Patch — tolerates `AbortError: Lock broken by another request
 * with the 'steal' option`.
 *
 * BACKGROUND
 * ----------
 * Supabase Auth coordinates token refresh across tabs via the Web Locks API.
 * After a short timeout it falls back to `navigator.locks.request(name,
 * { steal: true }, …)` which forcibly aborts the original holder. The
 * original holder's promise rejects with `AbortError`, which used to bubble
 * up as an unhandled rejection.
 *
 * PREVIOUS (BROKEN) APPROACH
 * --------------------------
 * We used to strip `steal: true` from the lock request. That removed
 * Supabase's only recovery mechanism: if a previous holder was stuck (e.g.
 * a stale service worker on a custom domain, or a crashed tab), every
 * subsequent `signInWithPassword`/`getSession` call would wait forever
 * — manifesting as the Sign-in spinner never resolving on
 * www.transplantcare.uz.
 *
 * NEW APPROACH
 * ------------
 * Let Supabase's native steal logic run untouched. Just silence the benign
 * `AbortError` it produces in the displaced holder so it doesn't surface as
 * an unhandled rejection.
 */

const AUTH_LOCK_ABORT_MSG = "Lock broken by another request";

function isAuthLockAbort(reason: unknown): boolean {
  if (!reason) return false;
  const r = reason as { name?: unknown; message?: unknown };
  const name = typeof r.name === "string" ? r.name : "";
  const message = typeof r.message === "string" ? r.message : "";
  return name === "AbortError" && message.includes(AUTH_LOCK_ABORT_MSG);
}

export function installAuthLockPatch(): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as Record<string, unknown>;
  if (w["__transplantcare_auth_lock_patched__"]) return;
  w["__transplantcare_auth_lock_patched__"] = true;

  window.addEventListener("unhandledrejection", (event) => {
    if (isAuthLockAbort(event.reason)) {
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    if (isAuthLockAbort(event.error)) {
      event.preventDefault();
    }
  });
}
