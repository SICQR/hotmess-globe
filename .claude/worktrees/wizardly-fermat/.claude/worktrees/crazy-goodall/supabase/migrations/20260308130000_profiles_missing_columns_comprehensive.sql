-- ============================================================
-- PROFILES: Add all columns referenced by frontend but missing from DB
-- Root cause: schema drifted as features were built without migrations
-- Fixes: profile save, privacy sheet, location sheet, photos on grid
-- ============================================================

-- ── Discovery / Location ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city                TEXT,
  ADD COLUMN IF NOT EXISTS location_precision  TEXT NOT NULL DEFAULT 'approximate'
    CHECK (location_precision IN ('exact', 'approximate', 'hidden')),
  ADD COLUMN IF NOT EXISTS discovery_radius    INTEGER NOT NULL DEFAULT 10;

-- Backfill city from location
UPDATE public.profiles SET city = location WHERE city IS NULL AND location IS NOT NULL;

-- ── Photos ───────────────────────────────────────────────────
-- Array of {url, caption, order, is_face, uploaded_at} objects
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: if avatar_url exists, seed photos array with it
UPDATE public.profiles
  SET photos = jsonb_build_array(
    jsonb_build_object('url', avatar_url, 'order', 0, 'is_face', true)
  )
  WHERE photos = '[]'::jsonb AND avatar_url IS NOT NULL;

-- ── Privacy / Messaging ──────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allow_messages_from  TEXT NOT NULL DEFAULT 'everyone'
    CHECK (allow_messages_from IN ('everyone', 'matches', 'nobody')),
  ADD COLUMN IF NOT EXISTS show_distance         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_online_status    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS read_receipts         BOOLEAN NOT NULL DEFAULT true;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles (city) WHERE city IS NOT NULL;

COMMENT ON COLUMN public.profiles.photos IS
  'Array of photo objects: [{url, caption, order, is_face, uploaded_at}]';
COMMENT ON COLUMN public.profiles.city IS
  'User-selected city name for display and filtering. Derived from location field.';
COMMENT ON COLUMN public.profiles.location_precision IS
  'How precisely to show user location: exact | approximate | hidden';
COMMENT ON COLUMN public.profiles.discovery_radius IS
  'User discovery radius in km (default 10).';
