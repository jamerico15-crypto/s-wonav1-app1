/*
# Force PostgREST schema cache refresh for admin_list_users

PostgREST hasn't picked up the admin_list_users() function in its schema
cache. Recreating the function with an explicit parameter signature
forces PostgREST to re-detect it. We change the zero-arg function to
accept an optional json parameter, which the frontend will send as {}.

Also changing the return type to jsonb for better PostgREST compatibility.
*/

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users(params jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role_name text;
  result jsonb;
BEGIN
  SELECT r.name INTO caller_role_name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  IF caller_role_name IS NULL OR (caller_role_name <> 'Admin' AND caller_role_name <> 'Super Admin') THEN
    RAISE EXCEPTION 'Permission denied: only administrators can list users';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO result
  FROM (
    SELECT u.id, u.email, p.full_name, p.role_id, r.name as role_name, u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.roles r ON r.id = p.role_id
    ORDER BY u.created_at DESC
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(jsonb) TO authenticated;
