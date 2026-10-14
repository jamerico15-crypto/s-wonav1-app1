/*
# MEAL Management System - Core Schema

## Overview
Creates the complete database schema for the MEAL (Monitoring, Evaluation, Accountability, and Learning) Management System for "Missão contra a Lepra Moçambique".

## New Tables

1. **profiles** - Extends auth.users with full name and role assignment
   - id (uuid, PK, references auth.users)
   - full_name (text)
   - role_id (uuid, references roles)
   - created_at (timestamp)

2. **roles** - Custom role definitions
   - id (uuid, PK)
   - name (text, unique)
   - description (text)
   - is_system (boolean, default false)
   - created_at (timestamp)

3. **permissions** - CRUD + visualization toggles per role per module
   - id (uuid, PK)
   - role_id (uuid, references roles)
   - module (text) - e.g. 'projects', 'indicators', 'activities', 'users', 'branding', 'schema_generator'
   - can_create (boolean)
   - can_read (boolean)
   - can_update (boolean)
   - can_delete (boolean)
   - can_visualize (boolean)

4. **districts** - Master list of districts (strata)
   - id (uuid, PK)
   - name (text, unique)
   - province (text)
   - created_at (timestamp)

5. **projects** - Project context data
   - id (uuid, PK)
   - title (text)
   - description (text)
   - district_ids (uuid[]) - array of district IDs
   - objectives (text)
   - inputs (text)
   - target_indicators (text)
   - outcomes (text)
   - budget (numeric)
   - budget_spent (numeric, default 0)
   - status (text: planned/ongoing/delayed/completed)
   - phase (text)
   - start_date (date)
   - end_date (date)
   - created_by (uuid, references auth.users)
   - created_at (timestamp)

6. **indicators** - Logframe indicators linked to projects
   - id (uuid, PK)
   - project_id (uuid, references projects)
   - name (text)
   - description (text)
   - baseline_value (numeric)
   - target_value (numeric)
   - current_value (numeric, default 0)
   - unit (text)
   - disaggregation (text) - e.g. 'gender', 'disability', 'age'
   - category (text) - e.g. 'output', 'outcome', 'impact'
   - created_at (timestamp)

7. **activities** - Project activities with progress tracking
   - id (uuid, PK)
   - project_id (uuid, references projects)
   - title (text)
   - description (text)
   - status (text: planned/ongoing/delayed/completed)
   - progress (integer, default 0, 0-100)
   - start_date (date)
   - end_date (date)
   - milestone (boolean, default false)
   - created_at (timestamp)

8. **beneficiaries** - Beneficiary tracking records
   - id (uuid, PK)
   - project_id (uuid, references projects)
   - district_id (uuid, references districts)
   - total_reached (integer)
   - male (integer, default 0)
   - female (integer, default 0)
   - disability_grade1 (integer, default 0)
   - disability_grade2 (integer, default 0)
   - age_group (text)
   - date_recorded (date)
   - created_at (timestamp)

9. **branding** - Dynamic branding settings (single row)
   - id (uuid, PK)
   - logo_url (text)
   - primary_label (text) - e.g. "Moçambique"
   - secondary_label (text) - e.g. "Missão contra a Lepra"
   - base_font (text) - e.g. "Inter"
   - primary_color (text) - hex
   - secondary_color (text) - hex
   - updated_at (timestamp)

10. **custom_schemas** - AI schema generator proposals and applied schemas
    - id (uuid, PK)
    - prompt (text) - user's text prompt
    - proposal (jsonb) - generated schema proposal
    - status (text: draft/applied)
    - table_name (text) - name of created table if applied
    - created_by (uuid, references auth.users)
    - created_at (timestamp)

## Security
- RLS enabled on all tables.
- All tables accessible to authenticated users (RLS enforces authentication, RBAC enforced in frontend).
- Profiles: users can read/update own profile; all authenticated can read profiles.
- Branding: all authenticated can read; all authenticated can update (admin enforced in UI).
*/

-- ============================================
-- ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_roles_authenticated" ON roles;
CREATE POLICY "read_roles_authenticated" ON roles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_roles_authenticated" ON roles;
CREATE POLICY "insert_roles_authenticated" ON roles FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_roles_authenticated" ON roles;
CREATE POLICY "update_roles_authenticated" ON roles FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_roles_authenticated" ON roles;
CREATE POLICY "delete_roles_authenticated" ON roles FOR DELETE
TO authenticated USING (true);

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_profiles_authenticated" ON profiles;
CREATE POLICY "read_profiles_authenticated" ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_create boolean NOT NULL DEFAULT false,
  can_read boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_visualize boolean NOT NULL DEFAULT false,
  UNIQUE(role_id, module)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_permissions_authenticated" ON permissions;
CREATE POLICY "read_permissions_authenticated" ON permissions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_permissions_authenticated" ON permissions;
CREATE POLICY "insert_permissions_authenticated" ON permissions FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_permissions_authenticated" ON permissions;
CREATE POLICY "update_permissions_authenticated" ON permissions FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_permissions_authenticated" ON permissions;
CREATE POLICY "delete_permissions_authenticated" ON permissions FOR DELETE
TO authenticated USING (true);

