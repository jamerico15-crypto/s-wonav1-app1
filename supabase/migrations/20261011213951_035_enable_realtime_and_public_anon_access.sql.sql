/*
# Enable Realtime + Verify Public Anon Access on All Tables

1. Purpose
- Enable Supabase Realtime on all 13 public tables so postgres_changes events fire for INSERT, UPDATE, DELETE.
- Ensure all tables have RLS enabled with full CRUD policies for anon + authenticated (no login required).

2. Realtime
- Add all tables to the supabase_realtime publication via a DO block (IF NOT EXISTS not supported for ALTER PUBLICATION).

3. RLS
- Drop and recreate all policies to guarantee clean state.
- All policies use TO anon, authenticated with USING (true) / WITH CHECK (true) — no login, data is intentionally public.

4. Tables covered
- activities, app_config, beneficiaries, branding, custom_schemas, districts, indicators, kobo_connections, kobo_imports, permissions, profiles, projects, roles
*/

-- Add all tables to the realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_config') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'beneficiaries') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiaries;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'branding') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branding;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'custom_schemas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_schemas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'districts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.districts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'indicators') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.indicators;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kobo_connections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kobo_connections;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'kobo_imports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kobo_imports;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'permissions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.permissions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
  END IF;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kobo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kobo_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Recreate all policies (drop first for idempotency)
-- activities
DROP POLICY IF EXISTS "read_activities_public" ON public.activities;
DROP POLICY IF EXISTS "insert_activities_public" ON public.activities;
DROP POLICY IF EXISTS "update_activities_public" ON public.activities;
DROP POLICY IF EXISTS "delete_activities_public" ON public.activities;
CREATE POLICY "read_activities_public" ON public.activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_activities_public" ON public.activities FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_activities_public" ON public.activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_activities_public" ON public.activities FOR DELETE TO anon, authenticated USING (true);

-- app_config
DROP POLICY IF EXISTS "read_app_config_public" ON public.app_config;
DROP POLICY IF EXISTS "insert_app_config_public" ON public.app_config;
DROP POLICY IF EXISTS "update_app_config_public" ON public.app_config;
DROP POLICY IF EXISTS "delete_app_config_public" ON public.app_config;
CREATE POLICY "read_app_config_public" ON public.app_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_app_config_public" ON public.app_config FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_app_config_public" ON public.app_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_app_config_public" ON public.app_config FOR DELETE TO anon, authenticated USING (true);

-- beneficiaries
DROP POLICY IF EXISTS "read_beneficiaries_public" ON public.beneficiaries;
DROP POLICY IF EXISTS "insert_beneficiaries_public" ON public.beneficiaries;
DROP POLICY IF EXISTS "update_beneficiaries_public" ON public.beneficiaries;
DROP POLICY IF EXISTS "delete_beneficiaries_public" ON public.beneficiaries;
CREATE POLICY "read_beneficiaries_public" ON public.beneficiaries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_beneficiaries_public" ON public.beneficiaries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_beneficiaries_public" ON public.beneficiaries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_beneficiaries_public" ON public.beneficiaries FOR DELETE TO anon, authenticated USING (true);

-- branding
DROP POLICY IF EXISTS "read_branding_public" ON public.branding;
DROP POLICY IF EXISTS "insert_branding_public" ON public.branding;
DROP POLICY IF EXISTS "update_branding_public" ON public.branding;
DROP POLICY IF EXISTS "delete_branding_public" ON public.branding;
CREATE POLICY "read_branding_public" ON public.branding FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_branding_public" ON public.branding FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_branding_public" ON public.branding FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_branding_public" ON public.branding FOR DELETE TO anon, authenticated USING (true);

-- custom_schemas
DROP POLICY IF EXISTS "read_custom_schemas_public" ON public.custom_schemas;
DROP POLICY IF EXISTS "insert_custom_schemas_public" ON public.custom_schemas;
DROP POLICY IF EXISTS "update_custom_schemas_public" ON public.custom_schemas;
DROP POLICY IF EXISTS "delete_custom_schemas_public" ON public.custom_schemas;
CREATE POLICY "read_custom_schemas_public" ON public.custom_schemas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_custom_schemas_public" ON public.custom_schemas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_custom_schemas_public" ON public.custom_schemas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_custom_schemas_public" ON public.custom_schemas FOR DELETE TO anon, authenticated USING (true);

