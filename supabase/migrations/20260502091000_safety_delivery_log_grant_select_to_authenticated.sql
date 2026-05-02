-- The sdl_owner_read RLS policy filters rows but a policy alone doesn't grant
-- table access. The earlier migration (20260502060000) revoked all from
-- authenticated, so the policy was unusable. Grant SELECT back so owners can
-- read their delivery trail. INSERT/UPDATE/DELETE remain revoked.
GRANT SELECT ON safety_delivery_log TO authenticated;
