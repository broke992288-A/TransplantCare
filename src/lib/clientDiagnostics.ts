/**
 * Lightweight client-side error + freeze logging.
 * Persists to public.client_diagnostics via a direct REST call (keepalive),
 * independent of the Supabase JS client so it still works if that client hangs.
 * Never records form values, passwords or clinical data — only error text,
 * stack, route and timing.
 */
type EventType = "error" | "unhandled_rejection" | "long_task" | "freeze";

interface DiagEvent {
  event_type: EventType;
  message?: string;
  stack?: string;
  source?: string;
  duration_ms?: number;
  extra?: Record<string, unknown>;
}

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const MAX_EVENTS_PER_SESSION = 30;
const LONG_TASK_MIN_MS = 1000;
const FREEZE_GAP_MS = 3000;
const HEARTBEAT_MS = 1000;

const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
let sent = 0;
let queue: Record<string, unknown>[] = [];
let flushTimer: number | undefined;
const seen = new Set<string>();

const cut = (s: unknown, n: number): string | undefined =>
  s == null ? undefined : String(s).slice(0, n);

function currentUserId(): string | undefined {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const parsed: unknown = JSON.parse(localStorage.getItem(k) ?? "null");
        const id = (parsed as { user?: { id?: string } } | null)?.user?.id;
        if (id) return id;
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function flush(): void {
  if (!URL_BASE || !ANON_KEY || queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    void fetch(`${URL_BASE}/rest/v1/client_diagnostics`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(batch),
    }).catch(() => undefined);
  } catch {
    /* never throw from the logger */
  }
}

function record(ev: DiagEvent): void {
  if (sent >= MAX_EVENTS_PER_SESSION) return;
  const key = `${ev.event_type}|${ev.message ?? ""}|${ev.source ?? ""}`;
  if (ev.event_type !== "freeze" && seen.has(key)) return;
  seen.add(key);
  sent++;
  queue.push({
    event_type: ev.event_type,
    message: cut(ev.message, 2000),
    stack: cut(ev.stack, 8000),
    source: cut(ev.source, 1000),
    route: cut(location.pathname + location.hash, 500),
    host: cut(location.host, 200),
    duration_ms: ev.duration_ms != null ? Math.round(ev.duration_ms) : undefined,
    session_id: sessionId,
    user_agent: cut(navigator.userAgent, 500),
    app_version: cut(import.meta.env.MODE, 64),
    extra: { ...ev.extra, reported_user_id: currentUserId(), visible: document.visibilityState },
  });
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, 2000);
}

let installed = false;

export function installClientDiagnostics(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    record({
      event_type: "error",
      message: e.message,
      stack: e.error instanceof Error ? e.error.stack : undefined,
      source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const r: unknown = e.reason;
    record({
      event_type: "unhandled_rejection",
      message: r instanceof Error ? r.message : (() => { try { return JSON.stringify(r); } catch { return String(r); } })(),
      stack: r instanceof Error ? r.stack : undefined,
    });
  });

  // Long tasks (Chromium): main thread blocked ≥1s.
  try {
    if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= LONG_TASK_MIN_MS) {
            record({ event_type: "long_task", duration_ms: entry.duration, source: entry.name });
          }
        }
      }).observe({ type: "longtask", buffered: true });
    }
  } catch {
    /* unsupported */
  }

  // Freeze detector: heartbeat gap while the tab is visible (works on all browsers).
  let last = performance.now();
  window.setInterval(() => {
    const now = performance.now();
    const gap = now - last - HEARTBEAT_MS;
    last = now;
    if (gap >= FREEZE_GAP_MS && document.visibilityState === "visible") {
      record({ event_type: "freeze", duration_ms: gap });
    }
  }, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}
