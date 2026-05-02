import { useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DeliveryError {
  id: string;
  status?: number;
  message: string;
}

interface ProgressState {
  total: number;
  index: number;
  sent: number;
  failed: number;
  last?:
    | { ok: true; id: string }
    | { ok: false; id: string; status?: number; message: string };
}

type Status =
  | { kind: "idle" }
  | { kind: "loading"; progress?: ProgressState }
  | {
      kind: "success";
      sent: number;
      failed: number;
      total: number;
      errors: DeliveryError[];
    }
  | { kind: "error"; httpStatus?: number; message: string; raw?: string };

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`;

export default function TestPushButton() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [showDetails, setShowDetails] = useState(false);

  const sendTest = async () => {
    if (!user) {
      setStatus({ kind: "error", message: "Tizimga kiring" });
      return;
    }
    setStatus({ kind: "loading" });
    setShowDetails(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus({ kind: "error", message: "Sessiya topilmadi" });
        return;
      }

      const resp = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify({
          user_ids: [user.id],
          title: "Test bildirishnoma 🔔",
          body: "Push notification ishlayapti!",
          url: "/patient/home",
        }),
      });

      if (!resp.ok || !resp.body) {
        const raw = await resp.text().catch(() => "");
        let message = `Edge function xatosi (${resp.status})`;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) message = String(parsed.error);
        } catch {
          /* ignore */
        }
        setStatus({ kind: "error", httpStatus: resp.status, message, raw });
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let total = 0;
      let sent = 0;
      let failed = 0;
      const errors: DeliveryError[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE blocks separated by blank line
        let sepIdx;
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);

          let event = "message";
          let dataStr = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (event === "start") {
            total = Number(payload.total ?? 0);
            setStatus({
              kind: "loading",
              progress: { total, index: 0, sent: 0, failed: 0 },
            });
          } else if (event === "progress") {
            const p: ProgressState = {
              total: Number(payload.total ?? total),
              index: Number(payload.index ?? 0),
              sent: Number(payload.sent ?? 0),
              failed: Number(payload.failed ?? 0),
              last: payload.last as ProgressState["last"],
            };
            sent = p.sent;
            failed = p.failed;
            if (p.last && !p.last.ok) {
              errors.push({
                id: p.last.id,
                status: p.last.status,
                message: p.last.message,
              });
            }
            setStatus({ kind: "loading", progress: p });
          } else if (event === "done") {
            total = Number(payload.total ?? total);
            sent = Number(payload.sent ?? sent);
            failed = Number(payload.failed ?? failed);
          }
        }
      }

      if (total === 0) {
        setStatus({
          kind: "error",
          message: "Obuna topilmadi. Avval bildirishnomalarni yoqing.",
        });
        return;
      }
      setShowDetails(errors.length > 0);
      setStatus({ kind: "success", sent, failed, total, errors });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", message });
    }
  };

  const hasDetails =
    (status.kind === "success" && status.errors.length > 0) ||
    (status.kind === "error" && (status.raw || status.httpStatus));

  const progress = status.kind === "loading" ? status.progress : undefined;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.index / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-2 border-t pt-3">
      <Button
        size="sm"
        variant="secondary"
        onClick={sendTest}
        disabled={status.kind === "loading"}
        className="w-full"
      >
        {status.kind === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Test push yuborish
      </Button>

      {status.kind === "loading" && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {progress
                ? `Yuborilmoqda: ${progress.index} / ${progress.total}`
                : "Obunalar yuklanmoqda…"}
            </span>
            {progress && (
              <span className="font-mono font-semibold">{pct}%</span>
            )}
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className="h-full bg-primary transition-all duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {progress && (progress.sent > 0 || progress.failed > 0) && (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" />
                {progress.sent}
              </span>
              <span className="inline-flex items-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" />
                {progress.failed}
              </span>
              {progress.last && !progress.last.ok && (
                <span className="font-mono text-muted-foreground truncate">
                  · {progress.last.status ?? "—"}: {progress.last.message.slice(0, 40)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {status.kind === "success" && (
        <div
          className={`rounded-md border px-3 py-2 text-xs space-y-1 ${
            status.failed === 0
              ? "border-success/30 bg-success/5"
              : status.sent === 0
                ? "border-destructive/30 bg-destructive/5"
                : "border-warning/30 bg-warning/5"
          }`}
        >
          <div className="flex items-start gap-2">
            {status.failed === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
            ) : (
              <XCircle
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  status.sent === 0 ? "text-destructive" : "text-warning"
                }`}
              />
            )}
            <span>
              HTTP <span className="font-mono font-semibold">200</span> ·{" "}
              {status.failed > 0
                ? "Server qabul qildi, lekin push yetkazilmadi"
                : "Push yetkazildi"}{" "}
              · Yuborildi: <span className="font-semibold">{status.sent}</span> / {status.total}
              {status.failed > 0 && (
                <>
                  {" "}
                  · Xato:{" "}
                  <span className="font-semibold text-destructive">
                    {status.failed}
                  </span>
                </>
              )}
            </span>
          </div>

          {hasDetails && (
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {showDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showDetails ? "Tafsilotni yashirish" : "Tafsilotlarni ko'rsatish"}
            </button>
          )}

          {showDetails && status.errors.length > 0 && (
            <ul className="mt-1 space-y-1 font-mono text-[11px] break-words">
              {status.errors.map((e, i) => (
                <li
                  key={`${e.id}-${i}`}
                  className="rounded border border-destructive/20 bg-destructive/5 px-2 py-1"
                >
                  <div>
                    <span className="text-muted-foreground">sub:</span>{" "}
                    {e.id.slice(0, 8)}…
                  </div>
                  <div>
                    <span className="text-muted-foreground">status:</span>{" "}
                    <span className="font-semibold">{e.status ?? "—"}</span>
                  </div>
                  <div className="whitespace-pre-wrap">
                    <span className="text-muted-foreground">msg:</span> {e.message}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {status.kind === "error" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs space-y-1">
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="break-words">
              {status.httpStatus !== undefined && (
                <>
                  HTTP{" "}
                  <span className="font-mono font-semibold">{status.httpStatus}</span> ·{" "}
                </>
              )}
              {status.message}
            </span>
          </div>

          {hasDetails && (
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {showDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showDetails ? "Xom javobni yashirish" : "Xom javobni ko'rsatish"}
            </button>
          )}

          {showDetails && status.raw && (
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-background/60 p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
              {status.raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
