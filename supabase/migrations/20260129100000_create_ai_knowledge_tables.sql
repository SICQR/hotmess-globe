-- ============================================================
-- HOTMESS AI Knowledge Base Tables
-- Enables RAG (Retrieval Augmented Generation) for omniscient AI
-- ============================================================

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. Platform Knowledge (static docs, features, flows)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'feature', 'brand', 'taxonomy', 'safety', 'flow', 'revenue', 'navigation'
  subcategory TEXT,
  source_doc TEXT,        -- e.g., 'HOTMESS-LONDON-OS-BIBLE-v1.5.md'
  chunk_index INT DEFAULT 0,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for platform knowledge
CREATE INDEX IF NOT EXISTS idx_platform_knowledge_vector 
  ON platform_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_platform_knowledge_category 
  ON platform_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_platform_knowledge_source 
  ON platform_knowledge(source_doc);

-- ============================================================
-- 2. Gay World Knowledge (venues, terminology, culture, health)
-- ============================================================
CREATE TABLE IF NOT EXISTS gay_world_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'venue', 'terminology', 'health', 'culture', 'event_type', 'resource'
  subcategory TEXT,       -- e.g., 'club', 'bar', 'sauna' for venues; 'tribes', 'dating' for terminology
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  location_city TEXT,     -- For venue queries (e.g., 'London')
  location_area TEXT,     -- Area within city (e.g., 'Vauxhall', 'Soho')
  metadata JSONB DEFAULT '{}', -- Flexible: address, hours, vibe, music, links, etc.
  source TEXT,            -- Attribution
  is_sensitive BOOLEAN DEFAULT false, -- Health/substance topics
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for gay world knowledge
CREATE INDEX IF NOT EXISTS idx_gay_world_knowledge_vector 
  ON gay_world_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_gay_world_knowledge_category 
  ON gay_world_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_gay_world_knowledge_city 
  ON gay_world_knowledge(location_city);
CREATE INDEX IF NOT EXISTS idx_gay_world_knowledge_subcategory 
  ON gay_world_knowledge(subcategory);

-- ============================================================
-- 3. AI Conversations (memory/history)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  title TEXT,             -- Auto-generated from first message
  messages JSONB[] DEFAULT '{}', -- Array of {role, content, timestamp, tool_calls?}
  context_summary TEXT,   -- Rolling summary for long conversations
  metadata JSONB DEFAULT '{}', -- Page context, user state at time
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user 
  ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated 
  ON ai_conversations(updated_at DESC);

-- ============================================================
-- 4. Match Explanations Cache
-- ============================================================
CREATE TABLE IF NOT EXISTS match_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  score FLOAT,
  explanation TEXT,
  highlights JSONB, -- { shared: [...], compatible: [...], distance: "3.2km" }
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  UNIQUE(user_a_id, user_b_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_match_explanations_users 
  ON match_explanations(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_match_explanations_expires 
  ON match_explanations(expires_at);

-- ============================================================
-- 5. AI Usage Analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  query_type TEXT,        -- 'chat', 'wingman', 'scene_scout', 'match_explain', 'profile_optimize'
  query_text TEXT,
  response_summary TEXT,
  tokens_used INT,
  model_used TEXT,
  latency_ms INT,
  tool_calls JSONB[],     -- Function calls made
  feedback TEXT,          -- 'helpful', 'not_helpful', null
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user 
  ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_type 
  ON ai_usage_logs(query_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created 
  ON ai_usage_logs(created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Platform knowledge: public read (no user data)
ALTER TABLE platform_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform knowledge is publicly readable"
  ON platform_knowledge FOR SELECT
  USING (true);
CREATE POLICY "Platform knowledge admin write"
  ON platform_knowledge FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Gay world knowledge: public read
ALTER TABLE gay_world_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gay world knowledge is publicly readable"
  ON gay_world_knowledge FOR SELECT
  USING (true);
CREATE POLICY "Gay world knowledge admin write"
  ON gay_world_knowledge FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- AI conversations: users can only access their own
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM "User" WHERE auth_user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage own conversations"
  ON ai_conversations FOR ALL
  USING (
    user_id IN (
      SELECT id FROM "User" WHERE auth_user_id = auth.uid()
    )
  );
-- Service role bypass for API
CREATE POLICY "Service role full access to conversations"
  ON ai_conversations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Match explanations: users can see explanations involving them
ALTER TABLE match_explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own match explanations"
  ON match_explanations FOR SELECT
  USING (
    user_a_id IN (SELECT id FROM "User" WHERE auth_user_id = auth.uid())
    OR user_b_id IN (SELECT id FROM "User" WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Service role full access to match explanations"
  ON match_explanations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- AI usage logs: admin only (analytics)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI usage logs admin only"
  ON ai_usage_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- Helper Functions
-- ============================================================

-- Function to search platform knowledge by embedding similarity
CREATE OR REPLACE FUNCTION search_platform_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pk.id,
    pk.category,
    pk.title,
    pk.content,
    1 - (pk.embedding <=> query_embedding) AS similarity
  FROM platform_knowledge pk
  WHERE 1 - (pk.embedding <=> query_embedding) > match_threshold
  ORDER BY pk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search gay world knowledge by embedding similarity
CREATE OR REPLACE FUNCTION search_gay_world_knowledge(
  query_embedding vector(1536),
  filter_category TEXT DEFAULT NULL,
  filter_city TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  subcategory TEXT,
  title TEXT,
  content TEXT,
  location_city TEXT,
  location_area TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gw.id,
    gw.category,
    gw.subcategory,
    gw.title,
    gw.content,
    gw.location_city,
    gw.location_area,
    gw.metadata,
    1 - (gw.embedding <=> query_embedding) AS similarity
  FROM gay_world_knowledge gw
  WHERE 
    1 - (gw.embedding <=> query_embedding) > match_threshold
    AND (filter_category IS NULL OR gw.category = filter_category)
    AND (filter_city IS NULL OR gw.location_city = filter_city)
  ORDER BY gw.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to clean up expired match explanations
CREATE OR REPLACE FUNCTION cleanup_expired_match_explanations()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM match_explanations
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_platform_knowledge_updated ON platform_knowledge;
CREATE TRIGGER trg_platform_knowledge_updated
  BEFORE UPDATE ON platform_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_ai_timestamp();

DROP TRIGGER IF EXISTS trg_gay_world_knowledge_updated ON gay_world_knowledge;
CREATE TRIGGER trg_gay_world_knowledge_updated
  BEFORE UPDATE ON gay_world_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_ai_timestamp();

DROP TRIGGER IF EXISTS trg_ai_conversations_updated ON ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_ai_timestamp();

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE platform_knowledge IS 'Embedded chunks of HOTMESS platform documentation for RAG';
COMMENT ON TABLE gay_world_knowledge IS 'Embedded knowledge about LGBT venues, terminology, culture, health resources';
COMMENT ON TABLE ai_conversations IS 'User conversation history with HOTMESS AI assistant';
COMMENT ON TABLE match_explanations IS 'Cached AI-generated match explanations between users';
COMMENT ON TABLE ai_usage_logs IS 'Analytics for AI feature usage and performance';
