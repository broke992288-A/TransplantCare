
CREATE OR REPLACE FUNCTION public.normalize_lab_value(
  _test_name text,
  _value numeric,
  _unit text
) RETURNS numeric
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _test_name IN ('total_bilirubin', 'direct_bilirubin')
         AND _unit = 'µmol/L'
    THEN ROUND(_value / 17.1, 2)
    WHEN _test_name = 'creatinine'
         AND _unit = 'µmol/L'
    THEN ROUND(_value / 88.4, 2)
    WHEN _test_name = 'urea'
         AND _unit = 'mmol/L'
    THEN ROUND(_value * 6, 2)
    WHEN _test_name = 'hb'
         AND _unit = 'g/L'
    THEN ROUND(_value / 10, 2)
    ELSE _value
  END
$$;
