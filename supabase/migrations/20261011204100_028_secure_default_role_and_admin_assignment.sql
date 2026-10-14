/*
# Secure role assignment during signup

1. Purpose
- Prevent public signup metadata from choosing an elevated role.
- Keep self-registered accounts on the least-privileged Field Volunteer role.
- Preserve administrator-created role assignment through admin_assign_role().

2. Modified database behavior
- handle_new_user() ignores role_id from user metadata.
- New profiles receive the account email.
- Existing profile roles are preserved.

3. Security
- Browser-controlled signup metadata cannot select an elevated role.
- Role changes require an authenticated administrator through admin_assign_role().
- Passwords remain managed by Supabase Auth; no plaintext password table is created.

4. Important notes
- The Users page calls admin_assign_role() after restoring the administrator session.
- Existing profile data is preserved.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE name = 'Field Volunteer'
  LIMIT 1;

  INSERT INTO public.profiles (id, full_name, email, role_id)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, default_role_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    role_id = COALESCE(profiles.role_id, EXCLUDED.role_id);

  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
