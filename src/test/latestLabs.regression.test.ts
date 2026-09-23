import { describe, it, expect, vi, beforeEach } from "vitest";
import source from "@/services/labService.ts?raw";

/**
 * Regression test for the doctor dashboard "latest lab" bug.
 *
 * The old query fetched all patients' labs ordered by recorded_at DESC with a
 * single global LIMIT (patient_count * 2). Patients with long histories pushed
 * others out of the window, so their latest lab silently disappeared from the
 * dashboard. The fix uses a DISTINCT ON RPC — one deterministic latest row per
 * patient, deleted labs excluded.
 */
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => { throw new Error("fetchLatestLabsByPatientIds must not query the table directly"); },
  },
}));

describe("fetchLatestLabsByPatientIds — source contract", () => {
  it("uses the DISTINCT ON RPC and no global limit", () => {
    const fn = source.match(/export async function fetchLatestLabsByPatientIds[\s\S]*?\n}/)?.[0] ?? "";
    expect(fn).toMatch(/rpc\("get_latest_labs_for_patients"/);
    expect(fn).not.toMatch(/patientIds\.length \* 2/);
    expect(fn).not.toMatch(/\.limit\(/);
  });
});

describe("fetchLatestLabsByPatientIds — behaviour", () => {
  beforeEach(() => rpc.mockReset());

  it("returns a latest row for every patient, however long the history", async () => {
    const { fetchLatestLabsByPatientIds } = await import("@/services/labService");
    const ids = ["p1", "p2", "p3"];
    rpc.mockResolvedValue({
      data: ids.map((id, i) => ({
        patient_id: id,
        creatinine: 1 + i,
        recorded_at: "2026-09-20T00:00:00Z",
        tacrolimus_level: null, alt: null, ast: null,
        total_bilirubin: null, egfr: null, potassium: null,
      })),
      error: null,
    });

    const map = await fetchLatestLabsByPatientIds(ids);
    expect(Object.keys(map).sort()).toEqual(ids);
    expect(rpc).toHaveBeenCalledWith("get_latest_labs_for_patients", { _patient_ids: ids });
  });

  it("short-circuits on an empty id list", async () => {
    const { fetchLatestLabsByPatientIds } = await import("@/services/labService");
    expect(await fetchLatestLabsByPatientIds([])).toEqual({});
    expect(rpc).not.toHaveBeenCalled();
  });

  it("propagates RPC errors instead of silently returning nothing", async () => {
    const { fetchLatestLabsByPatientIds } = await import("@/services/labService");
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(fetchLatestLabsByPatientIds(["p1"])).rejects.toBeTruthy();
  });
});
