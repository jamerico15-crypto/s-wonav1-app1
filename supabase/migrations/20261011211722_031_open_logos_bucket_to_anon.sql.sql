/*
# Open logos storage bucket to anon (no-auth app)

1. Purpose
- Allow anon role to INSERT/UPDATE/DELETE logo files since the app no longer has authentication.

2. Storage policies modified
- storage.objects: logos bucket INSERT/UPDATE/DELETE policies now include anon role.

3. No data is deleted or altered.
*/

DROP POLICY IF EXISTS "Authenticated can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read logos" ON storage.objects;

CREATE POLICY "Public can read logos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Public can upload logos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Public can update logos" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'logos')
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Public can delete logos" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'logos');
