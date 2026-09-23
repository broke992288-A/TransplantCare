import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface AuthUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  user_metadata?: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.slice(7);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    // Page through auth users (bounded).
    const perPage = 200;
    const maxPages = 10;
    const users: AuthUserRow[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const batch = (data?.users ?? []) as unknown as AuthUserRow[];
      users.push(...batch);
      if (batch.length < perPage) break;
    }

    const ids = users.map((u) => u.id);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const roleMap = new Map<string, string[]>();
    for (const r of (roleRows ?? []) as { user_id: string; role: string }[]) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }

    const { data: patientRows } = await admin
      .from("patients")
      .select("linked_user_id, full_name")
      .in("linked_user_id", ids);
    const nameMap = new Map<string, string>();
    for (const p of (patientRows ?? []) as { linked_user_id: string | null; full_name: string }[]) {
      if (p.linked_user_id) nameMap.set(p.linked_user_id, p.full_name);
    }

    const result = users.map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const metaName = typeof meta.full_name === "string" ? meta.full_name : null;
      return {
        id: u.id,
        email: u.email ?? null,
        full_name: metaName || nameMap.get(u.id) || null,
        roles: roleMap.get(u.id) ?? [],
        email_confirmed: Boolean(u.email_confirmed_at),
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      };
    });

    return json({ users: result, count: result.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[admin-list-users] error:", msg);
    return json({ error: "Internal error" }, 500);
  }
});
