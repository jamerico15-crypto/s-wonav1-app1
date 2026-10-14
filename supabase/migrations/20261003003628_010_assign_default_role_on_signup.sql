/*
# Assign default role to new users on signup

## Overview
The handle_new_user trigger currently creates a profile without a role_id,
causing new users to see "Role Assignment Pending" with no way to access the system.
This update assigns the "Field Volunteer" role (lowest privilege) as the default
so new users can immediately use the system. Admins can upgrade roles later.

## Changes
- Updated handle_new_user() to look up the "Field Volunteer" role and assign it
  to newly created profiles.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'Field Volunteer';

  INSERT INTO public.profiles (id, full_name, role_id)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', default_role_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role_id = COALESCE(profiles.role_id, EXCLUDED.role_id);

  RETURN new;
END;
$$;
