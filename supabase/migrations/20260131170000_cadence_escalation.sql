-- ============================================================================
-- CADENCE AUTO-ESCALATION SYSTEM
-- ============================================================================
-- Automatically upgrades city ingestion speed when:
-- - Revenue justifies cost
-- - Engagement proves value
-- - Error rate is acceptable
--
-- Safeguards:
-- - Manual approval required first time
-- - All escalations logged
-- - Auto-downgrade on error spikes
-- ============================================================================

-- Cadence tiers
CREATE TYPE cadence_tier AS ENUM (
  'seed',      -- Manual/sparse, £0/mo
  'grow',      -- Daily refresh, £50/mo
  'scale',     -- Hourly refresh, £200/mo
  'live'       -- Real-time, £500/mo
);

-- City cadence configuration
CREATE TABLE IF NOT EXISTS city_cadence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  
  -- Current tier
  current_tier cadence_tier DEFAULT 'seed',
  
  -- Metrics (updated by cron)
  revenue_30d DECIMAL(12,2) DEFAULT 0,
  signal_engagement_rate DECIMAL(5,4) DEFAULT 0, -- 0.0000 - 1.0000
  parse_error_rate DECIMAL(5,4) DEFAULT 0,
  ops_cost_monthly DECIMAL(10,2) DEFAULT 0,
  
  -- Escalation state
  pending_escalation cadence_tier,
  escalation_requested_at TIMESTAMPTZ,
  escalation_approved_by UUID REFERENCES auth.users(id),
  escalation_approved_at TIMESTAMPTZ,
  
  -- Auto-downgrade tracking
  error_spike_count INTEGER DEFAULT 0,
  last_error_spike_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(city_id)
);

-- Escalation audit log
CREATE TABLE IF NOT EXISTS cadence_escalation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id),
  
  -- Change
  from_tier cadence_tier NOT NULL,
  to_tier cadence_tier NOT NULL,
  
  -- Context
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('auto_request', 'manual_approve', 'manual_reject', 'auto_downgrade')),
  triggered_by UUID REFERENCES auth.users(id),
  
  -- Metrics at time of change
  revenue_30d DECIMAL(12,2),
  signal_engagement_rate DECIMAL(5,4),
  parse_error_rate DECIMAL(5,4),
  
  -- Notes
  reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ESCALATION POLICY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_cadence_escalation(p_city_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_cadence city_cadence%ROWTYPE;
  v_result JSONB;
  v_should_escalate BOOLEAN := FALSE;
  v_should_downgrade BOOLEAN := FALSE;
  v_target_tier cadence_tier;
BEGIN
  SELECT * INTO v_cadence FROM city_cadence WHERE city_id = p_city_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'City not found');
  END IF;
  
  -- ESCALATION CRITERIA
  -- seed → grow: revenue >= £5k, engagement >= 10%
  IF v_cadence.current_tier = 'seed' 
     AND v_cadence.revenue_30d >= 5000 
     AND v_cadence.signal_engagement_rate >= 0.10
     AND v_cadence.parse_error_rate < 0.05 THEN
    v_should_escalate := TRUE;
    v_target_tier := 'grow';
  END IF;
  
  -- grow → scale: revenue >= £25k, engagement >= 18%
  IF v_cadence.current_tier = 'grow' 
     AND v_cadence.revenue_30d >= 25000 
     AND v_cadence.signal_engagement_rate >= 0.18
     AND v_cadence.parse_error_rate < 0.03 THEN
    v_should_escalate := TRUE;
    v_target_tier := 'scale';
  END IF;
  
  -- scale → live: revenue >= £100k, engagement >= 25%
  IF v_cadence.current_tier = 'scale' 
     AND v_cadence.revenue_30d >= 100000 
     AND v_cadence.signal_engagement_rate >= 0.25
     AND v_cadence.parse_error_rate < 0.02 THEN
    v_should_escalate := TRUE;
    v_target_tier := 'live';
  END IF;
  
  -- DOWNGRADE CRITERIA
  -- Error rate > 10% for 3+ spikes
  IF v_cadence.parse_error_rate > 0.10 AND v_cadence.error_spike_count >= 3 THEN
    v_should_downgrade := TRUE;
  END IF;
  
  -- Revenue dropped below tier threshold
  IF v_cadence.current_tier = 'live' AND v_cadence.revenue_30d < 50000 THEN
    v_should_downgrade := TRUE;
  END IF;
  IF v_cadence.current_tier = 'scale' AND v_cadence.revenue_30d < 10000 THEN
    v_should_downgrade := TRUE;
  END IF;
  IF v_cadence.current_tier = 'grow' AND v_cadence.revenue_30d < 2000 THEN
    v_should_downgrade := TRUE;
  END IF;
  
  RETURN jsonb_build_object(
    'city_id', p_city_id,
    'current_tier', v_cadence.current_tier,
    'should_escalate', v_should_escalate,
    'target_tier', v_target_tier,
    'should_downgrade', v_should_downgrade,
    'metrics', jsonb_build_object(
      'revenue_30d', v_cadence.revenue_30d,
      'engagement_rate', v_cadence.signal_engagement_rate,
      'error_rate', v_cadence.parse_error_rate,
      'ops_cost', v_cadence.ops_cost_monthly
    ),
    'pending_approval', v_cadence.pending_escalation IS NOT NULL
  );
