-- Recreate venue_vibe_mix VIEW to respect share_vibe privacy setting.
-- Already deployed to prod rfoftonnlwudilafhfkl via execute_sql.

DROP VIEW IF EXISTS venue_vibe_mix;

CREATE VIEW venue_vibe_mix AS
SELECT
  vc.place_slug,
  ulv.vibe,
  COUNT(*) AS count,
  MAX(vc.checked_in_at) AS latest_checkin
FROM venue_checkins vc
JOIN user_live_vibes ulv ON ulv.user_id = vc.user_id
LEFT JOIN user_privacy_settings ups ON ups.user_id = vc.user_id
WHERE vc.checked_in_at > now() - interval '4 hours'
  AND (ulv.expires_at IS NULL OR ulv.expires_at > now())
  AND COALESCE(ups.share_vibe, true) = true
GROUP BY vc.place_slug, ulv.vibe;
