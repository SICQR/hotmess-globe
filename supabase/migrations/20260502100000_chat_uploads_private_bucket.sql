-- Round 4 Part 4: flip chat-uploads bucket to private + storage RLS.
-- Zero existing rows in messages reference this bucket (verified before
-- migration), so no backfill required. uploadToStorage.ts is updated to
-- use createSignedUrl() for chat-attachments going forward.

-- 1. Flip the bucket to private. New uploads still land here, but
--    getPublicUrl() will return URLs that 403. Code path uses signed URLs.
UPDATE storage.buckets SET public = false WHERE id = 'chat-uploads';

-- 2. Storage RLS — only authenticated users can SELECT objects in the bucket.
--    Path scheme is "<user_id>/<filename>" so we also restrict by user_id
--    prefix later if we want stricter privacy. For now: any authenticated
--    user can read any chat-uploads object via signed URL request, but
--    public unauthenticated reads are blocked.
DROP POLICY IF EXISTS "chat-uploads authenticated read" ON storage.objects;
CREATE POLICY "chat-uploads authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-uploads');

DROP POLICY IF EXISTS "chat-uploads authenticated insert" ON storage.objects;
CREATE POLICY "chat-uploads authenticated insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "chat-uploads owner delete" ON storage.objects;
CREATE POLICY "chat-uploads owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
