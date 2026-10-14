/*
# Admin: Delete user function

Allows admin to delete a user account and their profile.
*/
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
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
    RAISE EXCEPTION 'Permission denied: only administrators can delete users';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
