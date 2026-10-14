/*
# Fix: handle_new_user should use role_id from signup metadata

When an admin creates a user via UsersPage, the signUp call includes
role_id in user_metadata. The trigger was ignoring it and always
assigning "Field Volunteer" (or NULL if that role doesn't exist).
Now it uses the provided role_id, falling back to "Field Volunteer",
then NULL.
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
  provided_role_id uuid;
BEGIN
  -- Use the role_id provided in signup metadata (admin-created users)
  provided_role_id := NULLIF(new.raw_user_meta_data->>'role_id', '')::uuid;

  IF provided_role_id IS NOT NULL THEN
    -- Validate that the role actually exists
    SELECT id INTO default_role_id FROM public.roles WHERE id = provided_role_id;
  END IF;

  -- Fall back to "Field Volunteer" if no valid role was provided
  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'Field Volunteer';
  END IF;

  INSERT INTO public.profiles (id, full_name, role_id, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    default_role_id,
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    role_id = COALESCE(profiles.role_id, EXCLUDED.role_id);

  RETURN new;
END;
$$;
