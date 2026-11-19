import { auth, defineMcp } from "@lovable.dev/mcp-js";
import accountAccess from "./tools/account-access";
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";
export default defineMcp({
  name: "transplantcare",
  title: "TransplantCare",
  version: "0.1.0",
  instructions: "Read your own account roles. Clinical records, clinical changes, and repository access are not exposed by this integration.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated", requireOAuthClientClaim: true }),
  tools: [accountAccess],
});
