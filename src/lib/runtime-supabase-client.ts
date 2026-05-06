// Re-exports the singleton Supabase client. A separate module path is used
// via a Vite alias to ensure only one client instance exists at runtime,
// preventing duplicate auth lock acquisitions ("Lock broken ... 'steal'").
export { supabase } from "@/integrations/supabase/client";
