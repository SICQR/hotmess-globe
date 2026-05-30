-- hotmess-globe: create missing tables referenced by the repo (Base44 entities + pages)

create extension if not exists pgcrypto;

-- Compatibility views for legacy naming / Base44 drift (read-only)
-- NOTE: we keep the canonical writable tables as quoted Base44 tables ("User", "Beacon", "EventRSVP").
create or replace view public.users as
  select * from public."User";

create or replace view public.beacons as
  select * from public."Beacon";

create or replace view public.event_rsvps as
  select
    id,
    event_id,
    user_email,
    created_date as created_at,
    created_date as updated_at,
    created_date,
    created_date as updated_date
  from public."EventRSVP";

-- Cities (used by Globe/Leaderboard)
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision,
  lng double precision,
  country_code text,
  tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create unique index if not exists uniq_cities_name on public.cities (name);

alter table public.cities enable row level security;

drop policy if exists cities_select_public on public.cities;
create policy cities_select_public
  on public.cities
  for select
  to anon, authenticated
  using (true);

-- User intents (Connect/Globe overlays)
create table if not exists public.user_intents (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  title text,
  details text,
  visible boolean not null default true,
  city text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_user_intents_user_email on public.user_intents (user_email);
create index if not exists idx_user_intents_visible on public.user_intents (visible);

alter table public.user_intents enable row level security;

drop policy if exists user_intents_select_visible_or_self on public.user_intents;
create policy user_intents_select_visible_or_self
  on public.user_intents
  for select
  to authenticated
  using (visible = true or (auth.jwt() ->> 'email') = user_email);

drop policy if exists user_intents_insert_self on public.user_intents;
create policy user_intents_insert_self
  on public.user_intents
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists user_intents_update_self on public.user_intents;
create policy user_intents_update_self
  on public.user_intents
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

-- Audio metadata (SoundCloud/admin tools)
create table if not exists public.audio_metadata (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  title text,
  artist text,
  soundcloud_track_id text,
  soundcloud_url text,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_audio_metadata_user_email on public.audio_metadata (user_email);

alter table public.audio_metadata enable row level security;

drop policy if exists audio_metadata_select_authenticated on public.audio_metadata;
create policy audio_metadata_select_authenticated
  on public.audio_metadata
  for select
  to authenticated
  using (true);

-- Sweat coins
create table if not exists public.sweat_coins (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  amount integer not null,
  transaction_type text,
  reference_id text,
  reference_type text,
  metadata jsonb not null default '{}'::jsonb,
  balance_after integer,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_sweat_coins_user_email on public.sweat_coins (user_email);

alter table public.sweat_coins enable row level security;

drop policy if exists sweat_coins_select_self on public.sweat_coins;
create policy sweat_coins_select_self
  on public.sweat_coins
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists sweat_coins_insert_self on public.sweat_coins;
create policy sweat_coins_insert_self
  on public.sweat_coins
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- Beacon check-ins
create table if not exists public.beacon_checkins (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  beacon_id uuid references public."Beacon"(id) on delete set null,
  beacon_title text,
  photo_url text,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_beacon_checkins_user_email on public.beacon_checkins (user_email);
create index if not exists idx_beacon_checkins_beacon_id on public.beacon_checkins (beacon_id);

alter table public.beacon_checkins enable row level security;

drop policy if exists beacon_checkins_select_authenticated on public.beacon_checkins;
create policy beacon_checkins_select_authenticated
  on public.beacon_checkins
  for select
  to authenticated
  using (true);

drop policy if exists beacon_checkins_insert_self on public.beacon_checkins;
create policy beacon_checkins_insert_self
  on public.beacon_checkins
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- Friendships
create table if not exists public.user_friendships (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  friend_email text not null,
  status text not null default 'pending',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique(user_email, friend_email)
);
create index if not exists idx_user_friendships_user_email on public.user_friendships (user_email);
create index if not exists idx_user_friendships_friend_email on public.user_friendships (friend_email);

alter table public.user_friendships enable row level security;

drop policy if exists user_friendships_select_party on public.user_friendships;
create policy user_friendships_select_party
  on public.user_friendships
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email or (auth.jwt() ->> 'email') = friend_email);

drop policy if exists user_friendships_insert_self on public.user_friendships;
create policy user_friendships_insert_self
  on public.user_friendships
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists user_friendships_update_party on public.user_friendships;
create policy user_friendships_update_party
  on public.user_friendships
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email or (auth.jwt() ->> 'email') = friend_email)
  with check ((auth.jwt() ->> 'email') = user_email or (auth.jwt() ->> 'email') = friend_email);

-- Highlights
create table if not exists public.user_highlights (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  item_type text not null,
  item_id uuid not null,
  note text,
  "order" integer,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_user_highlights_user_email on public.user_highlights (user_email);

alter table public.user_highlights enable row level security;

drop policy if exists user_highlights_select_authenticated on public.user_highlights;
create policy user_highlights_select_authenticated
  on public.user_highlights
  for select
  to authenticated
  using (true);

drop policy if exists user_highlights_write_self on public.user_highlights;
create policy user_highlights_write_self
  on public.user_highlights
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

-- Profile views
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_email text not null,
  viewed_email text not null,
  viewed_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_profile_views_viewer on public.profile_views (viewer_email);
create index if not exists idx_profile_views_viewed on public.profile_views (viewed_email);

alter table public.profile_views enable row level security;

drop policy if exists profile_views_select_party on public.profile_views;
create policy profile_views_select_party
  on public.profile_views
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = viewer_email or (auth.jwt() ->> 'email') = viewed_email);

drop policy if exists profile_views_insert_self on public.profile_views;
create policy profile_views_insert_self
  on public.profile_views
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = viewer_email);

-- Blocks
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_email text not null,
  blocked_email text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique(blocker_email, blocked_email)
);
create index if not exists idx_user_blocks_blocker on public.user_blocks (blocker_email);
create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_email);

alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select_self on public.user_blocks;
create policy user_blocks_select_self
  on public.user_blocks
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = blocker_email);

drop policy if exists user_blocks_write_self on public.user_blocks;
create policy user_blocks_write_self
  on public.user_blocks
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = blocker_email)
  with check ((auth.jwt() ->> 'email') = blocker_email);

-- Beacon comments
create table if not exists public.beacon_comments (
  id uuid primary key default gen_random_uuid(),
  beacon_id uuid references public."Beacon"(id) on delete cascade,
  user_email text not null,
  content text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_beacon_comments_beacon_id on public.beacon_comments (beacon_id);

alter table public.beacon_comments enable row level security;

drop policy if exists beacon_comments_select_authenticated on public.beacon_comments;
create policy beacon_comments_select_authenticated
  on public.beacon_comments
  for select
  to authenticated
  using (true);

drop policy if exists beacon_comments_insert_authenticated on public.beacon_comments;
create policy beacon_comments_insert_authenticated
  on public.beacon_comments
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- Challenges
create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  challenge_type text not null,
  title text not null,
  description text,
  target_value integer not null,
  reward_xp integer not null,
  difficulty text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_daily_challenges_date on public.daily_challenges (challenge_date);

alter table public.daily_challenges enable row level security;

drop policy if exists daily_challenges_select_authenticated on public.daily_challenges;
create policy daily_challenges_select_authenticated
  on public.daily_challenges
  for select
  to authenticated
  using (true);

create table if not exists public.challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  challenge_id uuid references public.daily_challenges(id) on delete set null,
  challenge_date date not null,
  completed_at timestamptz not null default now(),
  xp_earned integer not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_challenge_completions_user_email on public.challenge_completions (user_email);
create index if not exists idx_challenge_completions_date on public.challenge_completions (challenge_date);

alter table public.challenge_completions enable row level security;

drop policy if exists challenge_completions_select_self on public.challenge_completions;
create policy challenge_completions_select_self
  on public.challenge_completions
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists challenge_completions_insert_self on public.challenge_completions;
create policy challenge_completions_insert_self
  on public.challenge_completions
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- User streaks
create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  streak_type text not null,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_user_streaks_user_email on public.user_streaks (user_email);
create unique index if not exists uniq_user_streaks_user_type on public.user_streaks (user_email, streak_type);

alter table public.user_streaks enable row level security;

drop policy if exists user_streaks_select_self on public.user_streaks;
create policy user_streaks_select_self
  on public.user_streaks
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists user_streaks_write_self on public.user_streaks;
create policy user_streaks_write_self
  on public.user_streaks
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

-- Community posts + likes + comments
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_name text,
  content text,
  category text,
  tags text[] not null default '{}'::text[],
  image_url text,
  video_url text,
  metadata jsonb not null default '{}'::jsonb,
  moderation_status text not null default 'approved',
  moderation_reason text,
  ai_sentiment text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  expires_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_community_posts_created_date on public.community_posts (created_date);
create index if not exists idx_community_posts_moderation on public.community_posts (moderation_status);

alter table public.community_posts enable row level security;

drop policy if exists community_posts_select_authenticated on public.community_posts;
create policy community_posts_select_authenticated
  on public.community_posts
  for select
  to authenticated
  using (true);

drop policy if exists community_posts_insert_self on public.community_posts;
create policy community_posts_insert_self
  on public.community_posts
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists community_posts_update_self on public.community_posts;
create policy community_posts_update_self
  on public.community_posts
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists community_posts_delete_self on public.community_posts;
create policy community_posts_delete_self
  on public.community_posts
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  post_id uuid references public.community_posts(id) on delete cascade,
  created_by text,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  unique(user_email, post_id)
);
create index if not exists idx_post_likes_post_id on public.post_likes (post_id);

