-- Match Probability System: Profile Embeddings Table
-- Stores OpenAI text embeddings for semantic profile matching.

-- Enable pgvector extension for vector similarity search
create extension if not exists vector;

-- Profile embeddings table for semantic text matching
create table if not exists public.profile_embeddings (
  user_id uuid primary key references public."User"(id) on delete cascade,
  bio_embedding vector(1536),           -- OpenAI text-embedding-3-small dimension
  turn_ons_embedding vector(1536),
  turn_offs_embedding vector(1536),
  combined_embedding vector(1536),      -- Weighted combination for overall matching
  updated_at timestamptz not null default now()
);

-- Index for efficient cosine similarity lookups on combined embedding
create index if not exists idx_profile_embeddings_combined 
on public.profile_embeddings using ivfflat (combined_embedding vector_cosine_ops)
with (lists = 100);

-- Keep updated_at fresh
create or replace function public.set_profile_embeddings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profile_embeddings_updated_at on public.profile_embeddings;
create trigger trg_profile_embeddings_updated_at
before update on public.profile_embeddings
for each row execute function public.set_profile_embeddings_updated_at();

-- RLS policies: Service role can read/write, authenticated users can read their own
alter table public.profile_embeddings enable row level security;

drop policy if exists profile_embeddings_select_self on public.profile_embeddings;
create policy profile_embeddings_select_self
  on public.profile_embeddings
  for select
  to authenticated
  using (
    user_id in (
      select id from public."User" where auth_user_id = auth.uid()
    )
  );

-- Service role bypass (for API computations)
drop policy if exists profile_embeddings_service_all on public.profile_embeddings;
create policy profile_embeddings_service_all
  on public.profile_embeddings
  for all
  to service_role
  using (true)
  with check (true);

-- Scoring configuration table for A/B testing and weight tuning
create table if not exists public.scoring_config (
  id text primary key default 'default',
  version text not null default '1.0',
  weights jsonb not null default '{
    "travelTime": 20,
    "roleCompat": 15,
    "kinkOverlap": 15,
    "intent": 12,
    "semantic": 12,
    "lifestyle": 10,
    "activity": 8,
    "completeness": 8
  }'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default config
insert into public.scoring_config (id, version)
values ('default', '1.0')
on conflict (id) do nothing;

-- Match score cache for frequently viewed profile pairs
create table if not exists public.match_score_cache (
  cache_key text primary key,
  viewer_id uuid not null,
  target_id uuid not null,
  match_probability numeric(5,2) not null,
  breakdown jsonb not null,
  computed_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_match_score_cache_expires on public.match_score_cache (expires_at);
create index if not exists idx_match_score_cache_viewer on public.match_score_cache (viewer_id);

-- Function to clean up expired cache entries (call via scheduled job)
create or replace function public.cleanup_match_score_cache()
returns void as $$
begin
  delete from public.match_score_cache where expires_at < now();
end;
$$ language plpgsql;

-- Add chem_visibility_enabled to user_private_profile if not exists
alter table if exists public.user_private_profile
  add column if not exists chem_visibility_enabled boolean not null default false;

comment on table public.profile_embeddings is 'Stores text embeddings for semantic profile matching';
comment on table public.scoring_config is 'Configuration for match probability scoring weights';
comment on table public.match_score_cache is 'Cache for computed match probability scores';
