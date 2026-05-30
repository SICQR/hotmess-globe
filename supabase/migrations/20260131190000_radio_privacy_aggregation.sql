-- ============================================================================
-- RADIO SIGNALS + PRIVACY-SAFE AGGREGATION
-- ============================================================================
-- Radio as live cultural signal layer
-- City-level only, k-anonymity thresholds, no stalking surface
-- ============================================================================

-- Radio sessions (privacy-safe: city only, no GPS)
CREATE TABLE IF NOT EXISTS radio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- nullable for anonymous
  city TEXT NOT NULL,
  country TEXT,
  show_id UUID,
  source TEXT CHECK (source IN ('app', 'web', 'embedded', 'external')),
  referrer TEXT CHECK (referrer IN ('globe', 'feed', 'direct', 'radio_page', 'event', 'external')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer 
    ELSE NULL END
  ) STORED
);

-- Radio signals (for Globe)
CREATE TABLE IF NOT EXISTS radio_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('radio_live', 'show_peak', 'premiere', 'listener_surge')),
  show_id UUID,
  intensity INTEGER DEFAULT 50 CHECK (intensity >= 0 AND intensity <= 100),
  listener_count_bucket TEXT, -- "10-50", "50-100", "100-500", "500+"
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- AGGREGATION TABLES (k-anonymity enforced)
-- ============================================================================

-- Minute-level city aggregates (for real-time Globe)
CREATE TABLE IF NOT EXISTS radio_city_minute_agg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  minute_bucket TIMESTAMPTZ NOT NULL, -- Truncated to minute
  listener_count INTEGER DEFAULT 0,
  k_threshold_met BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city, minute_bucket)
);

-- Hour-level show aggregates (for analytics)
CREATE TABLE IF NOT EXISTS radio_show_city_hour_agg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID,
  city TEXT NOT NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  listener_count INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER,
  k_threshold_met BOOLEAN DEFAULT FALSE,
  UNIQUE(show_id, city, hour_bucket)
);

-- Globe heat tiles (aggregated, delayed, thresholded)
CREATE TABLE IF NOT EXISTS globe_heat_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  tile_id TEXT, -- For sub-city resolution if needed
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  intensity INTEGER DEFAULT 0 CHECK (intensity >= 0 AND intensity <= 100),
  sources JSONB DEFAULT '{}', -- {radio: 30, events: 40, checkins: 30}
  k_threshold_met BOOLEAN DEFAULT FALSE,
  delay_applied_minutes INTEGER DEFAULT 5,
  UNIQUE(city, tile_id, window_start)
);

-- ============================================================================
-- K-ANONYMITY CONFIG
-- ============================================================================
CREATE TABLE IF NOT EXISTS privacy_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context TEXT UNIQUE NOT NULL, -- 'globe_city', 'globe_district', 'radio', 'now_signals'
  k_threshold INTEGER NOT NULL DEFAULT 20,
  delay_minutes INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO privacy_thresholds (context, k_threshold, delay_minutes) VALUES
  ('globe_city', 20, 5),
  ('globe_district', 50, 10),
  ('radio', 10, 2),
  ('now_signals', 5, 3)
ON CONFLICT (context) DO NOTHING;

-- ============================================================================
-- AGGREGATION FUNCTIONS
-- ============================================================================

-- Aggregate radio listeners by city (run every minute)
CREATE OR REPLACE FUNCTION aggregate_radio_city_minute()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_minute TIMESTAMPTZ := date_trunc('minute', NOW());
BEGIN
  SELECT k_threshold INTO v_threshold FROM privacy_thresholds WHERE context = 'radio';
  
  INSERT INTO radio_city_minute_agg (city, minute_bucket, listener_count, k_threshold_met)
  SELECT 
    city,
    v_minute,
    COUNT(*),
    COUNT(*) >= v_threshold
  FROM radio_sessions
  WHERE started_at <= NOW() AND (ended_at IS NULL OR ended_at > NOW())
  GROUP BY city
  ON CONFLICT (city, minute_bucket) DO UPDATE SET
    listener_count = EXCLUDED.listener_count,
    k_threshold_met = EXCLUDED.k_threshold_met;
END;
$$;

-- Generate globe heat tiles (run every 5 minutes)
CREATE OR REPLACE FUNCTION generate_globe_heat_tiles()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold INTEGER;
  v_delay INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  SELECT k_threshold, delay_minutes INTO v_threshold, v_delay 
  FROM privacy_thresholds WHERE context = 'globe_city';
  
  v_window_end := NOW() - (v_delay || ' minutes')::interval;
  v_window_start := v_window_end - interval '5 minutes';
  
  INSERT INTO globe_heat_tiles (city, tile_id, window_start, window_end, intensity, sources, k_threshold_met, delay_applied_minutes)
  SELECT 
    r.city,
    'city_center',
    v_window_start,
    v_window_end,
    LEAST(100, (
      COALESCE(r.listeners, 0) * 2 +
      COALESCE(e.events, 0) * 10 +
      COALESCE(c.checkins, 0) * 3
    )),
    jsonb_build_object(
      'radio', COALESCE(r.listeners, 0),
      'events', COALESCE(e.events, 0),
      'checkins', COALESCE(c.checkins, 0)
    ),
    (COALESCE(r.listeners, 0) + COALESCE(c.checkins, 0)) >= v_threshold,
    v_delay
  FROM (
    SELECT city, SUM(listener_count) as listeners
    FROM radio_city_minute_agg
    WHERE minute_bucket BETWEEN v_window_start AND v_window_end
    GROUP BY city
  ) r
  FULL OUTER JOIN (
    SELECT city, COUNT(*) as events FROM beacons WHERE start_time BETWEEN v_window_start AND v_window_end GROUP BY city
  ) e ON r.city = e.city
  FULL OUTER JOIN (
    SELECT city, COUNT(*) as checkins FROM checkins WHERE created_at BETWEEN v_window_start AND v_window_end GROUP BY city
  ) c ON COALESCE(r.city, e.city) = c.city
  ON CONFLICT (city, tile_id, window_start) DO UPDATE SET
    intensity = EXCLUDED.intensity,
    sources = EXCLUDED.sources,
    k_threshold_met = EXCLUDED.k_threshold_met;
