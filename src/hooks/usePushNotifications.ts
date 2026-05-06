import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { arrayBufferToBase64Url, getVapidPublicKey, subscribeWithCurrentVapidKey } from "@/lib/pushConfig";
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
    if (!user || support !== "ok") {
      setIsSubscribed(false);
      return;
    }
    try {
      setPermission(Notification.permission);
      if (Notification.permission !== "granted") {
        setIsSubscribed(false);
        return;
      }
      // Only trust the current browser's live PushManager state. DB rows may
      // belong to another domain/browser and can make preview look "enabled" falsely.
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      const currentPublicKey = await getVapidPublicKey();
      const subscriptionPublicKey = sub
        ? arrayBufferToBase64Url(sub.options.applicationServerKey)
        : null;
      if (sub && subscriptionPublicKey !== currentPublicKey) {
        await sub.unsubscribe().catch(() => undefined);
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        sub = null;
      }
      if (!sub) {
        // Auto-create subscription since permission is already granted.
        try {
          sub = await subscribeWithCurrentVapidKey(reg);
        } catch (subErr) {
          console.error("Auto-subscribe failed:", subErr);
          setIsSubscribed(false);
          return;
        }
      }
      const { error } = await supabase.from("push_subscriptions").upsert(
        [
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            subscription: sub.toJSON() as never,
          },
        ],
        { onConflict: "user_id,endpoint" }
      );
      if (error) throw error;
      setIsSubscribed(true);
    } catch {
      setIsSubscribed(false);
    }
  }, [user, support]);

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
      const currentPublicKey = await getVapidPublicKey();
      const subscriptionPublicKey = subscription
        ? arrayBufferToBase64Url(subscription.options.applicationServerKey)
        : null;

      if (subscription && subscriptionPublicKey !== currentPublicKey) {
        await subscription.unsubscribe().catch(() => undefined);
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        subscription = null;
      }

      if (!subscription) {
        // VAPID public key is safe to expose in client code — it is sent with every push request.
        // The matching private key is stored as a backend secret and used by the send-push edge function.
        subscription = await subscribeWithCurrentVapidKey(registration);
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

  return { permission, isSubscribed, loading, support, subscribe, unsubscribe, refresh: checkSubscription };
}
