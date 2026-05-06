import { supabase } from "@/integrations/supabase/client";

let cachedVapidPublicKey: string | null = null;

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