-- =====================================================================
-- Ghosted G1 — Private albums schema + RLS + GDPR cleanup hook
-- Migration: 20260508000001_ghosted_g1_schema
-- =====================================================================
-- Status: APPLIED to production project rfoftonnlwudilafhfkl on 2026-05-08
--         via Cowork (Supabase MCP). This file is the canonical artifact
--         for the repo PR — `supabase db push` will be a no-op against
--         prod, but the file must land in the migrations folder for
--         CI/staging history.
--
-- Goal: Land DB foundation for Ghosted private albums with forward-
-- compatible RLS. The has_xxx_access() helper is intentionally written
-- so its BODY can be swapped in G6 (CCBill subscription gate) without
-- changing any of its callers.
--
-- Forward-compat plan:
--   G1 (this):  hotmess+ paid tier active AND age_verified_at NOT NULL
--   G6 (CCBill): plus active CCBill xxx_addon subscription
--   helper signature does NOT change between versions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profile columns: age_verified_at, age_verification_method
-- ---------------------------------------------------------------------
-- Distinct from existing `age_verified` boolean (self-attestation) and
-- `verified_at` (general profile verification per #226). This pair is
-- audit-grade: timestamp + method tag (yoti | community | manual_admin).
alter table public.profiles
  add column if not exists age_verified_at timestamptz,
  add column if not exists age_verification_method text;

comment on column public.profiles.age_verified_at is
  'Audit-grade adult age verification timestamp. Set by Yoti webhook in G4. NULL = no audit trail (UK OSA HEAA non-compliant).';
comment on column public.profiles.age_verification_method is
  'How age was verified: yoti | community | manual_admin. NULL when age_verified_at is NULL.';

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

create table if not exists public.ghosted_albums (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  is_xxx       boolean not null default false,
  cover_photo_id uuid,           -- self-ref to ghosted_album_photos; nullable
  photo_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create index if not exists ghosted_albums_owner_idx
  on public.ghosted_albums (owner_id, archived_at);

create index if not exists ghosted_albums_xxx_idx
  on public.ghosted_albums (owner_id) where is_xxx = true;

create table if not exists public.ghosted_album_photos (
  id              uuid primary key default gen_random_uuid(),
  album_id        uuid not null references public.ghosted_albums(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  storage_path    text not null,            -- path under storage.objects bucket "ghosted-photos"
  width           integer,
  height          integer,
  byte_size       integer,
  mime_type       text,
  -- moderation fields populated by G3 upload edge function
  scan_status     text not null default 'pending'
    check (scan_status in ('pending','approved','rejected','quarantined')),
  scan_results    jsonb not null default '{}'::jsonb,  -- nudenet, photodna, stopncii summaries
  scanned_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists ghosted_album_photos_album_idx
  on public.ghosted_album_photos (album_id, created_at desc);
create index if not exists ghosted_album_photos_owner_idx
  on public.ghosted_album_photos (owner_id);
create index if not exists ghosted_album_photos_scan_idx
  on public.ghosted_album_photos (scan_status) where scan_status <> 'approved';

-- now we can wire the cover_photo_id FK
alter table public.ghosted_albums
  drop constraint if exists ghosted_albums_cover_photo_fk,
  add constraint ghosted_albums_cover_photo_fk
    foreign key (cover_photo_id) references public.ghosted_album_photos(id) on delete set null;

create table if not exists public.ghosted_album_shares (
  id              uuid primary key default gen_random_uuid(),
  album_id        uuid not null references public.ghosted_albums(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  shared_at       timestamptz not null default now(),
  expires_at      timestamptz,                       -- NULL = no expiry
  revoked_at      timestamptz,
  view_count      integer not null default 0,
  last_viewed_at  timestamptz,
  -- chat thread context: where the share was sent (optional)
  conversation_id uuid,
  unique (album_id, recipient_id)
);

create index if not exists ghosted_album_shares_recipient_idx
  on public.ghosted_album_shares (recipient_id, revoked_at);
create index if not exists ghosted_album_shares_album_idx
  on public.ghosted_album_shares (album_id);

-- ---------------------------------------------------------------------
-- 3. updated_at trigger for ghosted_albums
-- ---------------------------------------------------------------------
create or replace function public.set_ghosted_albums_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists trg_ghosted_albums_updated_at on public.ghosted_albums;
create trigger trg_ghosted_albums_updated_at
  before update on public.ghosted_albums
  for each row execute function public.set_ghosted_albums_updated_at();

-- ---------------------------------------------------------------------
-- 4. Helper function: has_xxx_access
--    Forward-compatible: G6 will REPLACE this body, signature stays.
-- ---------------------------------------------------------------------
create or replace function public.has_xxx_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.memberships m
    join public.profiles    p on p.id = m.user_id
    where m.user_id = p_user_id
      and m.status  = 'active'
      and m.tier in ('hotmess', 'connected', 'promoter', 'venue')
      and (m.ends_at is null or m.ends_at > now())
      and p.age_verified_at is not null
  );
$fn$;

comment on function public.has_xxx_access(uuid) is
  'Returns true if user has paid hotmess+ tier active AND audit-grade age verification. G6 will swap body to additionally require active CCBill xxx_addon subscription. Signature must NOT change — RLS depends on it.';

-- ---------------------------------------------------------------------
-- 5. Helper function: has_active_album_share
-- ---------------------------------------------------------------------
create or replace function public.has_active_album_share(p_album_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.ghosted_album_shares s
    where s.album_id     = p_album_id
      and s.recipient_id = p_user_id
      and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  );
$fn$;

comment on function public.has_active_album_share(uuid, uuid) is
  'Returns true if recipient has a non-revoked, non-expired share to the album.';

-- ---------------------------------------------------------------------
-- 6. RLS — ghosted_albums
-- ---------------------------------------------------------------------
alter table public.ghosted_albums enable row level security;

drop policy if exists ghosted_albums_owner_all on public.ghosted_albums;
create policy ghosted_albums_owner_all
  on public.ghosted_albums
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists ghosted_albums_recipient_select on public.ghosted_albums;
create policy ghosted_albums_recipient_select
  on public.ghosted_albums
  for select
  to authenticated
  using (
    archived_at is null
    and public.has_active_album_share(id, auth.uid())
    and (
      is_xxx = false
      or public.has_xxx_access(auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 7. RLS — ghosted_album_photos
-- ---------------------------------------------------------------------
alter table public.ghosted_album_photos enable row level security;

drop policy if exists ghosted_album_photos_owner_all on public.ghosted_album_photos;
create policy ghosted_album_photos_owner_all
  on public.ghosted_album_photos
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists ghosted_album_photos_recipient_select on public.ghosted_album_photos;
create policy ghosted_album_photos_recipient_select
  on public.ghosted_album_photos
  for select
  to authenticated
  using (
    scan_status = 'approved'
    and public.has_active_album_share(album_id, auth.uid())
    and exists (
      select 1
      from public.ghosted_albums a
      where a.id = ghosted_album_photos.album_id
        and a.archived_at is null
        and (
          a.is_xxx = false
          or public.has_xxx_access(auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- 8. RLS — ghosted_album_shares
-- ---------------------------------------------------------------------
alter table public.ghosted_album_shares enable row level security;

drop policy if exists ghosted_album_shares_owner_all on public.ghosted_album_shares;
create policy ghosted_album_shares_owner_all
  on public.ghosted_album_shares
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists ghosted_album_shares_recipient_select on public.ghosted_album_shares;
create policy ghosted_album_shares_recipient_select
  on public.ghosted_album_shares
  for select
  to authenticated
  using (recipient_id = auth.uid());

-- recipients can update their own row to bump view_count / last_viewed_at
drop policy if exists ghosted_album_shares_recipient_view_update on public.ghosted_album_shares;
create policy ghosted_album_shares_recipient_view_update
  on public.ghosted_album_shares
  for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. Storage bucket: ghosted-photos (private)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ghosted-photos',
  'ghosted-photos',
  false,
  20971520, -- 20 MB
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do nothing;

-- Storage RLS — owners read/write their own prefix; recipients read via signed URLs only
drop policy if exists ghosted_photos_owner_all on storage.objects;
create policy ghosted_photos_owner_all
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'ghosted-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'ghosted-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- recipients do NOT get direct storage access — G3 will issue signed URLs via edge function
-- this keeps watermarking, expiring URLs, and scan-status gating in the app layer

-- ---------------------------------------------------------------------
-- 10. Storage cleanup function (called by delete_user_data)
-- ---------------------------------------------------------------------
create or replace function public.cleanup_ghosted_storage_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $fn$
declare
  v_objects_deleted bigint := 0;
  v_photos_deleted  bigint := 0;
  v_albums_deleted  bigint := 0;
  v_shares_deleted  bigint := 0;
begin
  delete from storage.objects
  where bucket_id = 'ghosted-photos'
    and (storage.foldername(name))[1] = p_user_id::text;
  get diagnostics v_objects_deleted = row_count;

  delete from public.ghosted_album_photos
  where owner_id = p_user_id;
  get diagnostics v_photos_deleted = row_count;

  delete from public.ghosted_albums
  where owner_id = p_user_id;
  get diagnostics v_albums_deleted = row_count;

  delete from public.ghosted_album_shares
  where recipient_id = p_user_id;
  get diagnostics v_shares_deleted = row_count;

  return jsonb_build_object(
    'ghosted_storage_objects',     v_objects_deleted,
    'ghosted_album_photos',        v_photos_deleted,
    'ghosted_albums',              v_albums_deleted,
    'ghosted_album_shares_as_recipient', v_shares_deleted
  );
end;
$fn$;

comment on function public.cleanup_ghosted_storage_for_user(uuid) is
  'Purges Ghosted private-album data for a user: storage objects, photo rows, album rows, recipient share rows. Called by delete_user_data RPC.';

-- ---------------------------------------------------------------------
-- 11. Patch delete_user_data to call cleanup_ghosted_storage_for_user
-- ---------------------------------------------------------------------
-- Mirrors the function live in production (rfoftonnlwudilafhfkl) on 2026-05-08.
-- Two ghosted-specific changes from the GDPR baseline (20260507000002):
--   1. ghosted_albums / ghosted_album_photos / ghosted_album_shares are added
--      to the dynamic-loop skip list — they have their own ownership column
--      semantics (owner_id) and storage objects, so the helper handles them.
--   2. A single block calls public.cleanup_ghosted_storage_for_user(p_user_id)
--      before the gdpr_deletion_log insert.
create or replace function public.delete_user_data(p_user_id uuid, p_requested_by text default 'self'::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  rec            record;
  cnt            bigint;
  total_counts   jsonb := '{}'::jsonb;
  v_user_id_hash text;
  v_user_email   text;
  v_ghosted_counts jsonb;
  delete_cols    text[] := array[
    'user_id','owner_id','seller_id','buyer_id',
    'from_user_id','to_user_id','tapper_id','tapped_id',
    'auth_user_id','blocker_id','blocked_id',
    'creator_id','host_id','organizer_id',
    'referrer_id','referred_id','recipient_id'
  ];
  null_cols      text[] := array[
    'sender_id','reviewer_id','responder_user_id',
    'reviewed_by','created_by','requested_by',
    'triggered_by','escalator_id','invited_by'
  ];
  is_privileged  boolean;
begin
  is_privileged := session_user in ('service_role','postgres','supabase_admin');
  if not is_privileged then
    if auth.uid() is null then
      raise exception 'delete_user_data: caller not authenticated';
    end if;
    if auth.uid() <> p_user_id
       and not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    then
      raise exception 'delete_user_data: not authorized';
    end if;
  end if;

  select email into v_user_email from auth.users where id = p_user_id;
  v_user_id_hash := encode(extensions.digest(p_user_id::text, 'sha256'), 'hex');

  update public.messages
     set sender_id   = null,
         content     = '[deleted]',
         attachments = '[]'::jsonb,
         metadata    = '{}'::jsonb
   where sender_id = p_user_id;
  get diagnostics cnt = row_count;
  total_counts := total_counts || jsonb_build_object('messages.anonymized', cnt);

  if v_user_email is not null then
    update public.chat_messages
       set sender_email = '[deleted]',
           content      = '[deleted]',
           media_urls   = null,
           metadata     = '{}'::jsonb
     where sender_email = v_user_email;
    get diagnostics cnt = row_count;
    total_counts := total_counts || jsonb_build_object('chat_messages.anonymized', cnt);
  end if;

  for rec in
    select c.table_name, c.column_name
      from information_schema.columns c
      join information_schema.tables  t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and t.table_type   = 'BASE TABLE'
       and c.data_type    = 'uuid'
       and c.column_name  = any(null_cols)
       and c.table_name not in (
         'messages','chat_messages','gdpr_deletion_log','audit_logs','isolation_audit_log',
         'aa_escalation_log','operator_audit_log','feature_flag_audit_log'
       )
  loop
    begin
      execute format('UPDATE public.%I SET %I = NULL WHERE %I = $1',
                     rec.table_name, rec.column_name, rec.column_name)
        using p_user_id;
      get diagnostics cnt = row_count;
      if cnt > 0 then
        total_counts := total_counts ||
          jsonb_build_object('null.' || rec.table_name || '.' || rec.column_name, cnt);
      end if;
    exception when others then
      total_counts := total_counts ||
        jsonb_build_object('err_null.' || rec.table_name || '.' || rec.column_name, sqlerrm);
    end;
  end loop;

  for rec in
    select c.table_name, c.column_name
      from information_schema.columns c
      join information_schema.tables  t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and t.table_type   = 'BASE TABLE'
       and c.data_type    = 'uuid'
       and c.column_name  = any(delete_cols)
       and c.table_name not in (
         'messages','chat_messages','gdpr_deletion_log',
         'audit_logs','isolation_audit_log','aa_escalation_log',
         'operator_audit_log','feature_flag_audit_log',
         'profiles',
         -- ghosted_* handled explicitly below
         'ghosted_albums','ghosted_album_photos','ghosted_album_shares'
       )
  loop
    begin
      execute format('DELETE FROM public.%I WHERE %I = $1',
                     rec.table_name, rec.column_name)
        using p_user_id;
      get diagnostics cnt = row_count;
      if cnt > 0 then
        total_counts := total_counts ||
          jsonb_build_object(rec.table_name || '.' || rec.column_name, cnt);
      end if;
    exception when others then
      total_counts := total_counts ||
        jsonb_build_object('err.' || rec.table_name || '.' || rec.column_name, sqlerrm);
    end;
  end loop;

  if v_user_email is not null then
    delete from public.chat_threads
     where v_user_email = any(participant_emails);
    get diagnostics cnt = row_count;
    total_counts := total_counts || jsonb_build_object('chat_threads', cnt);

    delete from public.taps
     where tapper_email = v_user_email or tapped_email = v_user_email;
    get diagnostics cnt = row_count;
    total_counts := total_counts || jsonb_build_object('taps.email', cnt);

    delete from public.trusted_contacts
     where contact_email = v_user_email;
    get diagnostics cnt = row_count;
    total_counts := total_counts || jsonb_build_object('trusted_contacts.contact_email', cnt);
  end if;

  -- ---- Ghosted G1 cleanup hook ----
  begin
    v_ghosted_counts := public.cleanup_ghosted_storage_for_user(p_user_id);
    total_counts := total_counts || v_ghosted_counts;
  exception when others then
    total_counts := total_counts || jsonb_build_object('err.ghosted_cleanup', sqlerrm);
  end;
  -- ---------------------------------

  total_counts := total_counts || jsonb_build_object(
    'storage.objects', 'caller-must-purge-via-storage-api'
  );

  insert into public.gdpr_deletion_log (user_id_hash, deleted_at, requested_by, table_counts)
  values (v_user_id_hash, now(), p_requested_by, total_counts);

  delete from auth.users where id = p_user_id;

  return jsonb_build_object(
    'user_id_hash', v_user_id_hash,
    'deleted_at',   now(),
    'counts',       total_counts
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- 12. Grants
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.ghosted_albums         to authenticated;
grant select, insert, update, delete on public.ghosted_album_photos   to authenticated;
grant select, insert, update, delete on public.ghosted_album_shares   to authenticated;

grant execute on function public.has_xxx_access(uuid)                 to authenticated, anon;
grant execute on function public.has_active_album_share(uuid, uuid)   to authenticated, anon;
grant execute on function public.cleanup_ghosted_storage_for_user(uuid) to service_role;

-- =====================================================================
-- End of migration — applied to prod 2026-05-08, all 8 verifications green
-- =====================================================================
