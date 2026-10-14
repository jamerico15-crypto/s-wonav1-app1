/*
# Open all tables to public (no-auth) access

1. Purpose
- Remove the sign-in requirement entirely.
- All tables become readable and writable by the anon role (no login needed).

2. Tables modified
- activities, app_config, beneficiaries, branding, custom_schemas, districts,
  indicators, kobo_connections, kobo_imports, permissions, profiles, projects, roles

3. Security changes
- Every RLS policy now covers TO anon, authenticated with USING (true) / WITH CHECK (true).
- RPC functions granted to anon.

4. Important notes
- No data is deleted or altered.
- The app no longer has a login screen; all data is publicly accessible.
*/

-- activities
DROP POLICY IF EXISTS "read_activities_authenticated" ON activities;
DROP POLICY IF EXISTS "insert_activities_authenticated" ON activities;
DROP POLICY IF EXISTS "update_activities_authenticated" ON activities;
DROP POLICY IF EXISTS "delete_activities_authenticated" ON activities;
CREATE POLICY "read_activities_public" ON activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_activities_public" ON activities FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_activities_public" ON activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_activities_public" ON activities FOR DELETE TO anon, authenticated USING (true);

-- app_config
DROP POLICY IF EXISTS "read_app_config_public" ON app_config;
DROP POLICY IF EXISTS "insert_app_config_authenticated" ON app_config;
DROP POLICY IF EXISTS "update_app_config_authenticated" ON app_config;
DROP POLICY IF EXISTS "delete_app_config_authenticated" ON app_config;
CREATE POLICY "read_app_config_public" ON app_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_app_config_public" ON app_config FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_app_config_public" ON app_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_app_config_public" ON app_config FOR DELETE TO anon, authenticated USING (true);

-- beneficiaries
DROP POLICY IF EXISTS "read_beneficiaries_authenticated" ON beneficiaries;
DROP POLICY IF EXISTS "insert_beneficiaries_authenticated" ON beneficiaries;
DROP POLICY IF EXISTS "update_beneficiaries_authenticated" ON beneficiaries;
DROP POLICY IF EXISTS "delete_beneficiaries_authenticated" ON beneficiaries;
CREATE POLICY "read_beneficiaries_public" ON beneficiaries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_beneficiaries_public" ON beneficiaries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_beneficiaries_public" ON beneficiaries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_beneficiaries_public" ON beneficiaries FOR DELETE TO anon, authenticated USING (true);

-- branding
DROP POLICY IF EXISTS "read_branding_public" ON branding;
DROP POLICY IF EXISTS "insert_branding_authenticated" ON branding;
DROP POLICY IF EXISTS "update_branding_authenticated" ON branding;
DROP POLICY IF EXISTS "delete_branding_authenticated" ON branding;
CREATE POLICY "read_branding_public" ON branding FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_branding_public" ON branding FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_branding_public" ON branding FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_branding_public" ON branding FOR DELETE TO anon, authenticated USING (true);

-- custom_schemas
DROP POLICY IF EXISTS "read_custom_schemas_authenticated" ON custom_schemas;
DROP POLICY IF EXISTS "insert_custom_schemas_authenticated" ON custom_schemas;
DROP POLICY IF EXISTS "update_custom_schemas_authenticated" ON custom_schemas;
DROP POLICY IF EXISTS "delete_custom_schemas_authenticated" ON custom_schemas;
CREATE POLICY "read_custom_schemas_public" ON custom_schemas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_custom_schemas_public" ON custom_schemas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_custom_schemas_public" ON custom_schemas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_custom_schemas_public" ON custom_schemas FOR DELETE TO anon, authenticated USING (true);

-- districts
DROP POLICY IF EXISTS "read_districts_authenticated" ON districts;
DROP POLICY IF EXISTS "insert_districts_authenticated" ON districts;
DROP POLICY IF EXISTS "update_districts_authenticated" ON districts;
DROP POLICY IF EXISTS "delete_districts_authenticated" ON districts;
CREATE POLICY "read_districts_public" ON districts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_districts_public" ON districts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_districts_public" ON districts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_districts_public" ON districts FOR DELETE TO anon, authenticated USING (true);

