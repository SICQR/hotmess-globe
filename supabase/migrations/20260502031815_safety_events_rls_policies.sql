DROP POLICY IF EXISTS "users_insert_own_safety_events" ON safety_events;
DROP POLICY IF EXISTS "users_read_own_safety_events" ON safety_events;
CREATE POLICY "users_insert_own_safety_events" ON safety_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_read_own_safety_events" ON safety_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
GRANT INSERT, SELECT ON safety_events TO service_role;
REVOKE UPDATE, DELETE ON safety_events FROM authenticated, anon;
