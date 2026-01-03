-- HOTMESS Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  xp INTEGER DEFAULT 0,
  city TEXT,
  bio TEXT,
  profile_type TEXT DEFAULT 'standard' CHECK (profile_type IN ('standard', 'seller', 'organizer')),
  consent_accepted BOOLEAN DEFAULT false,
  has_agreed_terms BOOLEAN DEFAULT false,
  has_consented_data BOOLEAN DEFAULT false,
  has_consented_gps BOOLEAN DEFAULT false,
  membership_tier TEXT DEFAULT 'basic',
  social_links JSONB,
  event_preferences TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beacons
CREATE TABLE public.beacons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('event', 'venue', 'hookup', 'drop', 'popup', 'private')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  city TEXT,
  intensity DOUBLE PRECISION CHECK (intensity BETWEEN 0 AND 1),
  xp_scan INTEGER,
  mode TEXT CHECK (mode IN ('hookup', 'crowd', 'drop', 'ticket', 'radio', 'care')),
  sponsored BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  event_date TIMESTAMPTZ,
  image_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  capacity INTEGER,
  ticket_url TEXT,
  ticket_price_xp INTEGER,
  ticket_price_gbp DOUBLE PRECISION,
  tickets_available INTEGER,
  tickets_sold INTEGER DEFAULT 0,
  venue_name TEXT,
  is_shadow BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  audio_url TEXT,
  track_id TEXT,
  product_id TEXT,
  purchase_amount DOUBLE PRECISION,
  expires_at TIMESTAMPTZ,
  organizer_email TEXT,
  event_tags TEXT[],
  vibe_intensity INTEGER CHECK (vibe_intensity BETWEEN 0 AND 100),
  recommended_archetypes TEXT[],
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_xp INTEGER NOT NULL,
  price_gbp DOUBLE PRECISION,
  price_sweat INTEGER,
  seller_email TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('physical', 'digital', 'service', 'ticket', 'badge', 'merch')),
  category TEXT,
  tags TEXT[],
  image_urls TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold_out', 'archived')),
  inventory_count INTEGER DEFAULT 0,
  min_xp_level INTEGER,
  details JSONB,
  sales_count INTEGER DEFAULT 0,
  average_rating DOUBLE PRECISION,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_email TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  total_xp INTEGER NOT NULL,
  total_gbp DOUBLE PRECISION,
  total_sweat INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'escrow', 'awaiting_pickup', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('xp', 'sweat', 'stripe')),
  stripe_charge_id TEXT,
  shipping_address JSONB,
  tracking_number TEXT,
  notes TEXT,
  is_qr_scanned BOOLEAN DEFAULT false,
  qr_scanned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP Ledger
CREATE TABLE public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('scan', 'purchase', 'listen', 'level_up', 'tax_paid', 'tax_received', 'war_trigger', 'challenge_complete', 'handshake', 'check_in')),
  reference_id TEXT,
  reference_type TEXT,
  metadata JSONB,
  balance_after INTEGER,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sweat Coins
CREATE TABLE public.sweat_coins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'scan', 'king_tax', 'boost_purchase', 'flare_purchase', 'market_drop', 'war_bonus', 'payout', 'referral')),
  reference_id TEXT,
  reference_type TEXT,
  metadata JSONB,
  balance_after INTEGER,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beacon Check-ins
CREATE TABLE public.beacon_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  beacon_id UUID REFERENCES beacons(id),
  beacon_title TEXT,
  photo_url TEXT,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  achievement_id UUID,
  unlocked_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  xp_required INTEGER,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Friendships
CREATE TABLE public.user_friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  friend_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, friend_email)
);

-- User Follows
CREATE TABLE public.user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_email TEXT NOT NULL,
  following_email TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_email, following_email)
);

-- Right Now Status
CREATE TABLE public.right_now_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('host', 'travel', 'hotel', 'explore')),
  timeframe TEXT NOT NULL,
  location JSONB,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  preferences JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event RSVPs
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  event_id UUID REFERENCES beacons(id),
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  ticket_qr TEXT,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, event_id)
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL,
  sender_email TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[],
  read BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Threads
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_emails TEXT[] NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squads
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  interest TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squad Members
CREATE TABLE public.squad_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, user_email)
);

-- User Highlights
CREATE TABLE public.user_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('checkin', 'squad', 'achievement')),
  item_id UUID NOT NULL,
  note TEXT,
  "order" INTEGER,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile Views
CREATE TABLE public.profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_email TEXT NOT NULL,
  viewed_email TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot Sessions (Handshakes)
CREATE TABLE public.bot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiator_email TEXT NOT NULL,
  target_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  telegram_chat_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Vibes
CREATE TABLE public.user_vibes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL UNIQUE,
  vibe_title TEXT,
  vibe_description TEXT,
  vibe_color TEXT,
  archetype TEXT CHECK (archetype IN ('architect', 'hunter', 'collector', 'explorer', 'socialite', 'merchant', 'guardian', 'alchemist')),
  traits TEXT[],
  sweat_history JSONB,
  last_synthesized TIMESTAMPTZ,
  synthesis_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  read BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_email TEXT NOT NULL,
  reported_item_type TEXT NOT NULL,
  reported_item_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Blocks
CREATE TABLE public.user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_email TEXT NOT NULL,
  blocked_email TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_email, blocked_email)
);

-- Beacon Comments
CREATE TABLE public.beacon_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beacon_id UUID REFERENCES beacons(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Challenges
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_date DATE NOT NULL,
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  reward_xp INTEGER NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge Completions
CREATE TABLE public.challenge_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  challenge_id UUID REFERENCES daily_challenges(id),
  challenge_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  xp_earned INTEGER NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (adjust based on your needs)

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Everyone can read published beacons
CREATE POLICY "Anyone can read published beacons" ON public.beacons
  FOR SELECT USING (status = 'published' AND active = true);

-- Users can create beacons
CREATE POLICY "Users can create beacons" ON public.beacons
  FOR INSERT WITH CHECK (auth.email() = created_by);

-- Everyone can read active products
CREATE POLICY "Anyone can read active products" ON public.products
  FOR SELECT USING (status = 'active');

-- Sellers can manage their products
CREATE POLICY "Sellers can manage own products" ON public.products
  FOR ALL USING (auth.email() = seller_email);

-- Users can read their own orders
CREATE POLICY "Users can read own orders" ON public.orders
  FOR SELECT USING (auth.email() IN (buyer_email, seller_email));

-- Create indexes for performance
CREATE INDEX idx_beacons_city ON beacons(city);
CREATE INDEX idx_beacons_kind ON beacons(kind);
CREATE INDEX idx_beacons_event_date ON beacons(event_date);
CREATE INDEX idx_products_seller ON products(seller_email);
CREATE INDEX idx_orders_buyer ON orders(buyer_email);
CREATE INDEX idx_orders_seller ON orders(seller_email);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_xp_ledger_user ON xp_ledger(user_email);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_email);
CREATE INDEX idx_user_follows_following ON user_follows(following_email);