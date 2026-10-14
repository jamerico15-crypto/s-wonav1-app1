/*
# Admin: Assign Role to Any Profile

## Problem
When an admin creates a new user via the Users page, `supabase.auth.signUp()`
replaces the current session with the new user's session. The subsequent
`profiles.update({ role_id })` then runs as the NEW user, not the admin.
The `update_own_profile` RLS policy only allows updating your own row,
so the admin-selected role never gets applied. The new user gets stuck
with the default "Field Volunteer" role (or no role at all).

## Solution
1. Create a SECURITY DEFINER function `admin_assign_role(profile_uuid, role_uuid)`
   that allows ANY authenticated user who is an Admin to set the role_id
   on ANY profile. This bypasses RLS safely because the function itself
   checks that the caller has the Admin role.
2. Update `handle_new_user()` trigger to accept a `role_id` from the
   user_metadata if provided, so the admin-selected role is applied at
   signup time directly.
3. Grant EXECUTE on the function to authenticated users.

## Security
- The function checks that `auth.uid()` has a profile with the Admin role
  before allowing the update. Non-admins get a permission error.
- SECURITY DEFINER with `search_path = public` prevents search_path injection.
*/

-- ============================================================
-- 1. admin_assign_role function
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_assign_role(target_profile_id uuid, new_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role_name text;
  role_exists boolean;
BEGIN
  -- Get the caller's role name
  SELECT r.name INTO caller_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  -- Only Admin or Super Admin can assign roles
  IF caller_role_name IS NULL OR (caller_role_name <> 'Admin' AND caller_role_name <> 'Super Admin') THEN
    RAISE EXCEPTION 'Permission denied: only administrators can assign roles';
  END IF;

  -- Verify the target role exists
  SELECT EXISTS(SELECT 1 FROM public.roles WHERE id = new_role_id) INTO role_exists;
  IF NOT role_exists THEN
    RAISE EXCEPTION 'Target role does not exist';
  END IF;

  -- Update the profile's role
  UPDATE public.profiles
  SET role_id = new_role_id
  WHERE id = target_profile_id;

  -- If no profile row exists yet, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, role_id)
    VALUES (target_profile_id, new_role_id)
    ON CONFLICT (id) DO UPDATE SET role_id = new_role_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users (the function internally checks admin role)
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, uuid) TO authenticated;

-- ============================================================
-- 2. Update handle_new_user to accept role_id from metadata
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
  metadata_role_id text;
BEGIN
  -- Check if a specific role_id was passed in user metadata (admin-created users)
  metadata_role_id := new.raw_user_meta_data->>'role_id';

  IF metadata_role_id IS NOT NULL AND metadata_role_id <> '' THEN
    -- Use the admin-specified role
    SELECT id INTO default_role_id FROM public.roles WHERE id::text = metadata_role_id;
  END IF;

  -- Fall back to "Field Volunteer" if no role specified or role not found
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'Field Volunteer';
  END IF;

  INSERT INTO public.profiles (id, full_name, role_id)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', default_role_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role_id = COALESCE(profiles.role_id, EXCLUDED.role_id);

  RETURN new;
END;
$$;
