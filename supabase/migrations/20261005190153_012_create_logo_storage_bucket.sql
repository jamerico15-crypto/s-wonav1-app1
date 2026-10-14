/*
# Create Storage Bucket for Logo Uploads

## Purpose
Creates a public storage bucket named `logos` where branding logo images
are uploaded and served from. This replaces the previous approach of storing
base64-encoded image data directly in the `branding` table column, which
bloats the database and slows down every branding query.

## Changes
1. Creates storage bucket `logos` (public, 2MB file size limit, image-only MIME types).
2. Adds storage policies allowing authenticated users to read and upload logos.
3. No changes to existing tables or data.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to logos
DROP POLICY IF EXISTS "Public can read logos" ON storage.objects;
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'logos');

-- Allow authenticated users to upload logos
DROP POLICY IF EXISTS "Authenticated can upload logos" ON storage.objects;
CREATE POLICY "Authenticated can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Allow authenticated users to update/replace logos
DROP POLICY IF EXISTS "Authenticated can update logos" ON storage.objects;
CREATE POLICY "Authenticated can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- Allow authenticated users to delete logos
DROP POLICY IF EXISTS "Authenticated can delete logos" ON storage.objects;
CREATE POLICY "Authenticated can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');
