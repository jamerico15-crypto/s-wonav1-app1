/*
# Fix missing INSERT policy on logos storage bucket

## Problem
The `logos` storage bucket was created with SELECT, UPDATE, and DELETE
policies but the INSERT policy was missing. This means authenticated users
cannot upload files to the bucket — every upload fails silently.

## Fix
Adds the missing INSERT policy allowing authenticated users to upload
logo images to the `logos` bucket.
*/

DROP POLICY IF EXISTS "Authenticated can upload logos" ON storage.objects;
CREATE POLICY "Authenticated can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');
