-- Persona System Migration
-- Multi-profile support with inheritance, visibility, and allowlists

-- Persona types enum
DO $$ BEGIN
  CREATE TYPE persona_type AS ENUM ('MAIN', 'TRAVEL', 'WEEKEND', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Visibility levels
DO $$ BEGIN
  CREATE TYPE persona_visibility AS ENUM (
    'PUBLIC',           -- Visible to all
    'MATCHES_ONLY',     -- Only users you've matched with
    'ALLOWLIST',        -- Only specific users
    'HIDDEN'            -- Completely hidden
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add persona support to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS active_persona_id uuid,
ADD COLUMN IF NOT EXISTS persona_type persona_type DEFAULT 'MAIN',
ADD COLUMN IF NOT EXISTS parent_profile_id uuid REFERENCES "User"(id),
ADD COLUMN IF NOT EXISTS is_secondary_profile boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS persona_visibility persona_visibility DEFAULT 'PUBLIC',
ADD COLUMN IF NOT EXISTS persona_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS persona_auto_switch_rules jsonb DEFAULT '{}';

-- Profile overrides (for secondary personas)
CREATE TABLE IF NOT EXISTS profile_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  field_name text NOT NULL, -- 'bio', 'photos', 'display_name', etc.
  override_value jsonb NOT NULL,
  inherit_from_main boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, field_name)
);

-- Visibility rules per persona
CREATE TABLE IF NOT EXISTS profile_visibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  rule_type text NOT NULL, -- 'location', 'time', 'tribe', 'tier'
  rule_config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Allowlist for restricted personas
CREATE TABLE IF NOT EXISTS profile_allowlist_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  allowed_user_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  granted_by text DEFAULT 'owner', -- 'owner', 'match', 'invite'
  UNIQUE(profile_id, allowed_user_id)
);

-- Blocklist for personas (overrides allowlist)
CREATE TABLE IF NOT EXISTS profile_blocklist_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  reason text,
  blocked_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, blocked_user_id)
);

-- Viewer filter configuration
CREATE TABLE IF NOT EXISTS profile_viewer_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  filter_type text NOT NULL, -- 'min_tier', 'verified_only', 'min_xp', 'tribes'
  filter_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, filter_type)
);

-- Add persona context to conversations
ALTER TABLE chat_threads
ADD COLUMN IF NOT EXISTS sender_persona_id uuid REFERENCES "User"(id),
ADD COLUMN IF NOT EXISTS receiver_persona_id uuid REFERENCES "User"(id);

-- Add persona to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sender_persona_id uuid REFERENCES "User"(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_parent_profile ON "User"(parent_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_persona_type ON "User"(persona_type);
CREATE INDEX IF NOT EXISTS idx_user_active_persona ON "User"(active_persona_id);
CREATE INDEX IF NOT EXISTS idx_profile_overrides_profile ON profile_overrides(profile_id);
CREATE INDEX IF NOT EXISTS idx_visibility_rules_profile ON profile_visibility_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_allowlist_profile ON profile_allowlist_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_blocklist_profile ON profile_blocklist_users(profile_id);

-- RLS Policies
ALTER TABLE profile_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_visibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_allowlist_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_blocklist_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_viewer_filters ENABLE ROW LEVEL SECURITY;

-- Users manage their own profile overrides
CREATE POLICY "Users manage own overrides"
  ON profile_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE id = profile_overrides.profile_id 
      AND (id = auth.uid() OR parent_profile_id = auth.uid())
    )
  );

-- Users manage own visibility rules
CREATE POLICY "Users manage own visibility"
  ON profile_visibility_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE id = profile_visibility_rules.profile_id 
      AND (id = auth.uid() OR parent_profile_id = auth.uid())
    )
  );

-- Users manage own allowlist
CREATE POLICY "Users manage own allowlist"
  ON profile_allowlist_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE id = profile_allowlist_users.profile_id 
      AND (id = auth.uid() OR parent_profile_id = auth.uid())
    )
  );

-- Users manage own blocklist
CREATE POLICY "Users manage own blocklist"
  ON profile_blocklist_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE id = profile_blocklist_users.profile_id 
      AND (id = auth.uid() OR parent_profile_id = auth.uid())
    )
  );

