-- Project assignments define which projects authenticated non-admin users can access.
CREATE TABLE IF NOT EXISTS public.project_assignments (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_is_project_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    JOIN public.roles AS r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND lower(trim(r.name)) IN ('admin', 'super admin')
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_project_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_project_admin() TO authenticated;

-- Replace the previous permissive/public assignment policies, if present.
DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('project_assignments', 'projects', 'project_districts', 'activities', 'indicators', 'beneficiaries', 'kobo_activity_mappings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', existing_policy.policyname, existing_policy.schemaname, existing_policy.tablename);
  END LOOP;
END $$;

-- A user can read their own project assignments. Only admins can manage assignments.
CREATE POLICY project_assignments_select ON public.project_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_project_admin());
CREATE POLICY project_assignments_insert ON public.project_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_project_admin());
CREATE POLICY project_assignments_update ON public.project_assignments
  FOR UPDATE TO authenticated
  USING (public.current_user_is_project_admin())
  WITH CHECK (public.current_user_is_project_admin());
CREATE POLICY project_assignments_delete ON public.project_assignments
  FOR DELETE TO authenticated
  USING (public.current_user_is_project_admin());

-- Projects are visible to admins and assigned users. Project creation/deletion is admin-only.
CREATE POLICY projects_select_assigned ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_project_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_assignments AS pa
      WHERE pa.project_id = projects.id AND pa.user_id = auth.uid()
    )
  );
CREATE POLICY projects_insert_admin ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.current_user_is_project_admin());
CREATE POLICY projects_update_assigned ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.current_user_is_project_admin()
    OR EXISTS (SELECT 1 FROM public.project_assignments AS pa WHERE pa.project_id = projects.id AND pa.user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_is_project_admin()
    OR EXISTS (SELECT 1 FROM public.project_assignments AS pa WHERE pa.project_id = projects.id AND pa.user_id = auth.uid())
  );
CREATE POLICY projects_delete_admin ON public.projects
  FOR DELETE TO authenticated USING (public.current_user_is_project_admin());

-- Project-scoped data is only accessible to admins or users assigned to its project.
DO $$
DECLARE
  scoped_table text;
BEGIN
  FOREACH scoped_table IN ARRAY ARRAY['project_districts', 'activities', 'indicators', 'beneficiaries', 'kobo_activity_mappings'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        public.current_user_is_project_admin()
        OR EXISTS (SELECT 1 FROM public.project_assignments AS pa WHERE pa.project_id = %I.project_id AND pa.user_id = auth.uid())
      )',
      scoped_table || '_select_assigned', scoped_table, scoped_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_project_admin()
        OR EXISTS (SELECT 1 FROM public.project_assignments AS pa WHERE pa.project_id = %I.project_id AND pa.user_id = auth.uid())
      )',
      scoped_table || '_insert_assigned', scoped_table, scoped_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        public.current_user_is_project_admin()
        OR EXISTS (SELECT 1 FROM public.project_assignments AS pa WHERE pa.project_id = %I.project_id AND pa.user_id = auth.uid())
      ) WITH CHECK (
        public.current_user_is_project_admin()
        OR EXISTS (SELECT 1 FROM public.project_assignments AS pa WHERE pa.project_id = %I.project_id AND pa.user_id = auth.uid())
      )',
      scoped_table || '_update_assigned', scoped_table, scoped_table, scoped_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        public.current_user_is_project_admin()
        OR EXISTS (SELECT 1 FROM public.project_assignments AS pa WHERE pa.project_id = %I.project_id AND pa.user_id = auth.uid())
      )',
      scoped_table || '_delete_assigned', scoped_table, scoped_table
    );
  END LOOP;
END $$;

REVOKE ALL ON public.project_assignments, public.projects, public.project_districts, public.activities, public.indicators, public.beneficiaries, public.kobo_activity_mappings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.project_districts, public.activities, public.indicators, public.beneficiaries, public.kobo_activity_mappings TO authenticated;

-- A normal view runs with its owner's privileges; security_invoker makes its reads obey the
-- project-scoped policies above. Supabase/PostgreSQL 15 supports this view option.
ALTER VIEW public.view_indicator_statistics SET (security_invoker = true);
REVOKE ALL ON public.view_indicator_statistics FROM PUBLIC, anon;
GRANT SELECT ON public.view_indicator_statistics TO authenticated;
