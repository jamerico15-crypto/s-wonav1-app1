/*
# Definitively Fix Profiles RLS + Add Email Column

## Problem
1. The PostgREST schema cache is stale — it doesn't recognize the
   `admin_list_users` function or the updated `is_current_user_admin`
   policies. The `NOTIFY pgrst` command doesn't work in this environment.
2. The profiles RLS policies still cause infinite recursion because
   PostgREST is using cached old policies that had inline subqueries
   on `profiles`.

## Solution
1. Drop ALL existing policies on `profiles` and recreate them with the
   simplest possible predicates — NO subqueries, NO function calls that
   reference `profiles`. Admin role management is handled entirely
   through SECURITY DEFINER functions (admin_assign_role), so the
   UPDATE policy only needs `auth.uid() = id`.
2. Add an `email` column to `profiles` so the frontend can display it
   without needing to join `auth.users` (which requires a privileged
   function).
3. Backfill the email column from `auth.users`.
4. Update the `handle_new_user` trigger to store the email.

## Changes
- profiles: add `email` column (text, nullable)
- profiles: drop ALL policies, recreate with simple predicates
- handle_new_user: store email in profiles
- Backfill existing profiles with emails from auth.users
*/
-- ============================================================
-- 1. Add email column to profiles
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
END $$;

-- ============================================================
-- 2. Backfill emails from auth.users
-- ============================================================
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ============================================================
-- 3. Update handle_new_user to store email
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
  metadata_role_id text;
BEGIN
  metadata_role_id := new.raw_user_meta_data->>'role_id';

  IF metadata_role_id IS NOT NULL AND metadata_role_id <> '' THEN
    SELECT id INTO default_role_id FROM public.roles WHERE id::text = metadata_role_id;
  END IF;

  IF default_role_id IS NULL THEN
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'Field Volunteer';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role_id)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, default_role_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    role_id = COALESCE(profiles.role_id, EXCLUDED.role_id);

  RETURN new;
END;
$$;

-- ============================================================
-- 4. Drop ALL existing policies on profiles
-- ============================================================
DROP POLICY IF EXISTS "read_profiles_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_profiles_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "delete_profiles_authenticated" ON public.profiles;

-- ============================================================
-- 5. Recreate with simplest possible predicates — NO subqueries
-- ============================================================
-- SELECT: all authenticated users can read all profiles
CREATE POLICY "read_profiles_authenticated" ON public.profiles
FOR SELECT TO authenticated USING (true);

-- INSERT: only own profile (trigger handles this)
CREATE POLICY "insert_own_profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- UPDATE: only own profile (admin uses admin_assign_role RPC)
CREATE POLICY "update_own_profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- DELETE: only own profile
CREATE POLICY "delete_own_profile" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);
