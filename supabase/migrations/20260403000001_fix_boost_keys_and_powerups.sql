-- Fix boost key mismatches: frontend sends incognito_week / extra_beacon_drop / highlighted_message
-- but old RPC mapped incognito / extra_beacon / highlighted_msg.
-- Also correct durations to match Phil's final spec.

-- 1. Drop and recreate activate_user_boost with corrected keys
CREATE OR REPLACE FUNCTION public.activate_user_boost(
  p_user_id uuid,
  p_boost_key text,
  p_payment_intent_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration interval;
BEGIN
  -- Map boost keys to durations (Phil's FINAL spec)
  v_duration := CASE p_boost_key
    WHEN 'globe_glow'          THEN interval '24 hours'
    WHEN 'profile_bump'        THEN interval '3 hours'
    WHEN 'vibe_blast'          THEN interval '1 hour'
    WHEN 'incognito_week'      THEN interval '7 days'
    WHEN 'extra_beacon_drop'   THEN interval '24 hours'
    WHEN 'highlighted_message' THEN interval '24 hours'  -- single use, 24h window
    ELSE interval '24 hours'
  END;

  -- Upsert: if boost already active, extend from current expiry
  INSERT INTO public.user_active_boosts (user_id, boost_key, expires_at, payment_intent_id)
  VALUES (p_user_id, p_boost_key, now() + v_duration, p_payment_intent_id)
  ON CONFLICT (user_id, boost_key)
  DO UPDATE SET
    expires_at = GREATEST(user_active_boosts.expires_at, now()) + v_duration,
    payment_intent_id = COALESCE(p_payment_intent_id, user_active_boosts.payment_intent_id);
END;
$$;

-- 2. Create user_boost_types catalogue table
CREATE TABLE IF NOT EXISTS public.user_boost_types (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  duration_hours int,
  price_pence int NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.user_boost_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read boost types (public catalogue)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_boost_types' AND policyname = 'Anyone can read boost types'
  ) THEN
    CREATE POLICY "Anyone can read boost types" ON public.user_boost_types
      FOR SELECT USING (true);
  END IF;
END
$$;

-- 3. Seed with Phil's FINAL pricing
INSERT INTO public.user_boost_types (key, label, description, duration_hours, price_pence, sort_order)
VALUES
  ('highlighted_message', 'Highlighted Message', 'Make your first message impossible to miss.', NULL, 49, 1),
  ('vibe_blast', 'Vibe Blast', 'Send your tonight intention to everyone you''re connected to.', 1, 99, 2),
  ('extra_beacon_drop', 'Extra Beacon Drop', 'Drop one more beacon tonight, even if you''ve hit your limit.', 24, 149, 3),
  ('globe_glow', 'Globe Glow', 'Your presence pulses gold on the Globe. Seen first. Felt everywhere.', 24, 199, 4),
  ('incognito_week', 'Incognito Mode', 'Browse Ghosted without appearing in grids. You see. They don''t.', 168, 199, 5),
  ('profile_bump', 'Profile Bump', 'Jump to the top of Ghosted in your area. Stay visible while it matters.', 3, 299, 6)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  duration_hours = EXCLUDED.duration_hours,
  price_pence = EXCLUDED.price_pence,
  sort_order = EXCLUDED.sort_order;
