/**
 * Video Call Room Creation API
 * 
 * POST /api/video/create-room
 * 
 * Creates a new video call room and notifies the recipient.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmess-globe-fix.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { callerId, recipientId, callType = 'video' } = req.body;

    if (!callerId || !recipientId) {
      return res.status(400).json({ error: 'Missing callerId or recipientId' });
    }

    // Check if users have matched (security check)
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user_id.eq.${callerId},matched_user_id.eq.${recipientId}),and(user_id.eq.${recipientId},matched_user_id.eq.${callerId})`)
      .single();

    if (!match) {
      return res.status(403).json({ error: 'Users must be matched to call' });
    }

    // Check for existing active call between these users
    const { data: existingCall } = await supabase
      .from('video_calls')
      .select('id')
      .in('status', ['pending', 'active'])
      .or(`and(caller_id.eq.${callerId},recipient_id.eq.${recipientId}),and(caller_id.eq.${recipientId},recipient_id.eq.${callerId})`)
      .single();

    if (existingCall) {
      return res.status(409).json({ 
        error: 'Call already in progress',
        callId: existingCall.id
      });
    }

    // Check user's tier for call limits (optional)
    const { data: callerData } = await supabase
      .from('User')
      .select('tier')
      .eq('id', callerId)
      .single();

    const tier = callerData?.tier || 'FREE';
    
    // FREE users: 3 calls/day, PREMIUM: 10, ELITE: unlimited
    const callLimits = { FREE: 3, PREMIUM: 10, ELITE: 999 };
    const today = new Date().toISOString().split('T')[0];
    
    const { count: todayCalls } = await supabase
      .from('video_calls')
      .select('*', { count: 'exact', head: true })
      .eq('caller_id', callerId)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    if (todayCalls >= callLimits[tier]) {
      return res.status(429).json({ 
        error: 'Daily call limit reached',
        limit: callLimits[tier],
        upgrade: tier === 'FREE' ? 'PREMIUM' : tier === 'PREMIUM' ? 'ELITE' : null
      });
    }

    // Create the call room
    const { data: call, error: createError } = await supabase
      .from('video_calls')
      .insert({
        caller_id: callerId,
        recipient_id: recipientId,
        call_type: callType,
        status: 'pending',
        room_token: generateRoomToken()
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Get caller info for notification
    const { data: caller } = await supabase
      .from('User')
      .select('display_name, photo_url')
      .eq('id', callerId)
      .single();

    // Send notification to recipient
    await supabase
      .from('notification_outbox')
      .insert({
        user_id: recipientId,
        notification_type: 'incoming_call',
        title: 'Incoming Call',
        body: `${caller?.display_name || 'Someone'} is calling you`,
        payload: {
          callId: call.id,
          callerId,
          callerName: caller?.display_name,
          callerPhoto: caller?.photo_url,
          callType
        },
        priority: 'high',
        ttl_seconds: 60 // Expire after 1 minute
      });

    // Also queue for Telegram if linked
    const { data: telegramUser } = await supabase
      .from('telegram_users')
      .select('chat_id')
      .eq('user_id', recipientId)
      .single();

    if (telegramUser) {
      await supabase
        .from('telegram_notification_queue')
        .insert({
          user_id: recipientId,
          notification_type: 'incoming_call',
          payload: {
            callerId,
            callerName: caller?.display_name,
            callType,
            answerUrl: `${process.env.APP_URL || 'https://app.hotmess.com'}/call/${call.id}`
          }
        });
    }

    return res.status(200).json({
      callId: call.id,
      roomToken: call.room_token,
      status: 'pending'
    });

  } catch (error) {
    // console.error('Create room error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Generate secure room token
function generateRoomToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