-- Function to get effective profile (with inheritance)
CREATE OR REPLACE FUNCTION get_effective_profile(p_profile_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_profile "User"%ROWTYPE;
  v_parent "User"%ROWTYPE;
  v_effective jsonb;
  v_override RECORD;
BEGIN
  -- Get the profile
  SELECT * INTO v_profile FROM "User" WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- If it's a main profile or no parent, return as-is
  IF v_profile.persona_type = 'MAIN' OR v_profile.parent_profile_id IS NULL THEN
    RETURN to_jsonb(v_profile);
  END IF;
  
  -- Get parent profile
  SELECT * INTO v_parent FROM "User" WHERE id = v_profile.parent_profile_id;
  
  -- Start with parent's data
  v_effective := to_jsonb(v_parent);
  
  -- Apply overrides
  FOR v_override IN 
    SELECT field_name, override_value, inherit_from_main 
    FROM profile_overrides 
    WHERE profile_id = p_profile_id
  LOOP
    IF NOT v_override.inherit_from_main THEN
      v_effective := jsonb_set(v_effective, ARRAY[v_override.field_name], v_override.override_value);
    END IF;
  END LOOP;
  
  -- Set the actual profile ID and type
  v_effective := jsonb_set(v_effective, '{id}', to_jsonb(v_profile.id));
  v_effective := jsonb_set(v_effective, '{persona_type}', to_jsonb(v_profile.persona_type::text));
  
  RETURN v_effective;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view a persona
CREATE OR REPLACE FUNCTION can_view_persona(
  p_viewer_id uuid,
  p_profile_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_profile "User"%ROWTYPE;
  v_visibility persona_visibility;
  v_blocked boolean;
  v_allowed boolean;
  v_viewer "User"%ROWTYPE;
  v_filter RECORD;
BEGIN
  -- Get profile
  SELECT * INTO v_profile FROM "User" WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Owner can always view
  IF p_viewer_id = v_profile.id OR p_viewer_id = v_profile.parent_profile_id THEN
    RETURN TRUE;
  END IF;
  
  v_visibility := COALESCE(v_profile.persona_visibility, 'PUBLIC');
  
  -- Check blocklist first
  SELECT EXISTS (
    SELECT 1 FROM profile_blocklist_users 
    WHERE profile_id = p_profile_id AND blocked_user_id = p_viewer_id
  ) INTO v_blocked;
  
  IF v_blocked THEN
    RETURN FALSE;
  END IF;
  
  -- Handle visibility levels
  CASE v_visibility
    WHEN 'PUBLIC' THEN
      -- Check viewer filters
      FOR v_filter IN 
        SELECT filter_type, filter_value 
        FROM profile_viewer_filters 
        WHERE profile_id = p_profile_id
      LOOP
        SELECT * INTO v_viewer FROM "User" WHERE id = p_viewer_id;
        
        CASE v_filter.filter_type
          WHEN 'verified_only' THEN
            IF NOT COALESCE(v_viewer.is_verified, FALSE) THEN
              RETURN FALSE;
            END IF;
          WHEN 'min_tier' THEN
            -- Tier check logic here
            NULL;
        END CASE;
      END LOOP;
      RETURN TRUE;
      
    WHEN 'MATCHES_ONLY' THEN
      -- Check if they've matched
      RETURN EXISTS (
        SELECT 1 FROM matches 
        WHERE (user_id = p_viewer_id AND matched_user_id = p_profile_id)
           OR (user_id = p_profile_id AND matched_user_id = p_viewer_id)
      );
      
    WHEN 'ALLOWLIST' THEN
      RETURN EXISTS (
        SELECT 1 FROM profile_allowlist_users 
        WHERE profile_id = p_profile_id AND allowed_user_id = p_viewer_id
      );
      
    WHEN 'HIDDEN' THEN
      RETURN FALSE;
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create secondary persona
CREATE OR REPLACE FUNCTION create_secondary_persona(
  p_parent_id uuid,
  p_persona_type persona_type,
  p_display_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_visibility persona_visibility DEFAULT 'PUBLIC'
)
RETURNS uuid AS $$
DECLARE
  v_new_id uuid;
  v_parent "User"%ROWTYPE;
BEGIN
  -- Get parent profile
  SELECT * INTO v_parent FROM "User" WHERE id = p_parent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent profile not found';
  END IF;
  
  -- Check persona limits (FREE: 1, PREMIUM: 3, ELITE: 5)
  -- This would check tier and existing persona count
  
  -- Create new profile as secondary
  INSERT INTO "User" (
    email,
    parent_profile_id,
    persona_type,
    is_secondary_profile,
    persona_visibility,
    display_name,
    bio,
    created_at
  ) VALUES (
    v_parent.email, -- Same email
    p_parent_id,
    p_persona_type,
    TRUE,
    p_visibility,
    COALESCE(p_display_name, v_parent.display_name),
    COALESCE(p_bio, v_parent.bio),
    now()
  ) RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Background job: Deactivate expired personas
CREATE OR REPLACE FUNCTION deactivate_expired_personas()
RETURNS void AS $$
BEGIN
  UPDATE "User"
  SET 
    persona_visibility = 'HIDDEN',
    active_persona_id = NULL
  WHERE 
    is_secondary_profile = TRUE
    AND persona_expires_at IS NOT NULL
    AND persona_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
