/**
 * Auth Lock Patch — prevents `AbortError: Lock broken by another request with the 'steal' option`
 *
 * ROOT CAUSE
 * ----------
 * Supabase Auth (`@supabase/auth-js`) coordinates token refresh across browser
 * tabs via the Web Locks API on a key shaped like `lock:sb-<ref>-auth-token`.
 * After a short timeout it falls back to `navigator.locks.request(name,
 * { steal: true }, …)`. The `steal` option forcibly aborts the original
 * holder, which surfaces in our app as an unhandled
 * `AbortError: Lock broken by another request with the 'steal' option`
 * whenever the user has more than one tab open on the same project.
 *
 * THE FIX
 * -------
 * We install a tiny, scoped wrapper around `navigator.locks.request` that
 * intercepts ONLY supabase auth-token lock requests carrying `steal: true`,
 * strips the `steal` flag, and lets the call wait fairly for the original
 * holder to release. Effects:
 *   - Tabs cooperate instead of stealing → no more AbortError.
 *   - The original holder finishes its critical section normally.
 *   - All other lock requests on the page are passed through unchanged.
 *
 * SAFETY NOTES
 * ------------
 * - Idempotent: guarded by a window-level flag so HMR / re-imports do not
 *   wrap the patched function recursively.
 * - Scoped: the regex matches only `lock:sb-…-auth-token`, so unrelated
 *   libraries / app code keep their original locking semantics.
 * - Non-destructive: we never swallow errors, never short-circuit the
 *   callback, and never replace the whole locks API. If the Web Locks API
 *   is unavailable (older browsers, SSR), the patch is a no-op.
 */

type LockCallback = (lock: Lock | null) => unknown | Promise<unknown>;
type LocksRequest = (
  name: string,
  optionsOrCallback: LockOptions | LockCallback,
  maybeCallback?: LockCallback
) => Promise<unknown>;

const AUTH_LOCK_PATTERN = /^lock:sb-.*-auth-token$/;
const PATCH_FLAG = "__transplantcare_auth_lock_patched__";

export function installAuthLockPatch(): void {
  if (typeof window === "undefined") return;
  if (typeof navigator === "undefined") return;
  if (!navigator.locks || typeof navigator.locks.request !== "function") return;

  const w = window as unknown as Record<string, unknown>;
  if (w[PATCH_FLAG]) return;
  w[PATCH_FLAG] = true;

  const original = navigator.locks.request.bind(navigator.locks) as LocksRequest;

  const patched: LocksRequest = (name, optionsOrCallback, maybeCallback) => {
    // Two valid call signatures: (name, callback) or (name, options, callback)
    const isOptionsForm =
      typeof optionsOrCallback === "object" && optionsOrCallback !== null;

    if (
      isOptionsForm &&
      typeof name === "string" &&
      AUTH_LOCK_PATTERN.test(name) &&
      (optionsOrCallback as LockOptions).steal === true
    ) {
      const { steal: _drop, ...rest } = optionsOrCallback as LockOptions & {
        steal?: boolean;
      };

      // Structured, low-volume log — useful when diagnosing multi-tab issues.
      console.info(
        JSON.stringify({
          scope: "auth-lock-patch",
          event: "steal_suppressed",
          lock: name,
          ts: new Date().toISOString(),
        })
      );

      return original(name, rest as LockOptions, maybeCallback as LockCallback);
    }

    // Pass-through for everything else (including non-auth locks).
    return original(
      name,
      optionsOrCallback as LockOptions | LockCallback,
      maybeCallback as LockCallback | undefined
    );
  };

  // Reassign on the locks instance.
  (navigator.locks as unknown as { request: LocksRequest }).request = patched;
}
