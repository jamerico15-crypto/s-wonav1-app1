/*
# Fix: Revoke EXECUTE on SECURITY DEFINER functions from anon

The security advisor flagged that all SECURITY DEFINER functions are
callable by the anon role (no login required). This is dangerous for
admin functions. Revoke EXECUTE from anon and grant only to authenticated.

- handle_new_user: needs to be callable by anon (trigger on auth.users signup)
- is_current_user_admin: needs to be callable by authenticated (used in RLS policies)
- get_project_schema: read-only schema inspection, allow authenticated
- admin_*: admin-only functions, restrict to authenticated
- apply_custom_schema: dangerous (executes SQL), restrict to authenticated
*/
REVOKE EXECUTE ON FUNCTION public.admin_assign_role(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_custom_schema(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_schema(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_custom_schema(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_schema(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
