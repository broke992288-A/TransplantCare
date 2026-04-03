import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://uszimflqyqmhlxbizcre.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzemltZmxxeXFtaGx4Yml6Y3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjA3NTYsImV4cCI6MjA4ODE5Njc1Nn0.hc4NlCD0vREddq4OtfbekcrqRbsXbGx0e_o9ns7dtRA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});