alter table public.post_likes enable row level security;

drop policy if exists post_likes_select_authenticated on public.post_likes;
create policy post_likes_select_authenticated
  on public.post_likes
  for select
  to authenticated
  using (true);

drop policy if exists post_likes_write_self on public.post_likes;
create policy post_likes_write_self
  on public.post_likes
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade,
  user_email text not null,
  content text not null,
  created_by text,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now()
);
create index if not exists idx_post_comments_post_id on public.post_comments (post_id);

alter table public.post_comments enable row level security;

drop policy if exists post_comments_select_authenticated on public.post_comments;
create policy post_comments_select_authenticated
  on public.post_comments
  for select
  to authenticated
  using (true);

drop policy if exists post_comments_insert_self on public.post_comments;
create policy post_comments_insert_self
  on public.post_comments
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

drop policy if exists post_comments_delete_self on public.post_comments;
create policy post_comments_delete_self
  on public.post_comments
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

-- Bookmarks / favorites
create table if not exists public.beacon_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  beacon_id uuid references public."Beacon"(id) on delete cascade,
  created_by text,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  unique(user_email, beacon_id)
);

alter table public.beacon_bookmarks enable row level security;

drop policy if exists beacon_bookmarks_select_self on public.beacon_bookmarks;
create policy beacon_bookmarks_select_self
  on public.beacon_bookmarks
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists beacon_bookmarks_write_self on public.beacon_bookmarks;
create policy beacon_bookmarks_write_self
  on public.beacon_bookmarks
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

create table if not exists public.product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  product_id uuid references public.products(id) on delete cascade,
  created_by text,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  unique(user_email, product_id)
);

alter table public.product_favorites enable row level security;

drop policy if exists product_favorites_select_self on public.product_favorites;
create policy product_favorites_select_self
  on public.product_favorites
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists product_favorites_write_self on public.product_favorites;
create policy product_favorites_write_self
  on public.product_favorites
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

-- Reviews (product reviews)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  reviewer_email text not null,
  seller_email text,
  rating integer not null default 5,
  comment text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_reviews_product_id on public.reviews (product_id);
create index if not exists idx_reviews_seller_email on public.reviews (seller_email);

alter table public.reviews enable row level security;

drop policy if exists reviews_select_authenticated on public.reviews;
create policy reviews_select_authenticated
  on public.reviews
  for select
  to authenticated
  using (true);

drop policy if exists reviews_insert_self on public.reviews;
create policy reviews_insert_self
  on public.reviews
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = reviewer_email);

-- Marketplace reviews (order-based)
create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  reviewer_email text not null,
  reviewed_user_email text not null,
  review_type text not null default 'buyer_to_seller',
  rating integer not null default 5,
  comment text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_marketplace_reviews_reviewed on public.marketplace_reviews (reviewed_user_email);

alter table public.marketplace_reviews enable row level security;

drop policy if exists marketplace_reviews_select_authenticated on public.marketplace_reviews;
create policy marketplace_reviews_select_authenticated
  on public.marketplace_reviews
  for select
  to authenticated
  using (true);

