-- ============================================================================
-- AI KNOWLEDGE TABLES
-- Phase 1: AI Core Foundation
-- ============================================================================

-- Platform knowledge base (embedded docs for RAG)
CREATE TABLE IF NOT EXISTS platform_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'feature', 'policy', 'faq', 'guide'
  subcategory TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- For OpenAI embeddings
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gay world knowledge (venues, terminology, health)
CREATE TABLE IF NOT EXISTS gay_world_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'venue', 'terminology', 'health', 'event'
  subcategory TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  location_city TEXT,
  location_area TEXT,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI conversation history
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]', -- Array of {role, content, timestamp}
  context JSONB DEFAULT '{}', -- Page context, user state
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Match explanations (cached AI explanations)
CREATE TABLE IF NOT EXISTS match_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  explanation TEXT NOT NULL,
  match_score INT,
  reasons JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(viewer_id, profile_id)
);

-- AI usage logs (analytics)
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "User"(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL, -- 'chat', 'wingman', 'scene_scout', etc.
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  model TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_knowledge_category ON platform_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_platform_knowledge_search ON platform_knowledge USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_gay_world_knowledge_category ON gay_world_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_gay_world_knowledge_location ON gay_world_knowledge(location_city, location_area);
CREATE INDEX IF NOT EXISTS idx_gay_world_knowledge_search ON gay_world_knowledge USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_match_explanations_viewer ON match_explanations(viewer_id);
CREATE INDEX IF NOT EXISTS idx_match_explanations_profile ON match_explanations(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_endpoint ON ai_usage_logs(endpoint);

-- Update search vectors on insert/update
CREATE OR REPLACE FUNCTION update_platform_knowledge_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.title || ' ' || NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_knowledge_search_update
  BEFORE INSERT OR UPDATE ON platform_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_platform_knowledge_search();

CREATE OR REPLACE FUNCTION update_gay_world_knowledge_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.title || ' ' || NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gay_world_knowledge_search_update
  BEFORE INSERT OR UPDATE ON gay_world_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_gay_world_knowledge_search();

-- RLS Policies
ALTER TABLE platform_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE gay_world_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Public read for knowledge bases
CREATE POLICY "Anyone can read platform knowledge"
  ON platform_knowledge FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read gay world knowledge"
  ON gay_world_knowledge FOR SELECT
  USING (true);

-- Users can only access their own conversations
CREATE POLICY "Users can read own conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can read match explanations where they're the viewer
CREATE POLICY "Users can read own match explanations"
  ON match_explanations FOR SELECT
  USING (auth.uid() = viewer_id);

-- Service role can manage everything (for API endpoints)
CREATE POLICY "Service role full access platform_knowledge"
  ON platform_knowledge FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access gay_world_knowledge"
  ON gay_world_knowledge FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access ai_conversations"
  ON ai_conversations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access match_explanations"
  ON match_explanations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access ai_usage_logs"
  ON ai_usage_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
