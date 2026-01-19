-- Ensure the `uploads` bucket exists and allow authenticated users to upload files.
-- This unblocks profile avatar uploads and other media uploads that use
-- `supabase.storage.from('uploads').upload(...)`.

-- 1) Create bucket (idempotent)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update
set public = excluded.public,
    name = excluded.name;

-- 2) Policies
-- Allow public read of public bucket objects.
drop policy if exists "Uploads are publicly readable" on storage.objects;
create policy "Uploads are publicly readable"
on storage.objects
for select
using (bucket_id = 'uploads');

-- Allow authenticated users to upload new objects into the uploads bucket.
drop policy if exists "Authenticated users can upload to uploads" on storage.objects;
create policy "Authenticated users can upload to uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and owner = auth.uid()
);

-- Allow authenticated users to update their own objects in uploads.
drop policy if exists "Authenticated users can update own uploads" on storage.objects;
create policy "Authenticated users can update own uploads"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'uploads'
  and owner = auth.uid()
)
with check (
  bucket_id = 'uploads'
  and owner = auth.uid()
);

-- Allow authenticated users to delete their own objects in uploads.
drop policy if exists "Authenticated users can delete own uploads" on storage.objects;
create policy "Authenticated users can delete own uploads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'uploads'
  and owner = auth.uid()
);
