-- Create profile_embeddings table for semantic text matching
-- Requires pgvector extension for vector similarity search

create extension if not exists vector;

-- Table to store OpenAI embeddings for profile text fields
create table if not exists public.profile_embeddings (
  user_id uuid primary key references public."User"(id) on delete cascade,
  bio_embedding vector(1536),           -- OpenAI text-embedding-3-small dimension
  turn_ons_embedding vector(1536),
  turn_offs_embedding vector(1536),
  combined_embedding vector(1536),      -- Weighted combination of all text fields
  embedding_model text not null default 'text-embedding-3-small',
  updated_at timestamptz not null default now()
);

-- Create index for efficient vector similarity search using ivfflat
-- Note: ivfflat requires building an index with a reasonable number of lists
-- For smaller datasets, a simple vector index works; for larger ones, tune 'lists' parameter
create index if not exists idx_profile_embeddings_combined 
  on public.profile_embeddings using ivfflat (combined_embedding vector_cosine_ops)
  with (lists = 100);

-- Optional: indexes for individual field embeddings if needed
create index if not exists idx_profile_embeddings_bio 
  on public.profile_embeddings using ivfflat (bio_embedding vector_cosine_ops)
  with (lists = 100);

-- Enable RLS
alter table public.profile_embeddings enable row level security;

-- Service role can read/write all embeddings (needed for batch processing)
-- Users can read their own embeddings by joining through User table's auth_user_id
drop policy if exists profile_embeddings_select_self on public.profile_embeddings;
create policy profile_embeddings_select_self
  on public.profile_embeddings
  for select
  to authenticated
  using (
    exists (
      select 1 from public."User" u
      where u.id = profile_embeddings.user_id
        and u.auth_user_id = auth.uid()
    )
  );

-- Service role policy for insert/update (managed by backend)
drop policy if exists profile_embeddings_service_all on public.profile_embeddings;
create policy profile_embeddings_service_all
  on public.profile_embeddings
  for all
  to service_role
  using (true)
  with check (true);

-- Keep updated_at fresh
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_profile_embeddings_set_updated_at on public.profile_embeddings';
    execute 'create trigger trg_profile_embeddings_set_updated_at before update on public.profile_embeddings for each row execute function public.set_updated_at()';
  end if;
end
$$;

-- Optional: Create a table to store scoring configuration for A/B testing
-- Note: This table is reserved for future use. Current implementation uses
-- hardcoded weights in the scoring functions for simplicity and performance.
-- Future enhancement: Implement dynamic weight loading from this table.
create table if not exists public.scoring_config (
  id uuid primary key default gen_random_uuid(),
  config_name text not null unique,
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
  is_active boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS for scoring_config
alter table public.scoring_config enable row level security;

-- Anyone authenticated can read scoring configs
drop policy if exists scoring_config_select_all on public.scoring_config;
create policy scoring_config_select_all
  on public.scoring_config
  for select
  to authenticated
  using (true);

-- Only service role can modify configs
drop policy if exists scoring_config_service_all on public.scoring_config;
create policy scoring_config_service_all
  on public.scoring_config
  for all
  to service_role
  using (true)
  with check (true);

-- Insert default scoring configuration
insert into public.scoring_config (config_name, weights, is_active, description)
values (
  'default_v1',
  '{
    "travelTime": 20,
    "roleCompat": 15,
    "kinkOverlap": 15,
    "intent": 12,
    "semantic": 12,
    "lifestyle": 10,
    "activity": 8,
    "completeness": 8
  }'::jsonb,
  true,
  'Initial scoring weights for match probability calculation'
)
on conflict (config_name) do nothing;
