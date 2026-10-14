/*
# MEAL System Enhancement: Currency, Activity Types, Theme, Footer, Kobo, Super Admin

## Overview
This migration adds multi-currency budget support, activity classification,
theme/footer configuration, KoboToolbox integration tables, and a Super Admin
role to the MEAL Management System.

## Changes by Section

### 1. Super Admin Role
- Inserts a "Super Admin" role into roles table with is_system=true.
- Super Admin bypasses all permission checks in the application layer.
- Seeds full permissions for all modules (CRUD + visualize).

### 2. Projects: Multi-Currency & Location Fields
- Adds currency (text, default 'MZN') to projects.
- Adds exchange_rate (numeric, default 1.0) to projects.
- Adds budget_mzn (numeric, default 0) — computed total in Meticais.
- Adds province (text, nullable) — Moçambique province.
- Existing budget/budget_spent columns remain for backward compatibility.

### 3. Activities: Type & Budget
- Adds activity_type (text, default 'other') to activities.
- Adds budget (numeric, default 0) to activities.
- Adds budget_spent (numeric, default 0) to activities.

### 4. Theme Configuration
- Creates app_config table for storing theme colors and footer settings.
- Single-row design (id = 1) with JSONB config column.

### 5. KoboToolbox Integration
- Creates kobo_connections table for storing Kobo API endpoints/tokens.
- Creates kobo_imports table for tracking imported form data.

## Security
- RLS enabled on all new tables (app_config, kobo_connections, kobo_imports).
- Policies for authenticated CRUD on all new tables.
- No destructive changes to existing tables or data.
*/

-- ============================================================
-- 1. SUPER ADMIN ROLE
-- ============================================================

INSERT INTO public.roles (id, name, description, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Super Admin',
  'Unrestricted system-wide access. Cannot be deleted. Bypasses all permission checks.',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed full permissions for Super Admin across all modules
INSERT INTO public.permissions (role_id, module, can_create, can_read, can_update, can_delete, can_visualize)
SELECT '00000000-0000-0000-0000-000000000001', m.module, true, true, true, true, true
FROM (VALUES
  ('projects'), ('indicators'), ('activities'), ('beneficiaries'),
  ('users'), ('branding'), ('schema_generator'), ('dashboard'), ('districts'),
  ('database_explorer'), ('kobo'), ('reports'), ('theme')
) AS m(module)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. PROJECTS: Multi-Currency & Location
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='currency') THEN
    ALTER TABLE public.projects ADD COLUMN currency text NOT NULL DEFAULT 'MZN';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='exchange_rate') THEN
    ALTER TABLE public.projects ADD COLUMN exchange_rate numeric NOT NULL DEFAULT 1.0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='budget_mzn') THEN
    ALTER TABLE public.projects ADD COLUMN budget_mzn numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='province') THEN
    ALTER TABLE public.projects ADD COLUMN province text;
  END IF;
END $$;

-- ============================================================
-- 3. ACTIVITIES: Type & Budget
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='activity_type') THEN
    ALTER TABLE public.activities ADD COLUMN activity_type text NOT NULL DEFAULT 'other';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='budget') THEN
    ALTER TABLE public.activities ADD COLUMN budget numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='budget_spent') THEN
    ALTER TABLE public.activities ADD COLUMN budget_spent numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 4. APP CONFIG TABLE (Theme + Footer)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_config (
  id integer PRIMARY KEY DEFAULT 1,
  theme jsonb NOT NULL DEFAULT '{"primary_color":"#EE3A25","secondary_color":"#711246","sidebar_bg":"#1a1a2e","sidebar_text":"#ffffff","widget_header_bg":"#f8fafc","text_color":"#1e293b"}'::jsonb,
  footer jsonb NOT NULL DEFAULT '{"office_address":"","contact_phone":"","contact_email":"","institutional_description":"","custom_footer_text":""}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_app_config_authenticated" ON public.app_config;
CREATE POLICY "read_app_config_authenticated"
ON public.app_config FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_app_config_authenticated" ON public.app_config;
CREATE POLICY "insert_app_config_authenticated"
ON public.app_config FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_app_config_authenticated" ON public.app_config;
CREATE POLICY "update_app_config_authenticated"
ON public.app_config FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_app_config_authenticated" ON public.app_config;
CREATE POLICY "delete_app_config_authenticated"
ON public.app_config FOR DELETE
TO authenticated USING (true);

-- Insert default config row if not exists
INSERT INTO public.app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. KOBOTOOLBOX INTEGRATION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kobo_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_url text NOT NULL,
  api_token text NOT NULL,
  username text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kobo_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_kobo_connections_authenticated" ON public.kobo_connections;
CREATE POLICY "read_kobo_connections_authenticated"
ON public.kobo_connections FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_kobo_connections_authenticated" ON public.kobo_connections;
CREATE POLICY "insert_kobo_connections_authenticated"
ON public.kobo_connections FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_kobo_connections_authenticated" ON public.kobo_connections;
CREATE POLICY "update_kobo_connections_authenticated"
ON public.kobo_connections FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_kobo_connections_authenticated" ON public.kobo_connections;
CREATE POLICY "delete_kobo_connections_authenticated"
ON public.kobo_connections FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.kobo_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.kobo_connections(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  form_name text NOT NULL,
  field_mapping jsonb,
  generated_table_name text,
  submission_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.kobo_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_kobo_imports_authenticated" ON public.kobo_imports;
CREATE POLICY "read_kobo_imports_authenticated"
ON public.kobo_imports FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_kobo_imports_authenticated" ON public.kobo_imports;
CREATE POLICY "insert_kobo_imports_authenticated"
ON public.kobo_imports FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_kobo_imports_authenticated" ON public.kobo_imports;
CREATE POLICY "update_kobo_imports_authenticated"
ON public.kobo_imports FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_kobo_imports_authenticated" ON public.kobo_imports;
CREATE POLICY "delete_kobo_imports_authenticated"
ON public.kobo_imports FOR DELETE
TO authenticated USING (true);

-- ============================================================
-- 6. Update get_project_schema to include all custom tables
-- ============================================================

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
    AND c.relname NOT IN ('roles', 'permissions', 'profiles', 'branding', 'custom_schemas', 'app_config');

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_schema(uuid) TO authenticated;
