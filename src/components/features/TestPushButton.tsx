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

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "success";
      sent: number;
      failed: number;
      total: number;
      errors: DeliveryError[];
    }
  | { kind: "error"; httpStatus?: number; message: string; raw?: string };

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
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_ids: [user.id],
          title: "Test bildirishnoma 🔔",
          body: "Push notification ishlayapti!",
          url: "/patient/home",
        },
      });

      if (error) {
        // FunctionsHttpError exposes the underlying Response on `context`.
        const ctx = (error as unknown as { context?: Response }).context;
        let httpStatus: number | undefined = ctx?.status;
        let raw: string | undefined;
        let message = error.message ?? "Edge function xatosi";
        if (ctx && typeof ctx.text === "function") {
          try {
            raw = await ctx.text();
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.error) message = String(parsed.error);
            } catch {
              /* raw text only */
            }
          } catch {
            /* ignore */
          }
        }
        setStatus({ kind: "error", httpStatus, message, raw });
        return;
      }

      const sent = Number(data?.sent ?? 0);
      const failed = Number(data?.failed ?? 0);
      const total = Number(data?.total ?? 0);
      const errors: DeliveryError[] = Array.isArray(data?.errors) ? data.errors : [];

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
