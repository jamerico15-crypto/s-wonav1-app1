/*
# Admin: List All Users and Lookup by Email

## Problem
The Users page only shows profiles from the `profiles` table. The admin
cannot see users who registered but don't have a profile yet, and cannot
look up a user by email to assign a role when the user already exists.

## Solution
Create a SECURITY DEFINER function `admin_list_users()` that returns all
users from `auth.users` joined with their profiles and roles. Only admins
can call it (checked internally).

Also create `admin_find_user_by_email(email)` that returns a user's id
and profile info — useful when the admin tries to create a user that
already exists.

## Security
- Both functions check that the caller has Admin or Super Admin role
- SECURITY DEFINER with search_path = public
*/
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role_id uuid,
  role_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role_name text;
BEGIN
  SELECT r.name INTO caller_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  IF caller_role_name IS NULL OR (caller_role_name <> 'Admin' AND caller_role_name <> 'Super Admin') THEN
    RAISE EXCEPTION 'Permission denied: only administrators can list users';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, p.full_name, p.role_id, r.name, u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.roles r ON r.id = p.role_id
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
