#!/usr/bin/env node
/**
 * Apply RLS fixes directly to Supabase
 * Run with: node scripts/apply-rls-fixes.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function applyFixes() {
  console.log('\n📝 Applying RLS fixes...\n');

  // Fix 1: Drop problematic conversation_participants policies
  console.log('1️⃣ Fixing conversation_participants RLS...');
  
  const fix1SQL = `
    -- Drop ALL conversation_participants SELECT policies to start fresh
    DROP POLICY IF EXISTS conversation_participants_select_conv ON public.conversation_participants;
    DROP POLICY IF EXISTS conversation_participants_select_own ON public.conversation_participants;
    DROP POLICY IF EXISTS conversation_participants_select ON public.conversation_participants;
    DROP POLICY IF EXISTS conversation_participants_select_unified ON public.conversation_participants;
  `;

  let { error: err1 } = await supabase.rpc('exec_sql', { sql: fix1SQL }).catch(() => ({ error: 'exec_sql not available' }));
  
  // If exec_sql RPC doesn't exist, try direct query approach
  if (err1) {
    console.log('   Using direct approach...');
    
    // We'll use individual policy drops via the REST API workaround
    // Since we can't run raw SQL, we need to check if policies exist and work around it
    
    // Test if the table exists and has data
    const { data: testData, error: testErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .limit(1);
    
    if (testErr) {
      if (testErr.message.includes('infinite recursion')) {
        console.log('   ⚠️  Infinite recursion detected - this requires manual SQL fix');
        console.log('   📋 Copy this SQL to Supabase SQL Editor:\n');
        console.log(`
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Step 1: Drop ALL problematic policies
DROP POLICY IF EXISTS conversation_participants_select_conv ON public.conversation_participants;
DROP POLICY IF EXISTS conversation_participants_select_own ON public.conversation_participants;
DROP POLICY IF EXISTS conversation_participants_select ON public.conversation_participants;
DROP POLICY IF EXISTS conversation_participants_select_unified ON public.conversation_participants;

-- Step 2: Create the security definer function
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

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated;

-- Step 3: Create unified policy (avoids recursion)
CREATE POLICY conversation_participants_select_unified
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    account_id = auth.uid()
    OR
    public.is_conversation_participant(conversation_id)
  );
`);
      } else {
        console.log('   Table access error:', testErr.message);
      }
    } else {
      console.log('   ✅ Table accessible (no recursion issue currently)');
    }
  }

  // Fix 2: Create send_notification function
  console.log('\n2️⃣ Creating send_notification function...');
  
  const sendNotificationSQL = `
-- Create secure notification function
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
  v_sender_email := auth.jwt() ->> 'email';
  
  IF v_sender_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE email = p_user_email) THEN
    RETURN NULL;
  END IF;
  
  IF p_type NOT IN (
    'message', 'follow', 'like', 'comment', 'mention', 'event', 'beacon', 
    'handshake', 'system', 'welcome', 'achievement', 'premium_sale',
    'new_follower', 'feature_unlocked', 'xp_earned', 'level_up',
    'order', 'escrow_release', 'post_comment', 'post_like', 'event_reminder',
    'admin_alert', 'verification', 'flagged_post', 'shadow_beacon'
  ) THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;
  
  IF (
    SELECT COUNT(*) 
    FROM notifications 
    WHERE metadata->>'sender_email' = v_sender_email
    AND created_at > NOW() - INTERVAL '1 minute'
  ) >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;
  
  INSERT INTO notifications (
    user_email, type, title, message, link, metadata, read, created_at, created_date
  ) VALUES (
    p_user_email, p_type, p_title, LEFT(p_message, 500), p_link,
    p_metadata || jsonb_build_object('sender_email', v_sender_email),
    false, NOW(), NOW()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_notification(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
`;

  console.log('   📋 Copy this SQL to Supabase SQL Editor:\n');
  console.log(sendNotificationSQL);

  // Test notifications table access
  console.log('\n3️⃣ Testing notifications table...');
  const { error: notifErr } = await supabase
    .from('notifications')
    .select('id')
    .limit(1);
  
  if (notifErr) {
    console.log('   ⚠️  Notifications access issue:', notifErr.message);
  } else {
    console.log('   ✅ Notifications table accessible');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📌 SUMMARY');
  console.log('='.repeat(60));
  console.log(`
To fix the database issues, run the SQL above in:
  Supabase Dashboard → SQL Editor → New Query

Direct link:
  https://supabase.com/dashboard/project/axxwdjmbwkvqhcpwters/sql/new

Or run the full migration file:
  supabase/migrations/20260127950000_fix_notifications_and_conversation_participants.sql
`);
}

applyFixes().catch(console.error);
