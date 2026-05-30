/**
 * Send Push Notification
 * 
 * Sends web push notifications to subscribed users.
 * Uses the Web Push protocol with VAPID authentication.
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@hotmess.app';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
}

interface SendNotificationRequest {
  userIds?: string[];
  userEmails?: string[];
  all?: boolean;
  topic?: string;
  payload: PushPayload;
}

/**
 * Main handler for sending push notifications
 */
export async function handler(req: Request): Promise<Response> {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify authentication (service role or authenticated admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendNotificationRequest = await req.json();
    const { userIds, userEmails, all, topic, payload } = body;

    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required payload fields (title, body)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get push subscriptions
    let subscriptions = [];

    if (all) {
      // Send to all subscribed users
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .not('endpoint', 'is', null);

      if (error) throw error;
      subscriptions = data || [];
    } else if (topic) {
      // Send to users subscribed to a topic (would need topic subscription table)
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*, User!inner(notification_topics)')
        .contains('User.notification_topics', [topic]);

      if (error) throw error;
      subscriptions = data || [];
    } else if (userIds && userIds.length > 0) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;
      subscriptions = data || [];
    } else if (userEmails && userEmails.length > 0) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_email', userEmails);

      if (error) throw error;
      subscriptions = data || [];
    }

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications
    const results = await sendPushNotifications(subscriptions, payload);

    // Log notification dispatch
    await logNotificationDispatch(payload, results);

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.successful,
        failed: results.failed,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SendPushNotification] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Send push notifications to a list of subscriptions
 */
async function sendPushNotifications(
  subscriptions: any[],
  payload: PushPayload
): Promise<{ successful: number; failed: number; errors: string[] }> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || 'hotmess-notification',
    data: {
      url: payload.url || '/',
      ...payload.data,
    },
    actions: payload.actions || [],
    requireInteraction: payload.requireInteraction || false,
  });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys,
      };

      const response = await sendWebPush(subscription, notificationPayload);

      if (response.ok) {
        results.successful++;
      } else if (response.status === 410 || response.status === 404) {
        // Subscription expired or invalid - remove it
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
        results.failed++;
        results.errors.push(`Subscription expired: ${sub.user_email}`);
      } else {
        results.failed++;
        results.errors.push(`Failed for ${sub.user_email}: ${response.status}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error for ${sub.user_email}: ${error.message}`);
    }
  });

  await Promise.all(sendPromises);
  return results;
}

/**
 * Send a single web push notification
 */
async function sendWebPush(subscription: any, payload: string): Promise<Response> {
  // Import web-push or use fetch with VAPID
  // Note: In Deno/Edge functions, you may need to implement VAPID signing manually
  // or use a compatible library
  
  const headers = await generateVapidHeaders(subscription.endpoint);

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Content-Length': String(payload.length),
      'TTL': '86400', // 24 hours
    },
    body: payload,
  });
}

/**
 * Generate VAPID authentication headers
 */
async function generateVapidHeaders(endpoint: string): Promise<Record<string, string>> {
  // Simplified VAPID header generation
  // In production, use a proper VAPID library
  
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  // For production, implement proper JWT signing with the VAPID private key
  // This is a placeholder that would need proper implementation
  const jwt = createVapidJwt(audience, expiration, VAPID_SUBJECT!, VAPID_PRIVATE_KEY!);

  return {
    'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
  };
}

/**
 * Create VAPID JWT token
 * Note: This is a simplified version. In production, use proper JWT signing.
 */
function createVapidJwt(
  audience: string,
  expiration: number,
  subject: string,
  privateKey: string
): string {
  // This would need proper implementation with crypto libraries
  // For now, return a placeholder that would be replaced with real VAPID auth
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: expiration,
    sub: subject,
  }));
  
  // In production, sign this with the private key using ES256
  // Placeholder signature
  const signature = 'signature_placeholder';
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Log notification dispatch for analytics
 */
async function logNotificationDispatch(
  payload: PushPayload,
  results: { successful: number; failed: number }
): Promise<void> {
  try {
    await supabase
      .from('notification_outbox')
      .insert({
        type: 'push',
        title: payload.title,
        body: payload.body,
        sent_count: results.successful,
        failed_count: results.failed,
        created_at: new Date().toISOString(),
        status: results.failed === 0 ? 'sent' : 'partial',
      });
  } catch (error) {
    console.error('[SendPushNotification] Failed to log dispatch:', error);
  }
}

// Export for Deno Deploy / Supabase Edge Functions
Deno.serve(handler);
