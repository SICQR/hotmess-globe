-- ============================================================================
-- PERSONA SYSTEM (Multi-Profile)
-- Phase 6: Major Features
-- ============================================================================

-- Personas table (secondary profiles)
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  persona_type TEXT NOT NULL CHECK (persona_type IN ('main', 'travel', 'weekend', 'custom')),
  display_name TEXT,
  bio TEXT,
  photos JSONB DEFAULT '[]', -- Array of photo URLs
  visibility_rules JSONB DEFAULT '{}', -- Who can see this persona
  inherit_from_main JSONB DEFAULT '{"photos": true, "interests": true, "tribes": false}',
  is_active BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ, -- For temporary personas (travel, weekend)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Persona activity log (track when personas are used)
CREATE TABLE IF NOT EXISTS persona_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'activated', 'deactivated', 'viewed', 'messaged_from'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_personas_user ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_active ON personas(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_persona_activity_persona ON persona_activity(persona_id);

-- RLS
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own personas"
  ON personas FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own persona activity"
  ON persona_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = persona_activity.persona_id 
        AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access personas"
  ON personas FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access persona activity"
  ON persona_activity FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Constraint: Only one active persona per user at a time
CREATE UNIQUE INDEX idx_one_active_persona_per_user 
  ON personas(user_id) 
  WHERE is_active = true;

-- Function to switch active persona
CREATE OR REPLACE FUNCTION switch_persona(
  p_user_id UUID,
  p_new_persona_id UUID
)
RETURNS void AS $$
BEGIN
  -- Deactivate all personas for user
  UPDATE personas 
  SET is_active = false 
  WHERE user_id = p_user_id;
  
  -- Activate new persona
  UPDATE personas 
  SET is_active = true 
  WHERE id = p_new_persona_id 
    AND user_id = p_user_id;
  
  -- Log activity
  INSERT INTO persona_activity (persona_id, action_type)
  VALUES (p_new_persona_id, 'activated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire temporary personas
CREATE OR REPLACE FUNCTION expire_temporary_personas()
RETURNS void AS $$
BEGIN
  UPDATE personas
  SET is_active = false
  WHERE expires_at IS NOT NULL 
    AND expires_at < now()
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TODO: Set up cron job to run expire_temporary_personas() daily
-- Example: SELECT cron.schedule('expire-personas', '0 0 * * *', 'SELECT expire_temporary_personas()');
