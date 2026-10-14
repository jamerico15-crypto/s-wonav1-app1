/*
# Create get_project_schema() function for AI Schema Generator

## Overview
Creates a SECURITY DEFINER function that returns metadata about all custom tables
in the public schema (excluding system tables). Used by the AI Schema Generator
to inspect existing table structures and their relationships.

## New Functions
- `get_project_schema(project_uuid uuid DEFAULT NULL)` — returns a JSONB array of
  table metadata including column names, types, nullability, primary keys, and
  foreign key relationships.

## Security
- SECURITY DEFINER with search_path locked to public
- Executable by authenticated users only
*/

CREATE OR REPLACE FUNCTION public.get_project_schema(project_uuid uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', c.relname,
      'columns', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', a.attname,
            'type', format_type(a.atttypid, a.atttypmod),
            'nullable', NOT a.attnotnull,
            'is_primary', EXISTS(
              SELECT 1 FROM pg_index i
              WHERE i.indrelid = c.oid
                AND i.indisprimary
                AND a.attnum = ANY(i.indkey)
            )
          )
          ORDER BY a.attnum
        )
        FROM pg_attribute a
        WHERE a.attrelid = c.oid
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      'foreign_keys', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'column', a.attname,
              'references_table', cf.relname,
              'references_column', af.attname
            )
          )
          FROM pg_constraint con
          JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
          JOIN pg_class cf ON cf.oid = con.confrelid
          JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = con.confkey[1]
          WHERE con.contype = 'f' AND con.conrelid = c.oid
        ),
        '[]'::jsonb
      )
    )
  )
  INTO result
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT IN ('roles', 'permissions', 'profiles', 'branding', 'custom_schemas');

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_schema(uuid) TO authenticated;
