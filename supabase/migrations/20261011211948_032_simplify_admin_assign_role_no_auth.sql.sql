/*
# Simplify admin_assign_role for no-auth app

1. Purpose
- The original function checked auth.uid() for admin role, which fails with no auth.
- Replace with a simple function that validates the role exists and updates the profile.

2. No data is deleted or altered.
*/

CREATE OR REPLACE FUNCTION public.admin_assign_role(target_profile_id uuid, new_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
$function$;
