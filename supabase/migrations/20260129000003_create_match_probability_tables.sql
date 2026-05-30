-- Match Probability System Tables
-- Stores embeddings, scoring config, and optional caching

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Profile embeddings for semantic matching
CREATE TABLE IF NOT EXISTS profile_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  source_text TEXT, -- The concatenated text used to generate the embedding
  model_version TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT profile_embeddings_user_unique UNIQUE (user_id)
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_vector ON profile_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_profile_embeddings_user ON profile_embeddings(user_id);

-- Scoring configuration (weights for each dimension)
CREATE TABLE IF NOT EXISTS scoring_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  weights JSONB NOT NULL DEFAULT '{
    "travel": 20,
    "roleCompat": 15,
    "kinkOverlap": 15,
    "intent": 10,
    "semantic": 12,
    "lifestyle": 10,
    "activity": 8,
    "completeness": 8,
    "chem": 3,
    "hosting": 3
  }',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default config if not exists
INSERT INTO scoring_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Optional: Match score cache for expensive calculations
CREATE TABLE IF NOT EXISTS match_score_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  breakdown JSONB,
  travel_time_minutes INTEGER,
  computed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  
  CONSTRAINT match_score_cache_unique UNIQUE (user_id, target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_score_cache_user ON match_score_cache(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_match_score_cache_expiry ON match_score_cache(expires_at) WHERE expires_at > now();

-- RLS Policies
ALTER TABLE profile_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_score_cache ENABLE ROW LEVEL SECURITY;

-- Users can only see their own embeddings
CREATE POLICY "Users can view own embeddings"
  ON profile_embeddings FOR SELECT
  USING (auth.uid() = user_id);

-- Scoring config is readable by all authenticated users
CREATE POLICY "Authenticated users can view scoring config"
  ON scoring_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Match cache is readable for own matches
CREATE POLICY "Users can view own match scores"
  ON match_score_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Function to update embedding timestamp
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_embedding_timestamp ON profile_embeddings;
CREATE TRIGGER trigger_update_embedding_timestamp
  BEFORE UPDATE ON profile_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_match_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM match_score_cache
  WHERE expires_at < now();
END;
$$;

-- Function to compute cosine similarity between two users
CREATE OR REPLACE FUNCTION get_embedding_similarity(user1_id UUID, user2_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_similarity DECIMAL;
BEGIN
  SELECT 1 - (e1.embedding <=> e2.embedding) INTO v_similarity
  FROM profile_embeddings e1, profile_embeddings e2
  WHERE e1.user_id = user1_id AND e2.user_id = user2_id;
  
  RETURN COALESCE(v_similarity, 0.5);
END;
$$;
