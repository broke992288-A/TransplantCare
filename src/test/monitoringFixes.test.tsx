import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import adminSource from "../../supabase/functions/admin-set-user/index.ts?raw";
import { useRealtimeInvalidation } from "@/hooks/useRealtimeInvalidation";

const realtime = vi.hoisted(() => ({ handlers: new Map<string, () => void>(), remove: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "doctor-id" }, role: "doctor" }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const channel = {
        on: (_event: string, filter: { table: string }, callback: () => void) => {
          realtime.handlers.set(filter.table, callback);
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: realtime.remove,
  },
}));

afterEach(() => { cleanup(); realtime.handlers.clear(); vi.clearAllMocks(); });

async function runAdminUpdate(body: Record<string, unknown>) {
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: "admin-id" } }, error: null }), admin: { updateUserById } },
    from: (table: string) => table === "user_roles"
      ? { select: () => ({ eq: async () => ({ data: [{ role: "admin" }] }) }) }
      : { insert: async () => ({ error: null }) },
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const deno = { env: { get: () => "test-config" }, serve: (callback: typeof handler) => { handler = callback; } };
  // Execute the actual handler with stubbed dependencies; no hosted user is modified.
  const script = adminSource.replace(/^import .*;\s*$/gm, "").replace(/\)!/g, ")").replace(/\(r: \{ role: string \}\)/g, "(r)").replace(/: string\[\]/g, "");
  new Function("Deno", "createClient", "getCorsHeaders", script)(deno, () => admin, () => ({}));
  if (!handler) throw new Error("Missing handler");
  const response = await handler(new Request("http://localhost/admin-set-user", {
    method: "POST", headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: "11111111-1111-1111-1111-111111111111", ...body }),
  }));
  expect(response.status).toBe(200);
  return updateUserById;
}

describe("selected monitoring regressions", () => {
  it("password-only reset leaves email confirmation unchanged", async () => {
    const update = await runAdminUpdate({ password: "test-password" });
    expect(update.mock.calls.map((call) => call[1])).toEqual([{ password: "test-password" }]);
  });

  it("explicit confirmation remains independent of password reset", async () => {
    const update = await runAdminUpdate({ password: "test-password", confirm_email: true });
    expect(update.mock.calls.map((call) => call[1])).toEqual([{ password: "test-password" }, { email_confirm: true }]);
  });

  it("incoming patient alert invalidates the header badge immediately", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["unread-alert-count", "doctor-id"], 0);
    client.setQueryData(["unrelated"], 7);
    renderHook(() => useRealtimeInvalidation(), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    const onAlert = realtime.handlers.get("patient_alerts");
    if (!onAlert) throw new Error("Missing patient alert subscription");
    act(() => onAlert());
    await waitFor(() => expect(client.getQueryState(["unread-alert-count", "doctor-id"])?.isInvalidated).toBe(true));
    expect(client.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
    client.clear();
  });
});