-- indicators
DROP POLICY IF EXISTS "read_indicators_authenticated" ON indicators;
DROP POLICY IF EXISTS "insert_indicators_authenticated" ON indicators;
DROP POLICY IF EXISTS "update_indicators_authenticated" ON indicators;
DROP POLICY IF EXISTS "delete_indicators_authenticated" ON indicators;
CREATE POLICY "read_indicators_public" ON indicators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_indicators_public" ON indicators FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_indicators_public" ON indicators FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_indicators_public" ON indicators FOR DELETE TO anon, authenticated USING (true);

-- kobo_connections
DROP POLICY IF EXISTS "read_kobo_connections_authenticated" ON kobo_connections;
DROP POLICY IF EXISTS "insert_kobo_connections_authenticated" ON kobo_connections;
DROP POLICY IF EXISTS "update_kobo_connections_authenticated" ON kobo_connections;
DROP POLICY IF EXISTS "delete_kobo_connections_authenticated" ON kobo_connections;
CREATE POLICY "read_kobo_connections_public" ON kobo_connections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_kobo_connections_public" ON kobo_connections FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_kobo_connections_public" ON kobo_connections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_kobo_connections_public" ON kobo_connections FOR DELETE TO anon, authenticated USING (true);

-- kobo_imports
DROP POLICY IF EXISTS "read_kobo_imports_authenticated" ON kobo_imports;
DROP POLICY IF EXISTS "insert_kobo_imports_authenticated" ON kobo_imports;
DROP POLICY IF EXISTS "update_kobo_imports_authenticated" ON kobo_imports;
DROP POLICY IF EXISTS "delete_kobo_imports_authenticated" ON kobo_imports;
CREATE POLICY "read_kobo_imports_public" ON kobo_imports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_kobo_imports_public" ON kobo_imports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_kobo_imports_public" ON kobo_imports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_kobo_imports_public" ON kobo_imports FOR DELETE TO anon, authenticated USING (true);

-- permissions
DROP POLICY IF EXISTS "read_permissions_authenticated" ON permissions;
DROP POLICY IF EXISTS "insert_permissions_authenticated" ON permissions;
DROP POLICY IF EXISTS "update_permissions_authenticated" ON permissions;
DROP POLICY IF EXISTS "delete_permissions_authenticated" ON permissions;
CREATE POLICY "read_permissions_public" ON permissions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_permissions_public" ON permissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_permissions_public" ON permissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_permissions_public" ON permissions FOR DELETE TO anon, authenticated USING (true);

-- profiles
DROP POLICY IF EXISTS "read_profiles_authenticated" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_profiles_authenticated" ON profiles;
DROP POLICY IF EXISTS "delete_profiles_authenticated" ON profiles;
CREATE POLICY "read_profiles_public" ON profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_profiles_public" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_profiles_public" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_profiles_public" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- projects
DROP POLICY IF EXISTS "read_projects_authenticated" ON projects;
DROP POLICY IF EXISTS "insert_projects_authenticated" ON projects;
DROP POLICY IF EXISTS "update_projects_authenticated" ON projects;
DROP POLICY IF EXISTS "delete_projects_authenticated" ON projects;
CREATE POLICY "read_projects_public" ON projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_projects_public" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_projects_public" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_projects_public" ON projects FOR DELETE TO anon, authenticated USING (true);

-- roles
DROP POLICY IF EXISTS "read_roles_authenticated" ON roles;
DROP POLICY IF EXISTS "insert_roles_authenticated" ON roles;
DROP POLICY IF EXISTS "update_roles_authenticated" ON roles;
DROP POLICY IF EXISTS "delete_roles_authenticated" ON roles;
CREATE POLICY "read_roles_public" ON roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_roles_public" ON roles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_roles_public" ON roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_roles_public" ON roles FOR DELETE TO anon, authenticated USING (true);

-- Grant anon access to RPC functions used by the frontend
GRANT EXECUTE ON FUNCTION public.get_project_schema(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_custom_schema(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(jsonb) TO anon, authenticated;