END;
$$;

-- Check if we can render a tile (public API uses this)
CREATE OR REPLACE FUNCTION can_render_tile(p_city TEXT, p_tile_id TEXT DEFAULT 'city_center')
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tile globe_heat_tiles%ROWTYPE;
BEGIN
  SELECT * INTO v_tile 
  FROM globe_heat_tiles 
  WHERE city = p_city AND tile_id = p_tile_id
  ORDER BY window_end DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_data');
  END IF;
  
  IF NOT v_tile.k_threshold_met THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_threshold', 'use_sparkle', true);
  END IF;
  
  RETURN jsonb_build_object(
    'ok', true,
    'intensity', v_tile.intensity,
    'delay_minutes', v_tile.delay_applied_minutes,
    'window_age_minutes', EXTRACT(EPOCH FROM (NOW() - v_tile.window_end)) / 60
  );
END;
$$;

-- ============================================================================
-- CITY READINESS INDEX (CRI)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_city_readiness(p_city TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_radio_score NUMERIC;
  v_events_score NUMERIC;
  v_tickets_score NUMERIC;
  v_business_score NUMERIC;
  v_heat_score NUMERIC;
  v_safety_penalty NUMERIC;
  v_cri NUMERIC;
BEGIN
  -- Radio listeners (last 30 days)
  SELECT COALESCE(SUM(listener_count), 0) / 1000.0 INTO v_radio_score
  FROM radio_city_minute_agg WHERE city = p_city AND minute_bucket > NOW() - interval '30 days';
  v_radio_score := LEAST(100, v_radio_score);
  
  -- Events created (last 30 days)
  SELECT COUNT(*) * 5 INTO v_events_score
  FROM beacons WHERE city = p_city AND created_at > NOW() - interval '30 days';
  v_events_score := LEAST(100, v_events_score);
  
  -- Ticket velocity
  SELECT COUNT(*) * 2 INTO v_tickets_score
  FROM ticket_listings WHERE city = p_city AND created_at > NOW() - interval '30 days';
  v_tickets_score := LEAST(100, COALESCE(v_tickets_score, 0));
  
  -- Verified businesses
  SELECT COUNT(*) * 10 INTO v_business_score
  FROM businesses WHERE city_id IN (SELECT id FROM cities WHERE slug = p_city) AND verification_status = 'verified';
  v_business_score := LEAST(100, COALESCE(v_business_score, 0));
  
  -- Globe heat average
  SELECT AVG(intensity) INTO v_heat_score
  FROM globe_heat_tiles WHERE city = p_city AND window_start > NOW() - interval '7 days';
  v_heat_score := COALESCE(v_heat_score, 0);
  
  -- Safety penalty (reports in last 30 days)
  SELECT COUNT(*) * 5 INTO v_safety_penalty
  FROM reports WHERE city = p_city AND created_at > NOW() - interval '30 days';
  v_safety_penalty := LEAST(30, COALESCE(v_safety_penalty, 0));
  
  -- Calculate CRI
  v_cri := (
    (v_radio_score * 0.25) +
    (v_events_score * 0.20) +
    (v_tickets_score * 0.20) +
    (v_business_score * 0.15) +
    (v_heat_score * 0.20)
  ) - v_safety_penalty;
  
  v_cri := GREATEST(0, LEAST(100, v_cri));
  
  RETURN jsonb_build_object(
    'city', p_city,
    'cri', ROUND(v_cri, 1),
    'components', jsonb_build_object(
      'radio', ROUND(v_radio_score, 1),
      'events', ROUND(v_events_score, 1),
      'tickets', ROUND(v_tickets_score, 1),
      'businesses', ROUND(v_business_score, 1),
      'heat', ROUND(v_heat_score, 1),
      'safety_penalty', ROUND(v_safety_penalty, 1)
    ),
    'launch_recommended', v_cri >= 50,
    'calculated_at', NOW()
  );
END;
$$;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_radio_sessions_city ON radio_sessions(city, started_at);
CREATE INDEX IF NOT EXISTS idx_radio_sessions_show ON radio_sessions(show_id);
CREATE INDEX IF NOT EXISTS idx_radio_city_agg_bucket ON radio_city_minute_agg(minute_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_globe_heat_tiles_city ON globe_heat_tiles(city, window_end DESC);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE radio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_city_minute_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE globe_heat_tiles ENABLE ROW LEVEL SECURITY;

-- Aggregates are public read (they're already anonymized)
CREATE POLICY "Public can view aggregates" ON radio_city_minute_agg FOR SELECT USING (k_threshold_met = TRUE);
CREATE POLICY "Public can view heat tiles" ON globe_heat_tiles FOR SELECT USING (k_threshold_met = TRUE);

-- Sessions are private
CREATE POLICY "Users can view own sessions" ON radio_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service can insert sessions" ON radio_sessions FOR INSERT WITH CHECK (TRUE);
