import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Re-registers the push subscription against the CURRENT VAPID public key.
 *
 * Why this exists:
 *   When the server-side VAPID keypair is rotated, every existing PushSubscription
 *   becomes permanently invalid (server returns 403/410 on send). Browsers do NOT
 *   automatically re-subscribe — the user (or this button) must explicitly:
 *     1. unsubscribe() the stale browser-side PushSubscription,
 *     2. delete the stale row(s) from `push_subscriptions`,
 *     3. subscribe() again, which generates a fresh subscription bound to the
 *        current VAPID_PUBLIC_KEY,
 *     4. upsert the new subscription back into the DB.
 *
 * After this runs, the test-push button (and cron-driven pushes) should deliver.
 */

const VAPID_PUBLIC_KEY =
  "BESenczV7nbE35U7T8moJbH4vmXypq8gijuBKLr9dWs3BqukRBqoeFWk-80qwzIgnh0OO7t-xcGCckVhMIEA7Hw";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

type Status =
  | { kind: "idle" }
  | { kind: "loading"; step: string }
  | { kind: "success"; endpoint: string }
  | { kind: "error"; message: string };

interface Props {
  onResubscribed?: () => void;
}

export default function ResubscribePushButton({ onResubscribed }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const resubscribe = async () => {
    if (!user) {
      setStatus({ kind: "error", message: "Tizimga kiring" });
      return;
    }
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setStatus({ kind: "error", message: "Brauzer push'ni qo'llab-quvvatlamaydi" });
      return;
    }

    try {
      // 1. Ensure permission is still granted.
      setStatus({ kind: "loading", step: "Ruxsat tekshirilmoqda…" });
      if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setStatus({ kind: "error", message: "Bildirishnoma ruxsati berilmadi" });
          return;
        }
      }

      // 2. Get the active SW registration (VitePWA owns registration).
      setStatus({ kind: "loading", step: "Service worker tayyorlanmoqda…" });
      const registration = await navigator.serviceWorker.ready;

      // 3. Unsubscribe any existing browser-side subscription.
      setStatus({ kind: "loading", step: "Eski obuna o'chirilmoqda…" });
      const existing = await registration.pushManager.getSubscription();
      const oldEndpoint = existing?.endpoint;
      if (existing) {
        try {
          await existing.unsubscribe();
        } catch {
          /* best-effort */
        }
      }

      // 4. Drop ALL stale rows for this user (covers cross-key/cross-device cruft).
      setStatus({ kind: "loading", step: "Bazadan eski yozuvlar olib tashlanmoqda…" });
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

      // 5. Re-subscribe with the current VAPID public key.
      setStatus({ kind: "loading", step: "Yangi obuna yaratilmoqda…" });
      const arr = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscribeOpts: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: arr.buffer.slice(
          arr.byteOffset,
          arr.byteOffset + arr.byteLength,
        ) as ArrayBuffer,
      };
      const fresh = await registration.pushManager.subscribe(subscribeOpts);

      // 6. Persist the fresh subscription.
      setStatus({ kind: "loading", step: "Yangi obuna saqlanmoqda…" });
      const json = fresh.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        [
          {
            user_id: user.id,
            endpoint: fresh.endpoint,
            subscription: json as never,
          },
        ],
        { onConflict: "user_id,endpoint" },
      );
      if (error) throw error;

      setStatus({ kind: "success", endpoint: fresh.endpoint });
      onResubscribed?.();

      // Note: log only the endpoint origin to avoid leaking the full unique URL.
      try {
        const origin = new URL(fresh.endpoint).origin;
        console.info("[push] re-subscribed", { provider: origin, replaced: !!oldEndpoint });
      } catch {
        /* ignore */
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[push] resubscribe failed", err);
      setStatus({ kind: "error", message });
    }
  };

  const loading = status.kind === "loading";

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        onClick={resubscribe}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        VAPID kalitini qayta ro'yxatdan o'tkazish
      </Button>

      {status.kind === "loading" && (
        <p className="text-xs text-muted-foreground px-1">{status.step}</p>
      )}

      {status.kind === "success" && (
        <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 flex items-start gap-2 text-xs">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <span>
            Yangi obuna yaratildi ✅ Endi “Test push yuborish” tugmasini bosib tekshiring.
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
