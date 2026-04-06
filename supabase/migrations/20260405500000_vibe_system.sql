-- Build 8: Vibe System
-- Live energy/intent layer — 5 branded vibes with 4h expiry
-- SQL already deployed to prod (rfoftonnlwudilafhfkl) — this file is for local tracking

CREATE TABLE IF NOT EXISTS public.user_live_vibes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id uuid NULL,
  place_slug text NULL,
  lat double precision NULL,
  lng double precision NULL,
  vibe text NOT NULL CHECK (vibe IN ('RAW','HUNG','HIGH','LOOKING','CHILLING')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  PRIMARY KEY (user_id)
);

-- RLS
ALTER TABLE public.user_live_vibes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vibe"
  ON public.user_live_vibes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read vibes"
  ON public.user_live_vibes
  FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_vibes_vibe ON public.user_live_vibes(vibe);
CREATE INDEX IF NOT EXISTS idx_live_vibes_place ON public.user_live_vibes(place_slug);
CREATE INDEX IF NOT EXISTS idx_live_vibes_expires ON public.user_live_vibes(expires_at);

-- Aggregation view: vibe mix per venue (4h window)
CREATE OR REPLACE VIEW public.venue_vibe_mix AS
SELECT
  place_slug,
  vibe,
  count(*) AS count
FROM public.user_live_vibes
WHERE expires_at IS NULL OR expires_at > now()
  AND created_at > now() - interval '4 hours'
GROUP BY place_slug, vibe;
