import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function useSessionTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.warn("[Session] Auto-logout due to inactivity");
        await supabase.auth.signOut();
        window.location.href = "/login";
      }
    }, TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);
}
