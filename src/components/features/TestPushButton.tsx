import { useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; sent: number; failed: number; total: number }
  | { kind: "error"; message: string };

export default function TestPushButton() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sendTest = async () => {
    if (!user) {
      setStatus({ kind: "error", message: "Tizimga kiring" });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_ids: [user.id],
          title: "Test bildirishnoma 🔔",
          body: "Push notification ishlayapti!",
          url: "/patient/home",
        },
      });
      if (error) throw error;
      const sent = Number(data?.sent ?? 0);
      const failed = Number(data?.failed ?? 0);
      const total = Number(data?.total ?? 0);
      if (total === 0) {
        setStatus({ kind: "error", message: "Obuna topilmadi. Avval bildirishnomalarni yoqing." });
        return;
      }
      setStatus({ kind: "success", sent, failed, total });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", message });
    }
  };

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
        <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 flex items-start gap-2 text-xs">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <span>
            Yuborildi: <span className="font-semibold">{status.sent}</span> / {status.total}
            {status.failed > 0 && <> · Xato: <span className="font-semibold text-destructive">{status.failed}</span></>}
          </span>
        </div>
      )}

      {status.kind === "error" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-start gap-2 text-xs">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span className="break-words">{status.message}</span>
        </div>
      )}
    </div>
  );
}
