-- ================================================================
-- HOTMESS BASELINE SCHEMA
-- Generated 2026-06-15 from live prod schema (rfoftonnlwudilafhfkl)
--
-- PURPOSE: Provide foundation tables so the 19 tracked migrations
-- (20260421000000 – 20260502051157) can replay cleanly on a fresh
-- Supabase branch DB.
--
-- SAFETY: All statements are idempotent (IF NOT EXISTS / OR REPLACE).
-- This file is pre-registered in schema_migrations on prod so it
-- will never be re-applied to production.
-- ================================================================

-- Extensions required by this schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── ENUMS ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.consent_action AS ENUM ('granted', 'revoked', 'updated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_category AS ENUM ('location', 'cookies');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_rating AS ENUM ('sfw', 'nsfw', 'adult');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.right_now_intent AS ENUM ('hookup', 'crowd', 'drop', 'ticket', 'radio', 'care');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.right_now_room_mode AS ENUM ('solo', 'host');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CORE TABLES ──────────────────────────────────────────────────

-- profiles (core user record — referenced by almost everything)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                          uuid            NOT NULL,
  role                        text            NOT NULL DEFAULT 'user',
  created_at                  timestamptz     NOT NULL DEFAULT now(),
  updated_at                  timestamptz     NOT NULL DEFAULT now(),
  email                       text,
  display_name                text,
  avatar_url                  text,
  username                    text,
  bio                         text,
  city                        text,
  gender                      text,
  age                         int4,
  looking_for                 text[],
  position                    text,
  tags                        text[]          DEFAULT '{}'::text[],
  is_online                   bool            DEFAULT false,
  is_verified                 bool            DEFAULT false,
  is_admin                    bool            DEFAULT false,
  is_visible                  bool            DEFAULT true,
  is_demo                     bool            NOT NULL DEFAULT false,
  is_business                 bool            DEFAULT false,
  is_organizer                bool            DEFAULT false,
  business_type               text,
  business_name               text,
  business_description        text,
  website_url                 text,
  onboarding_completed        bool            NOT NULL DEFAULT false,
  onboarding_completed_at     timestamptz,
  onboarding_stage            text            DEFAULT 'start',
  consent_accepted            bool            DEFAULT false,
  has_agreed_terms            bool            DEFAULT false,
  has_consented_data          bool            DEFAULT false,
  has_consented_gps           bool            DEFAULT false,
  safety_opt_in               bool            NOT NULL DEFAULT false,
  age_verified                bool            DEFAULT false,
  age_verified_at             timestamptz,
  age_verification_method     text,
  community_attested_at       timestamptz,
  avatar_type                 text            DEFAULT 'photo',
  avatar_scan_status          text            DEFAULT 'pending',
  avatar_scan_at              timestamptz,
  auth_method                 text,
  persona_type                text,
  active_persona_id           text            DEFAULT 'hooky',
  referral_code               text,
  telegram_id                 text,
  telegram_username           text,
  telegram_chat_id            int8,
  telegram_link_token         text,
  notification_channel        text            DEFAULT 'none',
  pin_code_hash               text,
  public_attributes           jsonb           DEFAULT '{}'::jsonb,
  cookie_preferences          jsonb           NOT NULL DEFAULT '{}'::jsonb,
  backup_contacts             jsonb           NOT NULL DEFAULT '[]'::jsonb,
  lifestyle_preferences       jsonb,
  support_preferences         jsonb           DEFAULT '{"support_detail_level":"generic","support_notifications_enabled":false}'::jsonb,
  location                    public.geography(Point, 4326),
  location_consent            bool            DEFAULT false,
  location_consent_at         timestamptz,
  location_consent_mode       text,
  location_consent_granted_at timestamptz,
  location_last_updated_at    timestamptz,
  location_area               text,
  location_precision          text            DEFAULT 'approximate',
  location_radius_km          int4            DEFAULT 5,
  location_name               text,
  globe_show_on_map           bool            DEFAULT false,
  last_seen                   timestamptz     DEFAULT now(),
  last_seen_at                timestamptz,
  last_loc_ts                 timestamptz,
  last_lat                    float8,
  last_lng                    float8,
  loc_accuracy_m              float8,
  show_distance               bool            DEFAULT true,
  show_online_status          bool            DEFAULT true,
  allow_messages_from         text            DEFAULT 'everyone',
  read_receipts               bool            DEFAULT true,
  auth_user_id                uuid,
  profile_type                text            DEFAULT 'standard',
  membership_tier             text,
  subscription_tier           text            DEFAULT 'FREE',
  stripe_subscription_id      text,
  subscription_status         text,
  subscription_ends_at        timestamptz,
  verification_level          text            DEFAULT 'none',
  verified_at                 timestamptz,
  full_name                   text,
  phone                       text,
  founding_status             text,
  locked_username             bool            NOT NULL DEFAULT false,
  username_locked_at          timestamptz,
  founding_member_waitlist_id uuid,
  beta_access_until           timestamptz,
  is_beta_cohort_override     bool            NOT NULL DEFAULT false,
  visibility_state            text            NOT NULL DEFAULT 'visible',
  consent_push_intent         bool            DEFAULT false,
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- blocks
CREATE TABLE IF NOT EXISTS public.blocks (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid        NOT NULL,
  blocked_id uuid        NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- chat_threads
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id                 uuid        DEFAULT gen_random_uuid(),
  participant_emails text[],
  thread_type        text,
  active             bool,
  metadata           jsonb,
  unread_count       jsonb,
  last_message       text,
  last_message_at    timestamptz,
  created_at         timestamptz,
  updated_at         timestamptz,
  muted_by           text[]
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id           uuid        DEFAULT gen_random_uuid(),
  thread_id    uuid,
  sender_email text,
  content      text,
  message_type text,
  read_by      text[],
  media_urls   text[],
  created_at   timestamptz,
  created_date timestamptz,
  metadata     jsonb       DEFAULT '{}'::jsonb
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- globe_events
CREATE TABLE IF NOT EXISTS public.globe_events (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  lat         numeric     NOT NULL,
  lng         numeric     NOT NULL,
  city_slug   text,
  intensity   numeric     DEFAULT 1,
  color       text        DEFAULT '#C8962C',
  pulse_type  text        DEFAULT 'standard',
  duration_ms int4        DEFAULT 3000,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT (now() + interval '30 seconds'),
  PRIMARY KEY (id)
);

ALTER TABLE public.globe_events ENABLE ROW LEVEL SECURITY;

-- location_shares
CREATE TABLE IF NOT EXISTS public.location_shares (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL,
  current_lat     float8,
  current_lng     float8,
  destination_lat float8,
  destination_lng float8,
  active          bool        NOT NULL DEFAULT true,
  end_time        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

-- market_listings
CREATE TABLE IF NOT EXISTS public.market_listings (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  seller_id           uuid        NOT NULL,
  title               text        NOT NULL,
  slug                text,
  description         text,
  price_pence         int4        NOT NULL,
  quantity_available  int4        NOT NULL DEFAULT 0,
  category            text,
  status              text        NOT NULL DEFAULT 'draft',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  brand               text,
  listing_type        text        DEFAULT 'product',
  condition           text,
  size                text,
  colour              text,
  tags                text[]      DEFAULT '{}'::text[],
  featured            bool        DEFAULT false,
  featured_until      timestamptz,
  beacon_id           uuid,
  views               int4        DEFAULT 0,
  saves               int4        DEFAULT 0,
  purchases_count     int4        DEFAULT 0,
  price               numeric,
  delivery_type       text        DEFAULT 'both',
  open_to_offers      bool        DEFAULT false,
  pickup_notes        text,
  shipping_notes      text,
  cover_image_url     text,
  item_condition      text,
  quantity            int4        DEFAULT 1,
  next_drop_window_at timestamptz,
  PRIMARY KEY (id)
);

ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid,
  type       text,
  payload    jsonb,
  read       bool        DEFAULT false,
  created_at timestamptz DEFAULT now(),
  title      text,
  body       text,
  read_at    timestamptz,
  user_email text,
  link       text,
  metadata   jsonb       DEFAULT '{}'::jsonb,
  PRIMARY KEY (id)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- safety_events
CREATE TABLE IF NOT EXISTS public.safety_events (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL,
  type            text        NOT NULL,
  delivery_status text,
  created_at      timestamptz DEFAULT now(),
  metadata        jsonb       DEFAULT '{}'::jsonb,
  resolved_at     timestamptz,
  PRIMARY KEY (id)
);

ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

-- saved_items
CREATE TABLE IF NOT EXISTS public.saved_items (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  item_type  text        NOT NULL,
  item_id    text        NOT NULL,
  metadata   jsonb       DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

-- trusted_contacts
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id                          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL,
  user_email                  text,
  contact_name                text        NOT NULL,
  contact_email               text,
  contact_phone               text,
  notify_on_sos               bool        NOT NULL DEFAULT true,
  notify_on_checkout          bool        NOT NULL DEFAULT true,
  notify_on_checkin           bool        DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  relationship                text        DEFAULT 'friend',
  role                        text        NOT NULL DEFAULT 'trusted',
  contact_whatsapp            text,
  contact_telegram_handle     text,
  contact_telegram_chat_id    int8,
  preferred_channel           text,
  channels_enabled            jsonb       DEFAULT '{"sms":true,"email":false,"telegram":false,"whatsapp":false}'::jsonb,
  invitation_sent_at          timestamptz,
  acceptance_token            text,
  acceptance_token_expires_at timestamptz,
  accepted_at                 timestamptz,
  declined_at                 timestamptz,
  decline_reason              text,
  confirmed_phone             text,
  confirmed_telegram_handle   text,
  confirmed_telegram_chat_id  text,
  confirmed_whatsapp          text,
  confirmed_email             text,
  channel_preference_order    jsonb,
  quiet_hours                 jsonb,
  PRIMARY KEY (id)
);

ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

-- user_active_boosts
CREATE TABLE IF NOT EXISTS public.user_active_boosts (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id                  uuid,
  boost_key                text,
  purchased_at             timestamptz DEFAULT now(),
  expires_at               timestamptz,
  stripe_payment_intent_id text,
  uses_remaining           int4,
  PRIMARY KEY (id)
);

ALTER TABLE public.user_active_boosts ENABLE ROW LEVEL SECURITY;

-- user_presence
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id     uuid        NOT NULL,
  status      text        DEFAULT 'offline',
  last_seen_at timestamptz DEFAULT now(),
  location    public.geography(Point, 4326),
  metadata    jsonb       DEFAULT '{}'::jsonb,
  expires_at  timestamptz DEFAULT (now() + interval '10 minutes'),
  last_lat    float8,
  last_lng    float8,
  is_online   bool        DEFAULT true,
  PRIMARY KEY (user_id)
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- ── ADDITIONAL TABLES REFERENCED BY THE 19 MIGRATIONS ───────────

-- notification_outbox (referenced by multiple RPCs in later migrations)
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid,
  type          text,
  payload       jsonb       DEFAULT '{}'::jsonb,
  status        text        DEFAULT 'queued',
  created_at    timestamptz DEFAULT now(),
  processed_at  timestamptz,
  error_message text,
  PRIMARY KEY (id)
);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- stripe_events_log (referenced by resale matcher)
CREATE TABLE IF NOT EXISTS public.stripe_events_log (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_id     text        UNIQUE,
  event_type   text,
  payload      jsonb,
  processed_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.stripe_events_log ENABLE ROW LEVEL SECURITY;

-- ticket_orders (ticketing core)
CREATE TABLE IF NOT EXISTS public.ticket_orders (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id            uuid,
  pool_id            uuid,
  ticket_state       text        DEFAULT 'issued',
  price_paid         numeric,
  resale_price       numeric,
  resale_allowed     bool        DEFAULT true,
  qr_code            text,
  qr_expires_at      timestamptz,
  payment_ref        text,
  purchased_at       timestamptz DEFAULT now(),
  created_at         timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;

-- ticket_inventory_pools (ticketing core)
CREATE TABLE IF NOT EXISTS public.ticket_inventory_pools (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  beacon_id       uuid,
  pool_label      text,
  capacity        int4        DEFAULT 0,
  sold            int4        DEFAULT 0,
  price_pence     int4        DEFAULT 0,
  event_date      timestamptz,
  age_restricted  bool        DEFAULT true,
  resale_enabled  bool        DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.ticket_inventory_pools ENABLE ROW LEVEL SECURITY;

-- ticket_resale_queue (resale matching)
CREATE TABLE IF NOT EXISTS public.ticket_resale_queue (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  pool_id    uuid,
  user_id    uuid,
  status     text        DEFAULT 'waiting',
  created_at timestamptz DEFAULT now(),
  matched_at timestamptz,
  PRIMARY KEY (id)
);

ALTER TABLE public.ticket_resale_queue ENABLE ROW LEVEL SECURITY;

-- market_sellers (vendor dashboard)
CREATE TABLE IF NOT EXISTS public.market_sellers (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id           uuid,
  display_name      text,
  stripe_account_id text,
  payouts_enabled   bool        DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.market_sellers ENABLE ROW LEVEL SECURITY;

-- payouts (payout worker)
CREATE TABLE IF NOT EXISTS public.payouts (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  seller_id           uuid,
  amount_pence        int4,
  currency            text        DEFAULT 'gbp',
  status              text        DEFAULT 'pending',
  stripe_transfer_id  text,
  source_payment_ref  text,
  created_at          timestamptz DEFAULT now(),
  paid_at             timestamptz,
  PRIMARY KEY (id)
);
-- Partial unique index: idempotency guard — only enforced when ref is set
CREATE UNIQUE INDEX IF NOT EXISTS payouts_source_payment_ref_uniq
  ON public.payouts (source_payment_ref)
  WHERE source_payment_ref IS NOT NULL;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- memberships (referenced by get_platform_health and others)
CREATE TABLE IF NOT EXISTS public.memberships (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid,
  tier       text        DEFAULT 'mess',
  status     text        DEFAULT 'active',
  ends_at    timestamptz,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- beacons (core globe entity)
CREATE TABLE IF NOT EXISTS public.beacons (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  creator_id  uuid,
  type        text,
  title       text,
  body        text,
  lat         float8,
  lng         float8,
  location    public.geography(Point, 4326),
  city        text,
  ends_at     timestamptz,
  visibility  text        DEFAULT 'public',
  is_active   bool        DEFAULT true,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.beacons ENABLE ROW LEVEL SECURITY;

-- venues (referenced by meet_sessions and others)
CREATE TABLE IF NOT EXISTS public.venues (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  slug         text,
  lat          float8,
  lng          float8,
  location     public.geography(Point, 4326),
  city         text,
  category     text,
  is_active    bool        DEFAULT true,
  metadata     jsonb       DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- meet_sessions (v6 chunk 05, referenced by isolation_audit_log migration)
CREATE TABLE IF NOT EXISTS public.meet_sessions (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid,
  venue_id    uuid,
  started_at  timestamptz DEFAULT now(),
  ended_at    timestamptz,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.meet_sessions ENABLE ROW LEVEL SECURITY;