END;
$$;

-- Request escalation (requires admin approval)
CREATE OR REPLACE FUNCTION request_cadence_escalation(p_city_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check JSONB;
BEGIN
  v_check := check_cadence_escalation(p_city_id);
  
  IF NOT (v_check->>'should_escalate')::boolean THEN
    RETURN jsonb_build_object('error', 'Escalation criteria not met');
  END IF;
  
  UPDATE city_cadence
  SET 
    pending_escalation = (v_check->>'target_tier')::cadence_tier,
    escalation_requested_at = NOW(),
    updated_at = NOW()
  WHERE city_id = p_city_id;
  
  -- Log the request
  INSERT INTO cadence_escalation_log (city_id, from_tier, to_tier, trigger_type, revenue_30d, signal_engagement_rate, parse_error_rate)
  SELECT 
    p_city_id,
    current_tier,
    (v_check->>'target_tier')::cadence_tier,
    'auto_request',
    (v_check->'metrics'->>'revenue_30d')::decimal,
    (v_check->'metrics'->>'engagement_rate')::decimal,
    (v_check->'metrics'->>'error_rate')::decimal
  FROM city_cadence WHERE city_id = p_city_id;
  
  RETURN jsonb_build_object('success', true, 'pending_tier', v_check->>'target_tier');
END;
$$;

-- Approve escalation (admin only)
CREATE OR REPLACE FUNCTION approve_cadence_escalation(p_city_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cadence city_cadence%ROWTYPE;
BEGIN
  SELECT * INTO v_cadence FROM city_cadence WHERE city_id = p_city_id;
  
  IF v_cadence.pending_escalation IS NULL THEN
    RETURN jsonb_build_object('error', 'No pending escalation');
  END IF;
  
  -- Apply the escalation
  UPDATE city_cadence
  SET 
    current_tier = pending_escalation,
    pending_escalation = NULL,
    escalation_approved_by = p_admin_id,
    escalation_approved_at = NOW(),
    updated_at = NOW()
  WHERE city_id = p_city_id;
  
  -- Log approval
  INSERT INTO cadence_escalation_log (city_id, from_tier, to_tier, trigger_type, triggered_by, reason)
  VALUES (p_city_id, v_cadence.current_tier, v_cadence.pending_escalation, 'manual_approve', p_admin_id, 'Admin approved');
  
  RETURN jsonb_build_object('success', true, 'new_tier', v_cadence.pending_escalation);
END;
$$;

-- Auto-downgrade on errors
CREATE OR REPLACE FUNCTION auto_downgrade_cadence(p_city_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cadence city_cadence%ROWTYPE;
  v_new_tier cadence_tier;
BEGIN
  SELECT * INTO v_cadence FROM city_cadence WHERE city_id = p_city_id;
  
  -- Determine downgrade tier
  CASE v_cadence.current_tier
    WHEN 'live' THEN v_new_tier := 'scale';
    WHEN 'scale' THEN v_new_tier := 'grow';
    WHEN 'grow' THEN v_new_tier := 'seed';
    ELSE v_new_tier := 'seed';
  END CASE;
  
  UPDATE city_cadence
  SET 
    current_tier = v_new_tier,
    error_spike_count = 0,
    updated_at = NOW()
  WHERE city_id = p_city_id;
  
  -- Log downgrade
  INSERT INTO cadence_escalation_log (city_id, from_tier, to_tier, trigger_type, reason)
  VALUES (p_city_id, v_cadence.current_tier, v_new_tier, 'auto_downgrade', p_reason);
  
  RETURN jsonb_build_object('success', true, 'new_tier', v_new_tier, 'reason', p_reason);
END;
$$;

-- ============================================================================
-- INDEXES & RLS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_city_cadence_tier ON city_cadence(current_tier);
CREATE INDEX IF NOT EXISTS idx_cadence_log_city ON cadence_escalation_log(city_id, created_at DESC);

ALTER TABLE city_cadence ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_escalation_log ENABLE ROW LEVEL SECURITY;

-- Admin only (check user_roles for admin role)
CREATE POLICY "Admins can manage cadence"
  ON city_cadence FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view cadence logs"
  ON cadence_escalation_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