drop policy if exists marketplace_reviews_insert_self on public.marketplace_reviews;
create policy marketplace_reviews_insert_self
  on public.marketplace_reviews
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = reviewer_email);

-- Product views / event views (analytics)
create table if not exists public.product_views (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  product_id uuid references public.products(id) on delete cascade,
  product_name text,
  product_category text,
  product_tags text[] not null default '{}'::text[],
  created_by text,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now()
);
create index if not exists idx_product_views_user_email on public.product_views (user_email);

alter table public.product_views enable row level security;

drop policy if exists product_views_select_self on public.product_views;
create policy product_views_select_self
  on public.product_views
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists product_views_insert_self on public.product_views;
create policy product_views_insert_self
  on public.product_views
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

create table if not exists public.event_views (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  event_id uuid references public."Beacon"(id) on delete cascade,
  event_title text,
  event_city text,
  created_by text,
  created_at timestamptz not null default now(),
  created_date timestamptz not null default now()
);
create index if not exists idx_event_views_user_email on public.event_views (user_email);

alter table public.event_views enable row level security;

drop policy if exists event_views_select_self on public.event_views;
create policy event_views_select_self
  on public.event_views
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists event_views_insert_self on public.event_views;
create policy event_views_insert_self
  on public.event_views
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- Venue kings
create table if not exists public.venue_kings (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null,
  venue_name text,
  king_email text not null,
  king_name text,
  scan_count integer not null default 0,
  total_tax_collected integer not null default 0,
  expires_at timestamptz,
  war_active boolean not null default false,
  war_started_at timestamptz,
  war_started_by text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_venue_kings_venue_id on public.venue_kings (venue_id);
create index if not exists idx_venue_kings_expires_at on public.venue_kings (expires_at);

alter table public.venue_kings enable row level security;

drop policy if exists venue_kings_select_authenticated on public.venue_kings;
create policy venue_kings_select_authenticated
  on public.venue_kings
  for select
  to authenticated
  using (true);

drop policy if exists venue_kings_update_authenticated on public.venue_kings;
create policy venue_kings_update_authenticated
  on public.venue_kings
  for update
  to authenticated
  using (true)
  with check (true);

-- Seller ratings (aggregates)
create table if not exists public.seller_ratings (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null,
  average_rating numeric,
  total_reviews integer not null default 0,
  rating_breakdown jsonb not null default '{}'::jsonb,
  response_rate numeric,
  avg_response_time_hours numeric,
  on_time_delivery_rate numeric,
  total_sales integer,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create unique index if not exists uniq_seller_ratings_seller_email on public.seller_ratings (seller_email);

alter table public.seller_ratings enable row level security;

drop policy if exists seller_ratings_select_authenticated on public.seller_ratings;
create policy seller_ratings_select_authenticated
  on public.seller_ratings
  for select
  to authenticated
  using (true);

-- Safety (trusted contacts + check-ins)
create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  contact_name text,
  contact_email text,
  notify_on_sos boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_trusted_contacts_user_email on public.trusted_contacts (user_email);

alter table public.trusted_contacts enable row level security;

drop policy if exists trusted_contacts_select_self on public.trusted_contacts;
create policy trusted_contacts_select_self
  on public.trusted_contacts
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists trusted_contacts_write_self on public.trusted_contacts;
create policy trusted_contacts_write_self
  on public.trusted_contacts
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email)
  with check ((auth.jwt() ->> 'email') = user_email);

create table if not exists public.safety_checkins (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  check_in_time timestamptz,
  expected_check_out timestamptz,
  location jsonb,
  status text,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_safety_checkins_user_email on public.safety_checkins (user_email);

alter table public.safety_checkins enable row level security;

drop policy if exists safety_checkins_select_self on public.safety_checkins;
create policy safety_checkins_select_self
  on public.safety_checkins
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email);

drop policy if exists safety_checkins_insert_self on public.safety_checkins;
create policy safety_checkins_insert_self
  on public.safety_checkins
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = user_email);

-- Notification outbox (for admin alerts / async sending)
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  notification_type text not null,
  title text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  send_at timestamptz,
  sent_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);
create index if not exists idx_notification_outbox_user_email on public.notification_outbox (user_email);

alter table public.notification_outbox enable row level security;

