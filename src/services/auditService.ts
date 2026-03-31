import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "user_login"
  | "patient_login"
  | "lab_upload"
  | "lab_result_edit"
  | "doctor_view_patient"
  | "patient_logout"
  | "password_reset";

export async function logAudit(params: {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert([{
      user_id: user.id,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: (params.metadata ?? {}) as Record<string, string>,
    }]);
  } catch (err) {
    console.error("[Audit] Failed to log:", params.action, err);
  }
}
