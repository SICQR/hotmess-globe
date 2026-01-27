-- Migration: Create tables for match probability scoring system
-- This migration creates:
-- 1. profile_embeddings - stores vector embeddings for semantic text matching
-- 2. scoring_config - stores configurable weights for match scoring
-- 3. match_score_cache - optional caching layer for computed scores

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: profile_embeddings
-- Stores pre-computed embeddings for semantic text analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS profile_embeddings (
  user_id UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
  
  -- Individual field embeddings (OpenAI text-embedding-3-small = 1536 dimensions)
  bio_embedding VECTOR(1536),
  turn_ons_embedding VECTOR(1536),
  turn_offs_embedding VECTOR(1536),
  safer_sex_notes_embedding VECTOR(1536),
  
  -- Combined weighted embedding for faster similarity lookups
  combined_embedding VECTOR(1536),
  
  -- Source text hashes for cache invalidation
  bio_hash TEXT,
  turn_ons_hash TEXT,
  turn_offs_hash TEXT,
  safer_sex_notes_hash TEXT,
  
  -- Metadata
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient vector similarity search using cosine distance
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_combined 
ON profile_embeddings USING ivfflat (combined_embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for finding embeddings by user
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_user_id 
ON profile_embeddings(user_id);

-- ============================================================================
-- Table: scoring_config
-- Configurable weights and parameters for match scoring algorithm
-- Allows A/B testing and tuning without code changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  
  -- Scoring weights (should sum to 100 for percentage-based scoring)
  weights JSONB NOT NULL DEFAULT '{
    "travel_time": 20,
    "role_compatibility": 15,
    "kink_overlap": 15,
    "intent_alignment": 12,
    "semantic_text": 12,
    "lifestyle_match": 10,
    "activity_recency": 8,
    "profile_completeness": 8
  }'::JSONB,
  
  -- Travel time decay thresholds (in minutes)
  travel_time_thresholds JSONB NOT NULL DEFAULT '{
    "walking": {"max": 5, "score": 20},
    "quick": {"max": 15, "score": 18},
    "reasonable": {"max": 30, "score": 15},
    "committed": {"max": 60, "score": 10},
    "long": {"max": 120, "score": 5},
    "very_far": {"score": 2},
    "unknown": {"score": 10}
  }'::JSONB,
  
  -- Role compatibility matrix
  role_compatibility_matrix JSONB NOT NULL DEFAULT '{
    "top": {"bottom": 15, "vers": 12, "vers_top": 8, "vers_bottom": 10, "top": 5, "side": 7},
    "bottom": {"top": 15, "vers": 12, "vers_bottom": 8, "vers_top": 10, "bottom": 5, "side": 7},
    "vers": {"vers": 15, "top": 12, "bottom": 12, "vers_top": 10, "vers_bottom": 10, "side": 8},
    "vers_top": {"bottom": 12, "vers_bottom": 15, "vers": 10, "top": 5, "vers_top": 8, "side": 7},
    "vers_bottom": {"top": 12, "vers_top": 15, "vers": 10, "bottom": 5, "vers_bottom": 8, "side": 7},
    "side": {"side": 15, "vers": 8, "top": 7, "bottom": 7, "vers_top": 7, "vers_bottom": 7}
  }'::JSONB,
  
  -- Penalty/boost values
  hard_limit_conflict_penalty INTEGER NOT NULL DEFAULT 10,
  soft_limit_conflict_penalty INTEGER NOT NULL DEFAULT 3,
  mutual_kink_boost INTEGER NOT NULL DEFAULT 2,
  
  -- Feature flags
  use_travel_time BOOLEAN NOT NULL DEFAULT true,
  use_semantic_matching BOOLEAN NOT NULL DEFAULT true,
  use_kink_scoring BOOLEAN NOT NULL DEFAULT true,
  use_chem_scoring BOOLEAN NOT NULL DEFAULT true,
  
  -- Config metadata
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES "User"(id)
);

-- Insert default scoring configuration
INSERT INTO scoring_config (config_key, description, is_active, is_default)
VALUES ('default_v1', 'Default match scoring configuration v1', true, true)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- Table: match_score_cache
-- Optional caching layer for computed match scores
-- TTL-based invalidation for frequently accessed scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_score_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  
  -- Overall score (0-100)
  match_probability DECIMAL(5,2) NOT NULL,
  
  -- Score breakdown
  breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Cache metadata
  scoring_config_key TEXT NOT NULL DEFAULT 'default_v1',
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Location context (scores may vary by viewer location)
  viewer_lat DOUBLE PRECISION,
  viewer_lng DOUBLE PRECISION,
  
  UNIQUE(user_id, target_user_id, scoring_config_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_match_score_cache_lookup 
ON match_score_cache(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_match_score_cache_target 
ON match_score_cache(target_user_id);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_match_score_cache_expires 
ON match_score_cache(expires_at);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_score_cache ENABLE ROW LEVEL SECURITY;

-- profile_embeddings: Users can only see/update their own embeddings
CREATE POLICY "Users can view own embeddings"
ON profile_embeddings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own embeddings"
ON profile_embeddings FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own embeddings"
ON profile_embeddings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service role can access all embeddings (for batch scoring)
CREATE POLICY "Service role can access all embeddings"
ON profile_embeddings FOR ALL
TO service_role
USING (true);

-- scoring_config: Anyone can read active configs, only admins can modify
CREATE POLICY "Anyone can read active scoring configs"
ON scoring_config FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Service role can manage scoring configs"
ON scoring_config FOR ALL
TO service_role
USING (true);

-- match_score_cache: Users can only see their own cached scores
CREATE POLICY "Users can view own cached scores"
ON match_score_cache FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage score cache"
ON match_score_cache FOR ALL
TO service_role
USING (true);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profile_embeddings
DROP TRIGGER IF EXISTS update_profile_embeddings_updated_at ON profile_embeddings;
CREATE TRIGGER update_profile_embeddings_updated_at
BEFORE UPDATE ON profile_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for scoring_config
DROP TRIGGER IF EXISTS update_scoring_config_updated_at ON scoring_config;
CREATE TRIGGER update_scoring_config_updated_at
BEFORE UPDATE ON scoring_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_match_scores()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM match_score_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate cache for a user (called when profile changes)
CREATE OR REPLACE FUNCTION invalidate_match_score_cache(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM match_score_cache
  WHERE user_id = p_user_id OR target_user_id = p_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE profile_embeddings IS 'Stores vector embeddings for semantic text matching in the match probability system';
COMMENT ON TABLE scoring_config IS 'Configurable weights and parameters for match scoring algorithm';
COMMENT ON TABLE match_score_cache IS 'Cache layer for computed match scores with TTL-based invalidation';

COMMENT ON COLUMN profile_embeddings.combined_embedding IS 'Weighted combination of all text embeddings for faster similarity search';
COMMENT ON COLUMN scoring_config.weights IS 'JSON object containing weight values for each scoring dimension (should sum to 100)';
COMMENT ON COLUMN match_score_cache.breakdown IS 'JSON object containing individual sub-scores for transparency and debugging';
