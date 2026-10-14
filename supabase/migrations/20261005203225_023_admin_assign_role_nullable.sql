/*
# Update admin_assign_role to accept NULL role_id

Allow admin to remove a user's role by passing NULL as new_role_id.
*/
CREATE OR REPLACE FUNCTION public.admin_assign_role(target_profile_id uuid, new_role_id uuid)
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
    RAISE EXCEPTION 'Permission denied: only administrators can assign roles';
  END IF;

  IF new_role_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = new_role_id) THEN
      RAISE EXCEPTION 'Target role does not exist';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role_id = new_role_id
  WHERE id = target_profile_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, role_id)
    VALUES (target_profile_id, new_role_id)
    ON CONFLICT (id) DO UPDATE SET role_id = new_role_id;
  END IF;
END;
$$;
