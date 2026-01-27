/**
 * Push Notification Send API
 * 
 * Sends push notifications to users.
 * Uses web-push library for VAPID authentication.
 */

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Lazy initialization of Supabase client
let _supabase = null;

const getSupabase = () => {
  if (_supabase) return _supabase;
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.warn('[PushSend] Missing Supabase configuration');
    return null;
  }
  
  _supabase = createClient(url, key);
  return _supabase;
};

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'notifications@hotmess.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Notification types with their configurations
 */
const NOTIFICATION_CONFIGS = {
  new_match: {
    title: (data) => `${data.matchScore}% Match Found!`,
    body: (data) => `${data.matchName} is a great match for you.`,
    icon: '/icons/match-icon.png',
    url: (data) => `/profile/${data.matchId}`,
    ttl: 3600,
  },
  live_match: {
    title: (data) => `${data.matchName} is Live!`,
    body: (data) => `Your ${data.matchScore}% match is available right now.`,
    icon: '/icons/live-icon.png',
    url: (data) => `/social?live=true`,
    ttl: 1800,
  },
  new_message: {
    title: (data) => `New message from ${data.senderName}`,
    body: (data) => data.preview || 'Sent you a message',
    icon: '/icons/message-icon.png',
    url: (data) => `/messages/${data.threadId}`,
    ttl: 3600,
  },
  weekly_digest: {
    title: () => 'Your Weekly Matches',
    body: (data) => `You have ${data.matchCount} new high matches this week!`,
    icon: '/icons/weekly-icon.png',
    url: () => '/social?sort=match',
    ttl: 86400,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  // Verify admin/cron authorization
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    // Also check for service role
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user?.app_metadata?.admin) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { type, userId, userIds, data } = req.body;

    if (!type || !NOTIFICATION_CONFIGS[type]) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    // Get subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else {
      return res.status(400).json({ error: 'userId or userIds required' });
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, reason: 'No subscriptions' });
    }

    // Build notification payload
    const config = NOTIFICATION_CONFIGS[type];
    const payload = JSON.stringify({
      title: config.title(data),
      body: config.body(data),
      icon: config.icon,
      badge: '/icons/badge.png',
      data: {
        type,
        url: config.url(data),
        ...data,
      },
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload,
            {
              TTL: config.ttl,
            }
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (err) {
          // Remove invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }
          return { success: false, endpoint: sub.endpoint, error: err.message };
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).length;

    return res.status(200).json({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