-- districts
DROP POLICY IF EXISTS "read_districts_public" ON public.districts;
DROP POLICY IF EXISTS "insert_districts_public" ON public.districts;
DROP POLICY IF EXISTS "update_districts_public" ON public.districts;
DROP POLICY IF EXISTS "delete_districts_public" ON public.districts;
CREATE POLICY "read_districts_public" ON public.districts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_districts_public" ON public.districts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_districts_public" ON public.districts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_districts_public" ON public.districts FOR DELETE TO anon, authenticated USING (true);

-- indicators
DROP POLICY IF EXISTS "read_indicators_public" ON public.indicators;
DROP POLICY IF EXISTS "insert_indicators_public" ON public.indicators;
DROP POLICY IF EXISTS "update_indicators_public" ON public.indicators;
DROP POLICY IF EXISTS "delete_indicators_public" ON public.indicators;
CREATE POLICY "read_indicators_public" ON public.indicators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_indicators_public" ON public.indicators FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_indicators_public" ON public.indicators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_indicators_public" ON public.indicators FOR DELETE TO anon, authenticated USING (true);

-- kobo_connections
DROP POLICY IF EXISTS "read_kobo_connections_public" ON public.kobo_connections;
DROP POLICY IF EXISTS "insert_kobo_connections_public" ON public.kobo_connections;
DROP POLICY IF EXISTS "update_kobo_connections_public" ON public.kobo_connections;
DROP POLICY IF EXISTS "delete_kobo_connections_public" ON public.kobo_connections;
CREATE POLICY "read_kobo_connections_public" ON public.kobo_connections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_kobo_connections_public" ON public.kobo_connections FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_kobo_connections_public" ON public.kobo_connections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_kobo_connections_public" ON public.kobo_connections FOR DELETE TO anon, authenticated USING (true);

-- kobo_imports
DROP POLICY IF EXISTS "read_kobo_imports_public" ON public.kobo_imports;
DROP POLICY IF EXISTS "insert_kobo_imports_public" ON public.kobo_imports;
DROP POLICY IF EXISTS "update_kobo_imports_public" ON public.kobo_imports;
DROP POLICY IF EXISTS "delete_kobo_imports_public" ON public.kobo_imports;
CREATE POLICY "read_kobo_imports_public" ON public.kobo_imports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_kobo_imports_public" ON public.kobo_imports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_kobo_imports_public" ON public.kobo_imports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_kobo_imports_public" ON public.kobo_imports FOR DELETE TO anon, authenticated USING (true);

-- permissions
DROP POLICY IF EXISTS "read_permissions_public" ON public.permissions;
DROP POLICY IF EXISTS "insert_permissions_public" ON public.permissions;
DROP POLICY IF EXISTS "update_permissions_public" ON public.permissions;
DROP POLICY IF EXISTS "delete_permissions_public" ON public.permissions;
CREATE POLICY "read_permissions_public" ON public.permissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_permissions_public" ON public.permissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_permissions_public" ON public.permissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_permissions_public" ON public.permissions FOR DELETE TO anon, authenticated USING (true);

-- profiles
DROP POLICY IF EXISTS "read_profiles_public" ON public.profiles;
DROP POLICY IF EXISTS "insert_profiles_public" ON public.profiles;
DROP POLICY IF EXISTS "update_profiles_public" ON public.profiles;
DROP POLICY IF EXISTS "delete_profiles_public" ON public.profiles;
CREATE POLICY "read_profiles_public" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_profiles_public" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_profiles_public" ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_profiles_public" ON public.profiles FOR DELETE TO anon, authenticated USING (true);

-- projects
DROP POLICY IF EXISTS "read_projects_public" ON public.projects;
DROP POLICY IF EXISTS "insert_projects_public" ON public.projects;
DROP POLICY IF EXISTS "update_projects_public" ON public.projects;
DROP POLICY IF EXISTS "delete_projects_public" ON public.projects;
CREATE POLICY "read_projects_public" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_projects_public" ON public.projects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_projects_public" ON public.projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_projects_public" ON public.projects FOR DELETE TO anon, authenticated USING (true);

-- roles
DROP POLICY IF EXISTS "read_roles_public" ON public.roles;
DROP POLICY IF EXISTS "insert_roles_public" ON public.roles;
DROP POLICY IF EXISTS "update_roles_public" ON public.roles;
DROP POLICY IF EXISTS "delete_roles_public" ON public.roles;
CREATE POLICY "read_roles_public" ON public.roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_roles_public" ON public.roles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_roles_public" ON public.roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_roles_public" ON public.roles FOR DELETE TO anon, authenticated USING (true);
