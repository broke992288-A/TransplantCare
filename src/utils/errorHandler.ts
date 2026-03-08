import { toast } from "@/hooks/use-toast";

const ERROR_KEYS: { pattern: string; key: string }[] = [
  { pattern: "JWT expired", key: "error.sessionExpired" },
  { pattern: "Invalid login credentials", key: "error.invalidCredentials" },
  { pattern: "Email not confirmed", key: "error.emailNotConfirmed" },
  { pattern: "User already registered", key: "error.alreadyRegistered" },
  { pattern: "duplicate key", key: "error.duplicateKey" },
  { pattern: "violates row-level security", key: "error.noPermission" },
  { pattern: "Failed to fetch", key: "error.noInternet" },
  { pattern: "NetworkError", key: "error.networkError" },
];

export function getReadableError(error: unknown, t?: (key: string) => string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  for (const { pattern, key } of ERROR_KEYS) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return t ? t(key) : key;
    }
  }

  if (message.length > 200) {
    return t ? t("error.unexpected") : "error.unexpected";
  }

  return message || (t ? t("error.unknown") : "error.unknown");
}

export function handleError(error: unknown, context?: string, t?: (key: string) => string) {
  const readable = getReadableError(error, t);

  console.error(`[${context ?? "App"}] Error:`, error);

  toast({
    title: t ? t("error.title") : "Xatolik",
    description: readable,
    variant: "destructive",
  });

  return readable;
}
