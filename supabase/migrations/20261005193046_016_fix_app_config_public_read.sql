/*
# Fix app_config RLS — Allow Public Read

## Problem
The app_config table (which stores theme colors and footer configuration)
had SELECT scoped to authenticated only. The BrandingContext fetches
app_config on app load — before the user signs in — so it received zero
rows and the login page could not apply the saved theme/footer.

## Changes
1. Replaces the SELECT policy to allow both anon and authenticated to
   read app_config (theme + footer are intentionally public).
2. Keeps INSERT, UPDATE, DELETE scoped to authenticated only.
*/

DROP POLICY IF EXISTS "read_app_config_authenticated" ON public.app_config;
DROP POLICY IF EXISTS "read_app_config_public" ON public.app_config;
CREATE POLICY "read_app_config_public"
ON public.app_config FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "insert_app_config_authenticated" ON public.app_config;
CREATE POLICY "insert_app_config_authenticated"
ON public.app_config FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "update_app_config_authenticated" ON public.app_config;
CREATE POLICY "update_app_config_authenticated"
ON public.app_config FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_app_config_authenticated" ON public.app_config;
CREATE POLICY "delete_app_config_authenticated"
ON public.app_config FOR DELETE
TO authenticated
USING (true);
