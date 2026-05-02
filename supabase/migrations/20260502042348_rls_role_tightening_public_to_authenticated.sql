-- Replace {public} role with {authenticated} on 4 tables flagged in v6 verification report
-- The auth.uid() check makes these effectively safe already, but tightening the role is best practice

-- blocks
DROP POLICY IF EXISTS "Users can manage own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can see if blocked" ON blocks;
CREATE POLICY "blocks_manage_own" ON blocks FOR ALL TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "blocks_see_if_blocked" ON blocks FOR SELECT TO authenticated USING (auth.uid() = blocked_id);

-- location_shares
DROP POLICY IF EXISTS "Users can manage own shares" ON location_shares;
CREATE POLICY "location_shares_manage_own" ON location_shares FOR ALL TO authenticated USING (auth.uid() = user_id);

-- saved_items
DROP POLICY IF EXISTS "Users can manage own saves" ON saved_items;
CREATE POLICY "saved_items_manage_own" ON saved_items FOR ALL TO authenticated USING (auth.uid() = user_id);

-- user_active_boosts
DROP POLICY IF EXISTS "boosts_insert_own" ON user_active_boosts;
DROP POLICY IF EXISTS "boosts_read_own" ON user_active_boosts;
CREATE POLICY "boosts_insert_own" ON user_active_boosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "boosts_read_own" ON user_active_boosts FOR SELECT TO authenticated USING (auth.uid() = user_id);
