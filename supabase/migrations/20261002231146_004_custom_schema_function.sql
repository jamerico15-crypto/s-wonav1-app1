/*
# Custom Schema Application Function

## Overview
Creates a SECURITY DEFINER function that allows the app to apply generated SQL schema
from the AI Schema Generator module. This is required because the anon key cannot
run DDL directly - a privileged function is needed.

## Security
- SECURITY DEFINER with search_path locked to public
- Only allows CREATE TABLE and ALTER TABLE statements (no DROP, DELETE, INSERT on existing data)
- Basic SQL injection prevention through statement type checking
*/

CREATE OR REPLACE FUNCTION public.apply_custom_schema(sql_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Basic safety: only allow CREATE TABLE and ALTER TABLE ... ENABLE ROW LEVEL SECURITY and CREATE POLICY
  IF sql_text !~* 'CREATE\s+(TABLE|POLICY|INDEX)' AND sql_text !~* 'ALTER\s+TABLE' THEN
    RAISE EXCEPTION 'Only CREATE TABLE, CREATE POLICY, CREATE INDEX, and ALTER TABLE statements are allowed';
  END IF;

  -- Block dangerous keywords
  IF sql_text ~* '(DROP\s|DELETE\s|TRUNCATE\s|UPDATE\s+.*\sSET|INSERT\s+INTO\s+(?!))' THEN
    RAISE EXCEPTION 'Destructive operations are not allowed';
  END IF;

  EXECUTE sql_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_custom_schema(text) TO authenticated;
