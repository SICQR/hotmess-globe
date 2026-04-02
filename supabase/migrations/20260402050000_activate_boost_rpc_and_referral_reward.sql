-- 1. Create user_active_boosts table if not exists
CREATE TABLE IF NOT EXISTS public.user_active_boosts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boost_key text NOT NULL,
  expires_at timestamptz NOT NULL,
  payment_intent_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, boost_key)
);

ALTER TABLE public.user_active_boosts ENABLE ROW LEVEL SECURITY;

-- Users can read their own boosts
CREATE POLICY "Users read own boosts" ON public.user_active_boosts
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (called via RPC with security definer)
CREATE POLICY "Service insert boosts" ON public.user_active_boosts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update boosts" ON public.user_active_boosts
  FOR UPDATE USING (true);

-- 2. activate_user_boost RPC — called by Stripe webhook
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
  -- Map boost keys to durations
  v_duration := CASE p_boost_key
    WHEN 'globe_glow'       THEN interval '24 hours'
    WHEN 'profile_bump'     THEN interval '24 hours'
    WHEN 'vibe_blast'       THEN interval '24 hours'
    WHEN 'incognito'        THEN interval '7 days'
    WHEN 'extra_beacon'     THEN interval '7 days'
    WHEN 'highlighted_msg'  THEN interval '7 days'
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

-- 3. Referral reward function — grants 7 days free hotmess to referrer
-- Called by a cron or edge function after referee completes onboarding
CREATE OR REPLACE FUNCTION public.grant_referral_rewards()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_ref record;
BEGIN
  FOR v_ref IN
    SELECT r.id, r.referrer_id
    FROM public.referrals r
    JOIN public.profiles p ON p.id = r.referee_id
    WHERE r.status = 'completed'
      AND r.reward_granted IS NOT TRUE
      AND p.onboarding_completed = true
  LOOP
    -- Upsert membership: extend by 7 days or create new
    INSERT INTO public.memberships (user_id, tier, status, started_at, ends_at)
    VALUES (v_ref.referrer_id, 'hotmess', 'active', now(), now() + interval '7 days')
    ON CONFLICT (user_id)
    DO UPDATE SET
      ends_at = GREATEST(COALESCE(memberships.ends_at, now()), now()) + interval '7 days',
      status = 'active';

    -- Mark reward as granted
    UPDATE public.referrals SET reward_granted = true WHERE id = v_ref.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 4. Backfill stuck onboarding users: advance age_verified=true from 'start' to 'signed_up'
UPDATE public.profiles
SET onboarding_stage = 'signed_up'
WHERE onboarding_stage = 'start'
  AND age_verified = true;
