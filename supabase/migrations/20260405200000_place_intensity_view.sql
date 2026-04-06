-- Place intensity VIEW: time-weighted check-in aggregation with 5-level scale
-- Drives globe node visuals (size, glow, pulse speed, heat bloom)
-- Already run on prod (rfoftonnlwudilafhfkl) 2026-04-05

-- Add place_slug to venue_checkins for QR check-in linking
ALTER TABLE venue_checkins ADD COLUMN IF NOT EXISTS place_slug text;
CREATE INDEX IF NOT EXISTS idx_venue_checkins_place_slug ON venue_checkins(place_slug);
CREATE INDEX IF NOT EXISTS idx_venue_checkins_checked_in_at ON venue_checkins(checked_in_at);

-- Materialized-style VIEW: time-weighted intensity per pulse_place
-- Decay: 30m=100%, 90m=60%, 180m=30%, 3h+=0
-- Scale: logarithmic 0-5 (0=empty, 1=presence, 2=early, 3=active, 4=hot, 5=peak)
CREATE OR REPLACE VIEW place_intensity AS
WITH weighted AS (
  SELECT
    vc.place_slug,
    SUM(CASE
      WHEN vc.checked_in_at > now() - interval '30 minutes' THEN 1.0
      WHEN vc.checked_in_at > now() - interval '90 minutes' THEN 0.6
      WHEN vc.checked_in_at > now() - interval '3 hours'    THEN 0.3
      ELSE 0
    END) AS effective_count,
    COUNT(*) FILTER (WHERE vc.checked_in_at > now() - interval '30 minutes') AS checkins_30m,
    COUNT(*) FILTER (WHERE vc.checked_in_at > now() - interval '1 hour')     AS checkins_1h,
    COUNT(*) FILTER (WHERE vc.checked_in_at > now() - interval '4 hours')    AS checkins_4h,
    COUNT(*) FILTER (WHERE vc.checked_in_at > now() - interval '10 minutes') AS momentum,
    MAX(vc.checked_in_at) AS last_checkin_at
  FROM venue_checkins vc
  WHERE vc.place_slug IS NOT NULL
    AND vc.checked_in_at > now() - interval '4 hours'
  GROUP BY vc.place_slug
)
SELECT
  pp.slug,
  pp.name,
  pp.type,
  pp.lat,
  pp.lng,
  COALESCE(w.checkins_30m, 0) AS checkins_30m,
  COALESCE(w.checkins_1h, 0)  AS checkins_1h,
  COALESCE(w.checkins_4h, 0)  AS checkins_4h,
  COALESCE(w.effective_count, 0) AS effective_count,
  CASE
    WHEN COALESCE(w.effective_count, 0) = 0             THEN 0
    WHEN COALESCE(w.effective_count, 0) BETWEEN 0.1 AND 3  THEN 1
    WHEN COALESCE(w.effective_count, 0) BETWEEN 3.1 AND 9  THEN 2
    WHEN COALESCE(w.effective_count, 0) BETWEEN 9.1 AND 24 THEN 3
    WHEN COALESCE(w.effective_count, 0) BETWEEN 24.1 AND 60 THEN 4
    ELSE 5
  END AS intensity_level,
  COALESCE(w.momentum, 0) AS momentum,
  w.last_checkin_at
FROM pulse_places pp
LEFT JOIN weighted w ON w.place_slug = pp.slug
WHERE pp.is_active = true;

-- RLS: place_intensity is a VIEW, inherits from pulse_places (public read)
-- No additional policy needed
