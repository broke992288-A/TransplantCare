import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Push notification flow (PWA-aware):
 * 1. Wait for the VitePWA-generated service worker to be ready (it imports /push-handler.js).
 * 2. Request Notification permission. If "denied", surface a recoverable error so the
 *    UI can route the user to /install or the FixNotificationDialog.
 * 3. Subscribe via PushManager using the VAPID public key.
 * 4. Persist the subscription in Supabase, scoped to the current user + endpoint.
 *
 * Notes:
 *  - We never call navigator.serviceWorker.register("/sw.js") directly: VitePWA owns
 *    registration. We just await `serviceWorker.ready` to grab the active registration.
 *  - On `pushsubscriptionchange` (rotation/expiry) the SW posts a message; we listen
 *    and persist the new subscription transparently.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type PushSupport =
  | "ok"
  | "no-notification-api"
  | "no-service-worker"
  | "no-push-manager";

function detectSupport(): PushSupport {
  if (typeof window === "undefined") return "no-notification-api";
  if (typeof Notification === "undefined") return "no-notification-api";
  if (!("serviceWorker" in navigator)) return "no-service-worker";
  if (!("PushManager" in window)) return "no-push-manager";
  return "ok";
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [support] = useState<PushSupport>(detectSupport);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check existing subscription on mount and listen for SW-driven rotation.
  useEffect(() => {
    if (!user || support !== "ok") return;

    void checkSubscription();

    const onMessage = async (e: MessageEvent) => {
      if (e.data?.type === "PUSH_SUBSCRIPTION_CHANGED" && e.data.subscription) {
        try {
          const sub = e.data.subscription as PushSubscriptionJSON;
          if (!sub.endpoint) return;
          await supabase.from("push_subscriptions").upsert(
            [
              {
                user_id: user.id,
                endpoint: sub.endpoint,
                subscription: sub as never,
              },
            ],
            { onConflict: "user_id,endpoint" }
          );
          setIsSubscribed(true);
        } catch {
          /* silent */
        }
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, support]);

  const checkSubscription = useCallback(async () => {
    if (!user) return;
    try {
      // Prefer the live PushManager state — DB rows can be stale across browsers.
      if (navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          setIsSubscribed(true);
          return;
        }
      }
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      setIsSubscribed((data?.length ?? 0) > 0);
    } catch {
      setIsSubscribed(false);
    }
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user) return;
    if (support !== "ok") {
      toast.error("Bu brauzer push bildirishnomalarni qo'llab-quvvatlamaydi");
      return;
    }
    setLoading(true);
    try {
      // Permission can only be requested from a user gesture in most browsers.
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "denied") {
        toast.error(
          "Bildirishnoma rad etilgan. Iltimos, ilovani o'rnating yoki brauzer sozlamalaridan ruxsat bering.",
          { duration: 6000 }
        );
        return;
      }
      if (perm !== "granted") {
        toast.error("Bildirishnoma ruxsati berilmadi");
        return;
      }

      // VitePWA owns SW registration. Just wait for it to become ready.
      const registration = await navigator.serviceWorker.ready;

      // Reuse existing subscription if present (idempotent enable).
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const subscribeOpts: PushSubscriptionOptionsInit = { userVisibleOnly: true };
        if (vapidKey) {
          const arr = urlBase64ToUint8Array(vapidKey);
          // Cast through ArrayBuffer to satisfy DOM lib types in some TS versions.
          subscribeOpts.applicationServerKey = arr.buffer.slice(
            arr.byteOffset,
            arr.byteOffset + arr.byteLength
          ) as ArrayBuffer;
        }
        subscription = await registration.pushManager.subscribe(subscribeOpts);
      }

      const json = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        [
          {
            user_id: user.id,
            endpoint: subscription.endpoint!,
            subscription: json as never,
          },
        ],
        { onConflict: "user_id,endpoint" }
      );
      if (error) throw error;

      setIsSubscribed(true);
      toast.success("Bildirishnomalar yoqildi ✅");
    } catch (err) {
      console.error("Push subscription error:", err);
      const msg = err instanceof Error ? err.message : "Noma'lum xato";
      toast.error(`Bildirishnoma sozlashda xatolik: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [user, support]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      let endpoint: string | undefined;
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          endpoint = sub.endpoint;
          await sub.unsubscribe();
        }
      }
      if (endpoint) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", endpoint);
      } else {
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      }
      setIsSubscribed(false);
      toast.success("Bildirishnomalar o'chirildi");
    } catch (err) {
      console.error("Unsubscribe error:", err);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { permission, isSubscribed, loading, support, subscribe, unsubscribe };
}
