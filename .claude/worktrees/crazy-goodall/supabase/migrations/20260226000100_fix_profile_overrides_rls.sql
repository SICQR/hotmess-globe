-- Fix profile_overrides and related persona RLS policies
-- The original policies used `id = auth.uid()` but "User".id is an internal UUID
-- that is NOT the same as auth.uid() (which is auth.users.id).
-- The correct join is `auth_user_id = auth.uid()`.

-- profile_overrides
DROP POLICY IF EXISTS "Users manage own overrides" ON profile_overrides;
CREATE POLICY "Users manage own overrides"
  ON profile_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = profile_overrides.profile_id
        AND (auth_user_id = auth.uid() OR parent_profile_id IN (
          SELECT id FROM "User" WHERE auth_user_id = auth.uid()
        ))
    )
  );

-- profile_visibility_rules
DROP POLICY IF EXISTS "Users manage own visibility" ON profile_visibility_rules;
CREATE POLICY "Users manage own visibility"
  ON profile_visibility_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = profile_visibility_rules.profile_id
        AND (auth_user_id = auth.uid() OR parent_profile_id IN (
          SELECT id FROM "User" WHERE auth_user_id = auth.uid()
        ))
    )
  );

-- profile_allowlist_users
DROP POLICY IF EXISTS "Users manage own allowlist" ON profile_allowlist_users;
CREATE POLICY "Users manage own allowlist"
  ON profile_allowlist_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = profile_allowlist_users.profile_id
        AND (auth_user_id = auth.uid() OR parent_profile_id IN (
          SELECT id FROM "User" WHERE auth_user_id = auth.uid()
        ))
    )
  );

-- profile_blocklist_users
DROP POLICY IF EXISTS "Users manage own blocklist" ON profile_blocklist_users;
CREATE POLICY "Users manage own blocklist"
  ON profile_blocklist_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE id = profile_blocklist_users.profile_id
        AND (auth_user_id = auth.uid() OR parent_profile_id IN (
          SELECT id FROM "User" WHERE auth_user_id = auth.uid()
        ))
    )
  );