drop policy if exists notification_outbox_select_self_or_admin on public.notification_outbox;
create policy notification_outbox_select_self_or_admin
  on public.notification_outbox
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = user_email or user_email = 'admin');

drop policy if exists notification_outbox_insert_authenticated on public.notification_outbox;
create policy notification_outbox_insert_authenticated
  on public.notification_outbox
  for insert
  to authenticated
  with check (user_email = (auth.jwt() ->> 'email') or user_email = 'admin');

-- updated_at / updated_date triggers
-- Only attach triggers if the helper exists.
do $$
begin
  if to_regprocedure('public.set_updated_timestamps()') is not null then
    execute 'drop trigger if exists trg_cities_set_updated_timestamps on public.cities';
    execute 'create trigger trg_cities_set_updated_timestamps before update on public.cities for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_user_intents_set_updated_timestamps on public.user_intents';
    execute 'create trigger trg_user_intents_set_updated_timestamps before update on public.user_intents for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_audio_metadata_set_updated_timestamps on public.audio_metadata';
    execute 'create trigger trg_audio_metadata_set_updated_timestamps before update on public.audio_metadata for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_sweat_coins_set_updated_timestamps on public.sweat_coins';
    execute 'create trigger trg_sweat_coins_set_updated_timestamps before update on public.sweat_coins for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_beacon_checkins_set_updated_timestamps on public.beacon_checkins';
    execute 'create trigger trg_beacon_checkins_set_updated_timestamps before update on public.beacon_checkins for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_user_friendships_set_updated_timestamps on public.user_friendships';
    execute 'create trigger trg_user_friendships_set_updated_timestamps before update on public.user_friendships for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_user_highlights_set_updated_timestamps on public.user_highlights';
    execute 'create trigger trg_user_highlights_set_updated_timestamps before update on public.user_highlights for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_profile_views_set_updated_timestamps on public.profile_views';
    execute 'create trigger trg_profile_views_set_updated_timestamps before update on public.profile_views for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_user_blocks_set_updated_timestamps on public.user_blocks';
    execute 'create trigger trg_user_blocks_set_updated_timestamps before update on public.user_blocks for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_beacon_comments_set_updated_timestamps on public.beacon_comments';
    execute 'create trigger trg_beacon_comments_set_updated_timestamps before update on public.beacon_comments for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_daily_challenges_set_updated_timestamps on public.daily_challenges';
    execute 'create trigger trg_daily_challenges_set_updated_timestamps before update on public.daily_challenges for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_challenge_completions_set_updated_timestamps on public.challenge_completions';
    execute 'create trigger trg_challenge_completions_set_updated_timestamps before update on public.challenge_completions for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_user_streaks_set_updated_timestamps on public.user_streaks';
    execute 'create trigger trg_user_streaks_set_updated_timestamps before update on public.user_streaks for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_community_posts_set_updated_timestamps on public.community_posts';
    execute 'create trigger trg_community_posts_set_updated_timestamps before update on public.community_posts for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_reviews_set_updated_timestamps on public.reviews';
    execute 'create trigger trg_reviews_set_updated_timestamps before update on public.reviews for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_marketplace_reviews_set_updated_timestamps on public.marketplace_reviews';
    execute 'create trigger trg_marketplace_reviews_set_updated_timestamps before update on public.marketplace_reviews for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_venue_kings_set_updated_timestamps on public.venue_kings';
    execute 'create trigger trg_venue_kings_set_updated_timestamps before update on public.venue_kings for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_seller_ratings_set_updated_timestamps on public.seller_ratings';
    execute 'create trigger trg_seller_ratings_set_updated_timestamps before update on public.seller_ratings for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_trusted_contacts_set_updated_timestamps on public.trusted_contacts';
    execute 'create trigger trg_trusted_contacts_set_updated_timestamps before update on public.trusted_contacts for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_safety_checkins_set_updated_timestamps on public.safety_checkins';
    execute 'create trigger trg_safety_checkins_set_updated_timestamps before update on public.safety_checkins for each row execute function public.set_updated_timestamps()';

    execute 'drop trigger if exists trg_notification_outbox_set_updated_timestamps on public.notification_outbox';
    execute 'create trigger trg_notification_outbox_set_updated_timestamps before update on public.notification_outbox for each row execute function public.set_updated_timestamps()';
  end if;
end
$$;
