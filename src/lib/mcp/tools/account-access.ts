import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
export default defineTool({
  name: "get_account_access",
  title: "Account access",
  description: "Read only the caller's assigned TransplantCare roles; no patient records or clinical actions are exposed.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const userId = ctx.getUserId();
    if (!ctx.isAuthenticated() || !userId) throw new ToolError("Sign in to connect your account.");
    const client = supabaseForUser(ctx);
    const { data, error } = await client.from("user_roles").select("role").eq("user_id", userId).limit(4);
    if (error) throw new ToolError("Account access could not be read.");
    const roles = (data ?? []).map(row => String(row.role)).filter(role => ["admin", "doctor", "patient", "support"].includes(role));
    return { content: [{ type: "text", text: `Assigned roles: ${roles.join(", ") || "none"}. This integration cannot read patient records, change clinical data, or access repository code.` }], structuredContent: { roles } };
  },
});
