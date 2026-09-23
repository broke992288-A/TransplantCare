import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/roles";

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
  email_confirmed: boolean;
  last_sign_in_at: string | null;
  created_at: string;
}

export const ADMIN_MANAGED_ROLES: AppRole[] = ["patient", "doctor", "support", "admin"];

/** List all auth users via the admin-only Edge Function (service role stays server-side). */
export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.functions.invoke<{ users: AdminUserRow[] }>(
    "admin-list-users",
    { body: {} },
  );
  if (error) throw error;
  return data?.users ?? [];
}

/** Update a user's role through admin-set-user (strict admin JWT check server-side). */
export async function updateUserRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase.functions.invoke("admin-set-user", {
    body: { user_id: userId, role },
  });
  if (error) throw error;
}

/** Mark a user's email as confirmed through admin-set-user (server-side only). */
export async function confirmUserEmail(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("admin-set-user", {
    body: { user_id: userId, confirm_email: true },
  });
  if (error) throw error;
}

/** Primary (highest-privilege) role for display. */
const PRIORITY: AppRole[] = ["admin", "doctor", "support", "patient"];
export function primaryRole(roles: string[]): AppRole | null {
  return PRIORITY.find((r) => roles.includes(r)) ?? null;
}
