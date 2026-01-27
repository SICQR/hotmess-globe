-- ============================================================================
-- ENABLE SUPABASE REALTIME ON ALL REQUIRED TABLES
-- ============================================================================
-- This migration adds all tables used by postgres_changes subscriptions
-- to the supabase_realtime publication.
--
-- Without this, realtime subscriptions will silently fail to receive updates.
-- ============================================================================

-- Helper function to safely add table to publication
CREATE OR REPLACE FUNCTION add_table_to_realtime(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- Already in publication
  WHEN undefined_object THEN NULL;  -- Publication doesn't exist (local dev)
  WHEN undefined_table THEN NULL;   -- Table doesn't exist yet
  WHEN insufficient_privilege THEN NULL;
  WHEN others THEN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CORE TABLES FOR GLOBE/PULSE REALTIME
-- ============================================================================

-- right_now_status: Live availability status (green pins on globe)
SELECT add_table_to_realtime('right_now_status');

-- Beacon: Events, venues, drops (pink pins on globe)
SELECT add_table_to_realtime('Beacon');

-- UserActivity: Activity streams (animated arcs on globe)
SELECT add_table_to_realtime('UserActivity');

-- ============================================================================
-- SOCIAL/MESSAGING TABLES
-- ============================================================================

-- User: Profile updates (for nearby invalidation)
-- Already added in 20260108090000_realtime_publication_user.sql
-- Adding here as fallback
SELECT add_table_to_realtime('User');

-- notifications: Push notifications
SELECT add_table_to_realtime('notifications');

-- messaging_messages: Chat messages
SELECT add_table_to_realtime('messaging_messages');

-- messaging_threads: Chat threads
SELECT add_table_to_realtime('messaging_threads');

-- ============================================================================
-- MARKETPLACE TABLES
-- ============================================================================

-- orders: Order status updates
SELECT add_table_to_realtime('orders');

-- products: Product availability updates
SELECT add_table_to_realtime('products');

-- ============================================================================
-- ADDITIONAL TABLES FOR REALTIME FEATURES
-- ============================================================================

-- user_follows: Follow notifications
SELECT add_table_to_realtime('user_follows');

-- user_friendships: Friend request notifications
SELECT add_table_to_realtime('user_friendships');

-- EventRSVP: RSVP updates
SELECT add_table_to_realtime('EventRSVP');

-- subscriptions: Premium subscription updates
SELECT add_table_to_realtime('subscriptions');

-- Cleanup helper function
DROP FUNCTION IF EXISTS add_table_to_realtime(text);

-- ============================================================================
-- VERIFY PUBLICATION (for debugging)
-- ============================================================================
-- Run this query to see all tables in the realtime publication:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
