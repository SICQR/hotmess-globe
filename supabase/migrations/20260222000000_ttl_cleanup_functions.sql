-- TTL Cleanup Functions
-- Runs via pg_cron or external scheduler every 5 minutes

-- 1. Clean expired presence records (older than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_expired_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM presence_locations
  WHERE updated_at < NOW() - INTERVAL '10 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2. Clean expired beacons (past their expires_at)
CREATE OR REPLACE FUNCTION cleanup_expired_beacons()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM beacons
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3. Clean old notification outbox (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM notification_outbox
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('sent', 'failed');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 4. Clean expired session tokens
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Clean bot sessions
  DELETE FROM bot_sessions
  WHERE token_expires_at IS NOT NULL 
    AND token_expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 5. Master cleanup function (call this from cron)
CREATE OR REPLACE FUNCTION run_ttl_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  presence_count integer := 0;
  beacon_count integer := 0;
  notification_count integer := 0;
  session_count integer := 0;
BEGIN
  -- Run all cleanup functions
  SELECT cleanup_expired_presence() INTO presence_count;
  SELECT cleanup_expired_beacons() INTO beacon_count;
  SELECT cleanup_old_notifications() INTO notification_count;
  SELECT cleanup_expired_sessions() INTO session_count;
  
  result := jsonb_build_object(
    'timestamp', NOW(),
    'deleted', jsonb_build_object(
      'presence', presence_count,
      'beacons', beacon_count,
      'notifications', notification_count,
      'sessions', session_count
    ),
    'total', presence_count + beacon_count + notification_count + session_count
  );
  
  -- Log to audit
  INSERT INTO audit_log (action, details, created_at)
  VALUES ('ttl_cleanup', result, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN result;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_presence TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_beacons TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION run_ttl_cleanup TO service_role;

-- If pg_cron is enabled, schedule the job (run manually in SQL editor):
-- SELECT cron.schedule('ttl-cleanup', '*/5 * * * *', 'SELECT run_ttl_cleanup()');
