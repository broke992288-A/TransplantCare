
-- Fix function search paths for security
ALTER FUNCTION public.normalize_patient_phone() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
