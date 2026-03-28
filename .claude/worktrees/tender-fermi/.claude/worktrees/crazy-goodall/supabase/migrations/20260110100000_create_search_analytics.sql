-- Search Analytics Tables
-- Track search patterns for optimization and suggestions

-- Search queries table
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  clicked_result_id TEXT,
  clicked_result_type TEXT,
  search_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_email);

-- Popular searches view (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_searches AS
SELECT 
  query,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_email) as unique_users,
  AVG(results_count) as avg_results,
  MAX(created_at) as last_searched
FROM search_queries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY search_count DESC
LIMIT 100;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_searches_query ON popular_searches(query);

-- Function to refresh popular searches
CREATE OR REPLACE FUNCTION refresh_popular_searches()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_searches;
END;
$$ LANGUAGE plpgsql;

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  alert_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, query)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_email);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alert ON saved_searches(alert_enabled) WHERE alert_enabled = true;

-- RLS Policies
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own search history
CREATE POLICY "Users can view own searches"
  ON search_queries
  FOR SELECT
  TO authenticated
  USING (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- Users can insert their own searches
CREATE POLICY "Users can log searches"
  ON search_queries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()) OR user_email IS NULL);

-- Users can manage their saved searches
CREATE POLICY "Users can manage saved searches"
  ON saved_searches
  FOR ALL
  TO authenticated
  USING (user_email = (SELECT email FROM "User" WHERE auth_user_id = auth.uid()));

-- Full-text search configuration for beacons
CREATE INDEX IF NOT EXISTS idx_beacon_fts ON "Beacon" USING gin(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, ''))
);

-- Full-text search configuration for users
CREATE INDEX IF NOT EXISTS idx_user_fts ON "User" USING gin(
  to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(bio, ''))
);

-- Full-text search function for beacons
CREATE OR REPLACE FUNCTION search_beacons(search_query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS SETOF "Beacon" AS $$
BEGIN
  RETURN QUERY
  SELECT b.*
  FROM "Beacon" b
  WHERE 
    to_tsvector('english', coalesce(b.title, '') || ' ' || coalesce(b.description, '') || ' ' || coalesce(b.city, ''))
    @@ plainto_tsquery('english', search_query)
  ORDER BY 
    ts_rank(
      to_tsvector('english', coalesce(b.title, '') || ' ' || coalesce(b.description, '') || ' ' || coalesce(b.city, '')),
      plainto_tsquery('english', search_query)
    ) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Full-text search function for users
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS SETOF "User" AS $$
BEGIN
  RETURN QUERY
  SELECT u.*
  FROM "User" u
  WHERE 
    to_tsvector('english', coalesce(u.full_name, '') || ' ' || coalesce(u.display_name, '') || ' ' || coalesce(u.bio, ''))
    @@ plainto_tsquery('english', search_query)
  ORDER BY 
    ts_rank(
      to_tsvector('english', coalesce(u.full_name, '') || ' ' || coalesce(u.display_name, '') || ' ' || coalesce(u.bio, '')),
      plainto_tsquery('english', search_query)
    ) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE search_queries IS 'Tracks all search queries for analytics and optimization';
COMMENT ON TABLE saved_searches IS 'User-saved searches for quick access and alerts';
COMMENT ON MATERIALIZED VIEW popular_searches IS 'Cached view of popular search queries from the last 7 days';
