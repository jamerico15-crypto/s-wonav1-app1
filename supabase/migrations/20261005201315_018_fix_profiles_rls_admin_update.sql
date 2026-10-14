/*
# Fix Profiles RLS and Add Admin Update Policy

## Problem
1. The `profiles` table has `update_own_profile` policy that only allows
   users to update their own profile (`auth.uid() = id`). The admin cannot
   update other users' profiles to assign roles.
2. The `profiles` table has no DELETE policy, which can cause issues.
3. PostgREST reports "infinite recursion detected in policy for relation
   profiles" — the old `read_profiles_authenticated` policy with `USING(true)`
   works, but the `admin_assign_role` SECURITY DEFINER function internally
   queries profiles+roles, which can trigger recursive policy evaluation
   in some edge cases.

## Solution
1. Add an admin update policy: any authenticated user whose profile has
   the Admin or Super Admin role can update any profile.
2. Add a DELETE policy for authenticated users (admin only via app logic).
3. Keep the existing SELECT policy (all authenticated users can read).
4. Keep the existing INSERT policy (own profile only).
5. The `admin_assign_role` function is SECURITY DEFINER and bypasses RLS,
   so it doesn't need policy changes — but the frontend's direct
   `profiles.update()` for "no role" needs a policy that allows it.

## Changes
- Drop and recreate UPDATE policy on profiles to allow admin updates
- Add DELETE policy on profiles for authenticated users
*/
-- ============================================================
-- Profiles: keep SELECT and INSERT as-is, fix UPDATE, add DELETE
-- ============================================================

-- Drop old UPDATE policy (only allowed own profile)
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_profiles_authenticated" ON public.profiles;

-- New UPDATE policy: admin can update any profile, users can update own
CREATE POLICY "update_profiles_authenticated" ON public.profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name IN ('Admin', 'Super Admin')
  )
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name IN ('Admin', 'Super Admin')
  )
);

-- Add DELETE policy (admin can delete profiles)
DROP POLICY IF EXISTS "delete_profiles_authenticated" ON public.profiles;
CREATE POLICY "delete_profiles_authenticated" ON public.profiles
FOR DELETE TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name IN ('Admin', 'Super Admin')
  )
);
