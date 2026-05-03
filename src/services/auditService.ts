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
    const { error } = await supabase.rpc("log_audit_event", {
      _action: params.action,
      _entity_type: params.entityType ?? undefined,
      _entity_id: params.entityId ?? undefined,
      _metadata: (params.metadata ?? {}) as never,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[Audit] Failed to log:", params.action, err);
  }
}
