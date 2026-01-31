-- Business verification + trust scoring
CREATE TABLE IF NOT EXISTS business_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE,
  method text CHECK (method IN ('domain','doc','telegram','manual')),
  status text CHECK (status IN ('pending','verified','rejected')) DEFAULT 'pending',
  trust_score numeric DEFAULT 0,
  reviewed_at timestamptz,
  reviewer_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_bv_status ON business_verifications(status);

-- Creator profiles
CREATE TABLE IF NOT EXISTS creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  type text CHECK (type IN ('dj','artist','designer','host','writer','performer')),
  city text,
  verified boolean DEFAULT false,
  trust_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_cp_city ON creator_profiles(city);

-- Creator products (monetisation)
CREATE TABLE IF NOT EXISTS creator_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES creator_profiles(id) ON DELETE CASCADE,
  kind text CHECK (kind IN ('radio_show','ticket','drop','digital')),
  title text NOT NULL,
  description text,
  price numeric CHECK (price >= 0),
  currency text DEFAULT 'GBP',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_crp_creator ON creator_products(creator_id);

-- City readiness index snapshots
CREATE TABLE IF NOT EXISTS city_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  score numeric CHECK (score >= 0 AND score <= 100),
  radio_score numeric,
  event_score numeric,
  ticket_score numeric,
  business_score numeric,
  globe_heat numeric,
  safety_penalty numeric DEFAULT 0,
  confidence text CHECK (confidence IN ('low','medium','high')),
  trend text CHECK (trend IN ('rising','stable','declining')),
  calculated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_cri_city ON city_readiness(city, calculated_at DESC);

-- Function: calculate city readiness
CREATE OR REPLACE FUNCTION calculate_city_readiness(p_city text)
RETURNS jsonb AS $$
DECLARE
  v_radio numeric := 0;
  v_events numeric := 0;
  v_tickets numeric := 0;
  v_business numeric := 0;
  v_globe numeric := 0;
  v_safety numeric := 0;
  v_score numeric;
  v_confidence text;
  v_trend text := 'stable';
BEGIN
  SELECT COALESCE(AVG(intensity) * 100, 0) INTO v_radio
  FROM radio_signals WHERE city = p_city AND expires_at > now() - interval '7 days';
  
  SELECT COALESCE(COUNT(*) * 2, 0) INTO v_events
  FROM events WHERE city = p_city AND event_date > now() - interval '30 days' LIMIT 50;
  
  SELECT COALESCE(COUNT(*) * 1.5, 0) INTO v_tickets
  FROM tickets t JOIN events e ON t.event_id = e.id WHERE e.city = p_city AND t.status = 'sold' LIMIT 100;
  
  SELECT COALESCE(COUNT(*) * 5, 0) INTO v_business
  FROM business_profiles WHERE city = p_city AND verified = true;
  
  SELECT COALESCE(AVG(intensity) * 100, 0) INTO v_globe
  FROM globe_heat_tiles WHERE city = p_city AND window_end > now() - interval '24 hours';
  
  v_score := LEAST(100, (v_radio * 0.25 + v_events * 0.2 + v_tickets * 0.2 + v_business * 0.15 + v_globe * 0.2) - v_safety);
  v_confidence := CASE WHEN v_score > 60 THEN 'high' WHEN v_score > 30 THEN 'medium' ELSE 'low' END;
  
  INSERT INTO city_readiness (city, score, radio_score, event_score, ticket_score, business_score, globe_heat, safety_penalty, confidence, trend)
  VALUES (p_city, v_score, v_radio, v_events, v_tickets, v_business, v_globe, v_safety, v_confidence, v_trend);
  
  RETURN jsonb_build_object('city', p_city, 'score', v_score, 'confidence', v_confidence, 'trend', v_trend,
    'breakdown', jsonb_build_object('radio', v_radio, 'events', v_events, 'tickets', v_tickets, 'business', v_business, 'globe', v_globe));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Amplification pricing by CRI
CREATE OR REPLACE FUNCTION get_amplification_price(p_city text, p_tier text)
RETURNS numeric AS $$
DECLARE
  v_cri numeric;
  v_base numeric;
BEGIN
  SELECT score INTO v_cri FROM city_readiness WHERE city = p_city ORDER BY calculated_at DESC LIMIT 1;
  v_cri := COALESCE(v_cri, 50);
  v_base := CASE p_tier WHEN 'amplified' THEN 50 WHEN 'signal' THEN 200 WHEN 'landmark' THEN 1000 ELSE 0 END;
  RETURN v_base * (1 + (v_cri / 100));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE business_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage verifications" ON business_verifications FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users read own creator profile" ON creator_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own creator profile" ON creator_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Public read creator products" ON creator_products FOR SELECT USING (true);
CREATE POLICY "Creators manage own products" ON creator_products FOR ALL USING (
  creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Public read CRI" ON city_readiness FOR SELECT USING (true);
