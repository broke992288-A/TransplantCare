import { supabase } from "@/lib/supabaseClient";

/** Convert a phone number to a pseudo-email for Supabase Auth */
export function phoneToEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@phone.transplantcare`;
}

export async function signInWithPassword(identifier: string, password: string) {
  // If identifier looks like a phone number, convert to pseudo-email
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
  await supabase.auth.signOut();
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
    _phone: params.phone || null,
    _date_of_birth: params.dateOfBirth || null,
    _gender: params.gender || null,
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

export async function upsertUserRole(userId: string, role: string) {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: role as any }, { onConflict: "user_id,role" });
  if (error) throw error;
}
