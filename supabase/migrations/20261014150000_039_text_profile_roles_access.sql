-- Match project authorization to the text-based public.profiles.role schema.
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
    WHERE p.id = auth.uid()
      AND lower(trim(COALESCE(p.role, ''))) IN ('admin', 'super admin')
  ) OR EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = auth.uid()
      AND lower(trim(COALESCE(u.email, ''))) = 'joao.americo@tlmmoz.org'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_project_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_project_admin() TO authenticated;

-- Assign a text role by its canonical name without relying on the legacy role_id column.
CREATE OR REPLACE FUNCTION public.admin_assign_role_text(
  target_profile_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical_role text;
BEGIN
  IF NOT public.current_user_is_project_admin() THEN
    RAISE EXCEPTION 'Permission denied: only administrators can assign roles';
  END IF;

  IF new_role IS NOT NULL AND trim(new_role) <> '' THEN
    SELECT name INTO canonical_role
    FROM public.roles
    WHERE lower(trim(name)) = lower(trim(new_role))
    LIMIT 1;

    IF canonical_role IS NULL THEN
      RAISE EXCEPTION 'Role does not exist: %', new_role;
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = canonical_role
  WHERE id = target_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found: %', target_profile_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_role_text(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_role_text(uuid, text) TO authenticated;
