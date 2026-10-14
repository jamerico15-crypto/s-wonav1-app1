/*
# Fix Infinite Recursion in Profiles RLS Policies

## Problem
The `update_profiles_authenticated` and `delete_profiles_authenticated`
policies on `profiles` contain a subquery that SELECTs FROM `profiles` —
this causes PostgreSQL to re-evaluate the profiles RLS policies recursively,
resulting in "infinite recursion detected in policy for relation profiles".

## Solution
1. Create a SECURITY DEFINER helper function `is_current_user_admin()` that
   checks whether `auth.uid()` has an Admin or Super Admin role. Being
   SECURITY DEFINER, it runs as the postgres user and bypasses RLS — no
   recursion.
2. Rewrite the UPDATE and DELETE policies to use `is_current_user_admin()`
   instead of an inline subquery on `profiles`.

## Changes
- New function: `is_current_user_admin()` → returns boolean
- Dropped and recreated: `update_profiles_authenticated` policy
- Dropped and recreated: `delete_profiles_authenticated` policy
*/

-- ============================================================
-- 1. Helper function: is_current_user_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
      AND r.name IN ('Admin', 'Super Admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- ============================================================
-- 2. Fix UPDATE policy — use helper instead of inline subquery
-- ============================================================
DROP POLICY IF EXISTS "update_profiles_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

CREATE POLICY "update_profiles_authenticated" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_current_user_admin())
WITH CHECK (auth.uid() = id OR public.is_current_user_admin());

-- ============================================================
-- 3. Fix DELETE policy — use helper instead of inline subquery
-- ============================================================
DROP POLICY IF EXISTS "delete_profiles_authenticated" ON public.profiles;

CREATE POLICY "delete_profiles_authenticated" ON public.profiles
FOR DELETE TO authenticated
USING (auth.uid() = id OR public.is_current_user_admin());
