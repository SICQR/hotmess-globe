import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getEnv, json } from '../shopify/_utils.js';

/**
 * WebRTC Signaling Server
 * Handles offer/answer exchange and ICE candidate relay via Supabase Realtime
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Add TURN server for NAT traversal if configured
  ...(process.env.TURN_SERVER_URL ? [{
    urls: process.env.TURN_SERVER_URL,
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
  }] : []),
];

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return json(res, 500, { error: 'Server configuration error' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Missing authorization token' });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken);
  if (authError || !user) {
    return json(res, 401, { error: 'Invalid authorization token' });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // GET - Get ICE servers configuration
  if (req.method === 'GET') {
    return json(res, 200, {
      iceServers: ICE_SERVERS,
      userId: user.id,
    });
  }

  // POST - Handle signaling messages
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return json(res, 405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const { type, targetUserId, callId, payload } = body;

  if (!type || !targetUserId) {
    return json(res, 400, { error: 'Missing required fields: type, targetUserId' });
  }

  try {
    switch (type) {
      case 'call-request': {
        // Initiate a call
        const newCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store call in database
        await serviceClient.from('video_calls').insert({
          id: newCallId,
          caller_id: user.id,
          callee_id: targetUserId,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

        // Send notification to target user
        await serviceClient.from('rtc_signals').insert({
          call_id: newCallId,
          from_user_id: user.id,
          to_user_id: targetUserId,
          type: 'incoming-call',
          payload: {
            callerId: user.id,
            callerName: user.user_metadata?.full_name || 'Unknown',
            callerAvatar: user.user_metadata?.avatar_url,
          },
          created_at: new Date().toISOString(),
        });

        return json(res, 200, { callId: newCallId });
      }

      case 'call-accept': {
        if (!callId) {
          return json(res, 400, { error: 'Missing callId' });
        }

        // Update call status
        await serviceClient.from('video_calls')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', callId);

        // Notify caller
        await serviceClient.from('rtc_signals').insert({
          call_id: callId,
          from_user_id: user.id,
          to_user_id: targetUserId,
          type: 'call-accepted',
          payload: {},
          created_at: new Date().toISOString(),
        });

        return json(res, 200, { success: true });
      }

      case 'call-reject':
      case 'call-end': {
        if (!callId) {
          return json(res, 400, { error: 'Missing callId' });
        }

        // Update call status
        await serviceClient.from('video_calls')
          .update({ 
            status: type === 'call-reject' ? 'rejected' : 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', callId);

        // Notify other party
        await serviceClient.from('rtc_signals').insert({
          call_id: callId,
          from_user_id: user.id,
          to_user_id: targetUserId,
          type: type === 'call-reject' ? 'call-rejected' : 'call-ended',
          payload: {},
          created_at: new Date().toISOString(),
        });

        return json(res, 200, { success: true });
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        if (!callId || !payload) {
          return json(res, 400, { error: 'Missing callId or payload' });
        }

        // Relay signaling message
        await serviceClient.from('rtc_signals').insert({
          call_id: callId,
          from_user_id: user.id,
          to_user_id: targetUserId,
          type,
          payload,
          created_at: new Date().toISOString(),
        });

        return json(res, 200, { success: true });
      }

      default:
        return json(res, 400, { error: `Unknown signal type: ${type}` });
    }
  } catch (error) {
    console.error('RTC signal error:', error);
    return json(res, 500, { error: error.message });
  }
}