-- ============================================
-- DISTRICTS
-- ============================================
CREATE TABLE IF NOT EXISTS districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  province text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_districts_authenticated" ON districts;
CREATE POLICY "read_districts_authenticated" ON districts FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_districts_authenticated" ON districts;
CREATE POLICY "insert_districts_authenticated" ON districts FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_districts_authenticated" ON districts;
CREATE POLICY "update_districts_authenticated" ON districts FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_districts_authenticated" ON districts;
CREATE POLICY "delete_districts_authenticated" ON districts FOR DELETE
TO authenticated USING (true);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  district_ids uuid[] DEFAULT '{}',
  objectives text,
  inputs text,
  target_indicators text,
  outcomes text,
  budget numeric DEFAULT 0,
  budget_spent numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  phase text,
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_projects_authenticated" ON projects;
CREATE POLICY "read_projects_authenticated" ON projects FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_projects_authenticated" ON projects;
CREATE POLICY "insert_projects_authenticated" ON projects FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_projects_authenticated" ON projects;
CREATE POLICY "update_projects_authenticated" ON projects FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_projects_authenticated" ON projects;
CREATE POLICY "delete_projects_authenticated" ON projects FOR DELETE
TO authenticated USING (true);

-- ============================================
-- INDICATORS
-- ============================================
CREATE TABLE IF NOT EXISTS indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  baseline_value numeric DEFAULT 0,
  target_value numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  unit text,
  disaggregation text,
  category text DEFAULT 'output',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_indicators_authenticated" ON indicators;
CREATE POLICY "read_indicators_authenticated" ON indicators FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_indicators_authenticated" ON indicators;
CREATE POLICY "insert_indicators_authenticated" ON indicators FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_indicators_authenticated" ON indicators;
CREATE POLICY "update_indicators_authenticated" ON indicators FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_indicators_authenticated" ON indicators;
CREATE POLICY "delete_indicators_authenticated" ON indicators FOR DELETE
TO authenticated USING (true);

-- ============================================
-- ACTIVITIES
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planned',
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date date,
  end_date date,
  milestone boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_activities_authenticated" ON activities;
CREATE POLICY "read_activities_authenticated" ON activities FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_activities_authenticated" ON activities;
CREATE POLICY "insert_activities_authenticated" ON activities FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_activities_authenticated" ON activities;
CREATE POLICY "update_activities_authenticated" ON activities FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_activities_authenticated" ON activities;
CREATE POLICY "delete_activities_authenticated" ON activities FOR DELETE
TO authenticated USING (true);

-- ============================================
-- BENEFICIARIES
-- ============================================
CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  total_reached integer NOT NULL DEFAULT 0,
  male integer NOT NULL DEFAULT 0,
  female integer NOT NULL DEFAULT 0,
  disability_grade1 integer NOT NULL DEFAULT 0,
  disability_grade2 integer NOT NULL DEFAULT 0,
  age_group text,
  date_recorded date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_beneficiaries_authenticated" ON beneficiaries;
CREATE POLICY "read_beneficiaries_authenticated" ON beneficiaries FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_beneficiaries_authenticated" ON beneficiaries;
CREATE POLICY "insert_beneficiaries_authenticated" ON beneficiaries FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_beneficiaries_authenticated" ON beneficiaries;
CREATE POLICY "update_beneficiaries_authenticated" ON beneficiaries FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_beneficiaries_authenticated" ON beneficiaries;
CREATE POLICY "delete_beneficiaries_authenticated" ON beneficiaries FOR DELETE
TO authenticated USING (true);

-- ============================================
-- BRANDING
-- ============================================
CREATE TABLE IF NOT EXISTS branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  primary_label text NOT NULL DEFAULT 'Moçambique',
  secondary_label text NOT NULL DEFAULT 'Missão contra a Lepra',
  base_font text NOT NULL DEFAULT 'Inter',
  primary_color text NOT NULL DEFAULT '#EE3A25',
  secondary_color text NOT NULL DEFAULT '#711246',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_branding_authenticated" ON branding;
CREATE POLICY "read_branding_authenticated" ON branding FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_branding_authenticated" ON branding;
CREATE POLICY "insert_branding_authenticated" ON branding FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_branding_authenticated" ON branding;
CREATE POLICY "update_branding_authenticated" ON branding FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_branding_authenticated" ON branding;
CREATE POLICY "delete_branding_authenticated" ON branding FOR DELETE
TO authenticated USING (true);

-- ============================================
-- CUSTOM SCHEMAS (AI Schema Generator)
-- ============================================
CREATE TABLE IF NOT EXISTS custom_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  proposal jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  table_name text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_schemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_custom_schemas_authenticated" ON custom_schemas;
CREATE POLICY "read_custom_schemas_authenticated" ON custom_schemas FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_custom_schemas_authenticated" ON custom_schemas;
CREATE POLICY "insert_custom_schemas_authenticated" ON custom_schemas FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_custom_schemas_authenticated" ON custom_schemas;
CREATE POLICY "update_custom_schemas_authenticated" ON custom_schemas FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_custom_schemas_authenticated" ON custom_schemas;
CREATE POLICY "delete_custom_schemas_authenticated" ON custom_schemas FOR DELETE
TO authenticated USING (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_indicators_project_id ON indicators(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_project_id ON beneficiaries(project_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_district_id ON beneficiaries(district_id);
CREATE INDEX IF NOT EXISTS idx_permissions_role_id ON permissions(role_id);

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();