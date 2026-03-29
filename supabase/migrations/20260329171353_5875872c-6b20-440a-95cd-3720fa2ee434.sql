
-- Delete existing risk snapshots and lab results for Munavvar Turdiyeva
DELETE FROM public.risk_snapshots WHERE patient_id = '83028ef0-846a-4a86-970a-e61bd1d7c7b9';
DELETE FROM public.patient_alerts WHERE patient_id = '83028ef0-846a-4a86-970a-e61bd1d7c7b9';
DELETE FROM public.lab_results WHERE patient_id = '83028ef0-846a-4a86-970a-e61bd1d7c7b9';
