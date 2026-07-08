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

/** Extract a safe string message from an unknown error */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts = [e.message, e.error_description, e.details, e.hint, e.code]
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    if (parts.length > 0) return parts.join(" — ");
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch { /* ignore */ }
  }
  return String(error ?? "");
}

export function getReadableError(error: unknown, t?: (key: string) => string): string {
  const message = getErrorMessage(error);

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
