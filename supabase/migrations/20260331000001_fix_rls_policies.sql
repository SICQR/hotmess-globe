-- Fix market_sellers RLS policies
-- market_sellers was RLS enabled but had zero policies (anyone could read/write)

-- Enable RLS on market_sellers (in case it's not already)
ALTER TABLE IF EXISTS market_sellers ENABLE ROW LEVEL SECURITY;

-- market_sellers: SELECT only approved sellers
CREATE POLICY IF NOT EXISTS "market_sellers_select_approved" ON market_sellers
  FOR SELECT
  USING (status = 'approved');

-- market_sellers: UPDATE own records (owner can update their own profile)
CREATE POLICY IF NOT EXISTS "market_sellers_update_own" ON market_sellers
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- market_sellers: INSERT by authenticated users
CREATE POLICY IF NOT EXISTS "market_sellers_insert_auth" ON market_sellers
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND status = 'pending');

-- market_sellers: DELETE own records
CREATE POLICY IF NOT EXISTS "market_sellers_delete_own" ON market_sellers
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Fix analytics_events: admin only
ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "analytics_events_admin_only" ON analytics_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'user_role' = 'admin');

-- Fix audit_logs: admin only
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_logs_admin_only" ON audit_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'user_role' = 'admin');

-- Fix affiliate_relations: own records
ALTER TABLE IF EXISTS affiliate_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "affiliate_relations_select_own" ON affiliate_relations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "affiliate_relations_update_own" ON affiliate_relations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "affiliate_relations_delete_own" ON affiliate_relations
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "affiliate_relations_insert_own" ON affiliate_relations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
