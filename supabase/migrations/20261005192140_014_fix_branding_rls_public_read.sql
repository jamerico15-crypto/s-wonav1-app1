/*
# Fix Branding Table RLS — Allow Public Read + Authenticated Write

## Problem
The branding table's SELECT policy was scoped to `authenticated` only.
The login page reads branding data before the user signs in (anon role),
so it received zero rows and the uploaded logo never appeared on the
login screen. The logo only showed inside the app after login.

## Changes
1. Replaces the SELECT policy to allow both `anon` and `authenticated`
   to read branding data (it is intentionally public — app name, logo,
   colors, labels).
2. Keeps INSERT, UPDATE, DELETE scoped to `authenticated` only.
3. Adds `WITH CHECK (true)` to the UPDATE policy so it matches the USING
   clause (avoids the "weaker WITH CHECK" advisor warning).

## No Schema Changes
The existing table structure (UUID primary key, text columns) is
preserved. No columns added, removed, or modified.
*/

-- SELECT: allow public read (anon + authenticated)
DROP POLICY IF EXISTS "read_branding_authenticated" ON public.branding;
DROP POLICY IF EXISTS "read_branding_public" ON public.branding;
CREATE POLICY "read_branding_public"
ON public.branding FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT: authenticated only
DROP POLICY IF EXISTS "insert_branding_authenticated" ON public.branding;
CREATE POLICY "insert_branding_authenticated"
ON public.branding FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: authenticated only
DROP POLICY IF EXISTS "update_branding_authenticated" ON public.branding;
CREATE POLICY "update_branding_authenticated"
ON public.branding FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

-- DELETE: authenticated only
DROP POLICY IF EXISTS "delete_branding_authenticated" ON public.branding;
CREATE POLICY "delete_branding_authenticated"
ON public.branding FOR DELETE
TO authenticated
USING (true);
