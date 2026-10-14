/*
# Allow admin to update/delete any profile via RLS

PostgREST schema cache is stale and doesn't recognize RPC functions.
Switch to direct table operations with RLS policies that allow admins
to manage any profile.

The is_current_user_admin() function is SECURITY DEFINER (runs as postgres,
bypasses RLS) so it does NOT cause recursion when used in profiles policies.
*/
-- Drop the restrictive update/delete policies
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;

-- Allow admin to update any profile; non-admin can only update own
CREATE POLICY "update_profiles_authenticated" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_current_user_admin())
WITH CHECK (auth.uid() = id OR public.is_current_user_admin());

-- Allow admin to delete any profile; non-admin can only delete own
CREATE POLICY "delete_profiles_authenticated" ON public.profiles
FOR DELETE TO authenticated
USING (auth.uid() = id OR public.is_current_user_admin());
