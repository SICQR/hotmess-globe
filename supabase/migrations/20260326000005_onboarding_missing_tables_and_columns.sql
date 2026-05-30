-- Onboarding data layer: missing tables + profile columns
-- OnboardingRouter writes to age_gate_consents + profiles.onboarding_stage.
-- SafetySeedScreen writes to fake_call_callers + profiles.safety_opt_in.
-- LocationPermissionScreen writes to profiles.last_loc_ts.
-- Without these, onboarding stage machine silently drops data and users
-- always restart from the profile screen.

-- ── profiles: onboarding_stage ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_stage TEXT DEFAULT 'start';

-- Back-fill: already-onboarded users → mark complete
UPDATE public.profiles
  SET onboarding_stage = 'complete'
  WHERE onboarding_completed = true AND onboarding_stage IS NULL;

-- ── profiles: safety_opt_in ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS safety_opt_in BOOLEAN NOT NULL DEFAULT false;

-- ── profiles: last_loc_ts (companion to existing last_lat/last_lng) ───────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_loc_ts TIMESTAMPTZ;

-- ── age_gate_consents ─────────────────────────────────────────────────────
-- Lightweight consent audit log — no PII, just a timestamp + session token.
-- RLS: insert-only for all (including anon), no reads.
CREATE TABLE IF NOT EXISTS public.age_gate_consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash      TEXT,          -- SHA-256 of IP, optional
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.age_gate_consents ENABLE ROW LEVEL SECURITY;

-- Insert-only, no user FK required (pre-auth)
DO $$ BEGIN
  CREATE POLICY "age_gate_consents_insert_anon"
    ON public.age_gate_consents FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No SELECT policy — data is ops/admin-only

-- ── fake_call_callers ─────────────────────────────────────────────────────
-- Stores configured fake-call caller profiles per user.
CREATE TABLE IF NOT EXISTS public.fake_call_callers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'contact',
  is_preset    BOOLEAN NOT NULL DEFAULT false,
  personality  TEXT,
  scripts      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fake_call_callers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fake_call_callers_user_id
  ON public.fake_call_callers(user_id);

DO $$ BEGIN
  CREATE POLICY "fake_call_callers_read_own"
    ON public.fake_call_callers FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "fake_call_callers_write_own"
    ON public.fake_call_callers FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "fake_call_callers_update_own"
    ON public.fake_call_callers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "fake_call_callers_delete_own"
    ON public.fake_call_callers FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
