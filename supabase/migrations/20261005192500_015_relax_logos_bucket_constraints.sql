UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = null
WHERE id = 'logos';
