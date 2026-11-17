import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ lang: "ru", pending: [] as ((value: { data: { translations: string[] }; error: null }) => void)[] }));
vi.mock("@/hooks/useLanguage", () => ({ useLanguage: () => ({ lang: state.lang }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn(() => new Promise(resolve => state.pending.push(resolve))) } } }));
import { useTranslatedText } from "@/hooks/useTranslate";

describe("authored translation lifecycle", () => {
  it("rejects a stale response after a language change", async () => {
    const { result, rerender } = renderHook(() => useTranslatedText("unique authored note", "en"));
    await waitFor(() => expect(state.pending).toHaveLength(1));
    state.lang = "uz";
    rerender();
    await waitFor(() => expect(state.pending).toHaveLength(2));
    await act(async () => { state.pending[1]({ data: { translations: ["current-language-result"] }, error: null }); });
    await waitFor(() => expect(result.current.translated).toBe("current-language-result"));
    await act(async () => { state.pending[0]({ data: { translations: ["stale-language-result"] }, error: null }); });
    expect(result.current.translated).toBe("current-language-result");
    expect(result.current.loading).toBe(false);
  });
});