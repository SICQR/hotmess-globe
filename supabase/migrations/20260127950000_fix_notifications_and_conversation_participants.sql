-- =============================================================================
-- Fix #1: conversation_participants infinite recursion
-- The is_conversation_participant function may already exist, but we ensure
-- the policy properly uses it without recursion.
-- =============================================================================

-- Drop ALL conversation_participants SELECT policies to start fresh
DROP POLICY IF EXISTS conversation_participants_select_conv ON public.conversation_participants;
DROP POLICY IF EXISTS conversation_participants_select_own ON public.conversation_participants;
DROP POLICY IF EXISTS conversation_participants_select ON public.conversation_participants;

-- Create/replace the security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND account_id = auth.uid()
  )
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated;

-- Create a SINGLE unified SELECT policy that avoids recursion
-- This policy allows:
-- 1. Users to see their own participation records (direct check)
-- 2. Users to see other participants in conversations they're part of (via function)
CREATE POLICY conversation_participants_select_unified
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    -- Direct ownership check (no recursion)
    account_id = auth.uid()
    OR
    -- Function-based check for other participants (bypasses RLS via SECURITY DEFINER)
    public.is_conversation_participant(conversation_id)
  );

-- =============================================================================
-- Fix #2: Allow authenticated users to send notifications to others
-- Create a SECURITY DEFINER function for sending notifications safely
-- =============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.send_notification(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

-- Create a secure function to send notifications to any user
-- This function validates inputs and prevents abuse
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_email TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_sender_email TEXT;
BEGIN
  -- Get the sender email from auth context
  v_sender_email := auth.jwt() ->> 'email';
  
  -- Validate that sender is authenticated
  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate target user exists in User table
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE email = p_user_email) THEN
    -- Silently skip if user doesn't exist (don't reveal user existence)
    RETURN NULL;
  END IF;
  
  -- Validate notification type (whitelist allowed types)
  IF p_type NOT IN (
    'message', 'follow', 'like', 'comment', 'mention', 'event', 'beacon', 
    'handshake', 'system', 'welcome', 'achievement', 'premium_sale',
    'new_follower', 'feature_unlocked', 'xp_earned', 'level_up',
    'order', 'escrow_release', 'post_comment', 'post_like', 'event_reminder',
    'admin_alert', 'verification', 'flagged_post', 'shadow_beacon'
  ) THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;
  
  -- Rate limit: max 10 notifications per minute per sender
  IF (
    SELECT COUNT(*) 
    FROM notifications 
    WHERE metadata->>'sender_email' = v_sender_email
    AND created_at > NOW() - INTERVAL '1 minute'
  ) >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;
  
  -- Insert the notification
  INSERT INTO notifications (
    user_email,
    type,
    title,
    message,
    link,
    metadata,
    read,
    created_at,
    created_date
  ) VALUES (
    p_user_email,
    p_type,
    p_title,
    LEFT(p_message, 500), -- Limit message length
    p_link,
    p_metadata || jsonb_build_object('sender_email', v_sender_email),
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.send_notification(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- =============================================================================
-- Add RLS policy to allow service role to insert any notification
-- (For server-side API endpoints)
-- =============================================================================

-- Add a policy for service role (API endpoints)
DROP POLICY IF EXISTS notifications_insert_service ON public.notifications;
CREATE POLICY notifications_insert_service ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

-- =============================================================================
-- IMPORTANT: Run this migration in Supabase SQL Editor to apply fixes
-- =============================================================================
