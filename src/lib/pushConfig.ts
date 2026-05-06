import { supabase } from "@/integrations/supabase/client";

let cachedVapidPublicKey: string | null = null;

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidPublicKey) return cachedVapidPublicKey;

  const { data, error } = await supabase.functions.invoke<{ publicKey: string }>(
    "send-push",
    { method: "GET" },
  );

  if (error) throw new Error(error.message);
  const publicKey = data?.publicKey?.trim();
  if (!publicKey) throw new Error("Push public key is not configured");

  cachedVapidPublicKey = publicKey;
  return publicKey;
}

export async function subscribeWithCurrentVapidKey(
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription> {
  const arr = urlBase64ToUint8Array(await getVapidPublicKey());
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: arr.buffer.slice(
      arr.byteOffset,
      arr.byteOffset + arr.byteLength,
    ) as ArrayBuffer,
  });
}