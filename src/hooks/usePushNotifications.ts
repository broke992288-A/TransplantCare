import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check existing subscription on mount
  useEffect(() => {
    if (!user) return;
    checkSubscription();
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    setIsSubscribed((data?.length ?? 0) > 0);
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Bildirishnoma ruxsati berilmadi");
        return;
      }

      // Register service worker if not already
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key from env
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      let subscription: PushSubscription | null = null;
      
      if (vapidKey) {
        // Convert VAPID key to Uint8Array
        const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
        const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray,
        });
      } else {
        // Fallback without VAPID
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
        });
      }

      // Save to database
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON() as any,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("Bildirishnomalar yoqildi ✅");
    } catch (err: any) {
      console.error("Push subscription error:", err);
      toast.error("Bildirishnoma sozlashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }

      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

      setIsSubscribed(false);
      toast.success("Bildirishnomalar o'chirildi");
    } catch (err) {
      console.error("Unsubscribe error:", err);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}
