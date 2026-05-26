import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/** Convert a phone number to a pseudo-email for Supabase Auth */
export function phoneToEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@phone.transplantcare`;
}

export async function signInWithPassword(identifier: string, password: string) {
  const email = identifier.includes("@") ? identifier : phoneToEmail(identifier);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPhone(
  phone: string,
  password: string,
  fullName: string,
) {
  const email = phoneToEmail(phone);
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone },
    },
  });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  phone?: string
) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: fullName, phone: phone || "" },
    },
  });
  if (error) throw error;
}

export async function signOutUser() {
  // Always clear local role confirmation regardless of remote outcome.
  try {
    sessionStorage.removeItem("roleConfirmed");
  } catch {
    /* sessionStorage unavailable — ignore */
  }
  try {
    // `local` scope avoids server round-trip failures when the session is
    // already invalid (we've seen `AuthSessionMissingError` / 403 from /user
    // when the refresh token expired in another tab). The end result is the
    // same: local tokens cleared and the user redirected to /login.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error && !/session/i.test(error.message)) throw error;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!/session|missing|not\s*found/i.test(msg)) {
      // Re-throw genuine errors; swallow stale-session noise.
      throw err;
    }
    console.warn("[Auth] signOut: ignoring stale session error:", msg);
  }
}

export async function resetPasswordForEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updateUserPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function registerPatientSelf(params: {
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}) {
  const { data, error } = await supabase.rpc("register_patient_self", {
    _full_name: params.fullName,
    _phone: params.phone ?? undefined,
    _date_of_birth: params.dateOfBirth ?? undefined,
    _gender: params.gender ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function fetchUserRoles(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertUserRole(userId: string, role: AppRole) {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (error) throw error;
}

/**
 * 2FA warning for clinical accounts (doctor/admin).
 * Non-blocking advisory — login still succeeds.
 * Dismissal is stored per-session in sessionStorage.
 */
const TWO_FA_DISMISS_KEY = "twoFactorWarningDismissed";
const TWO_FA_WARNING_MESSAGE =
  "Two-factor authentication is recommended for clinical accounts.";

export function getTwoFactorWarning(role: AppRole | null): string | null {
  if (role !== "doctor" && role !== "admin") return null;
  try {
    if (sessionStorage.getItem(TWO_FA_DISMISS_KEY) === "1") return null;
  } catch {
    /* sessionStorage unavailable — show warning anyway */
  }
  // MFA factor enrollment is not configured for this project yet —
  // until enrollment exists, every doctor/admin account is implicitly
  // "2FA not enabled" and should see the advisory.
  return TWO_FA_WARNING_MESSAGE;
}

export function dismissTwoFactorWarning(): void {
  try {
    sessionStorage.setItem(TWO_FA_DISMISS_KEY, "1");
  } catch {
    /* sessionStorage unavailable — ignore */
  }
}
