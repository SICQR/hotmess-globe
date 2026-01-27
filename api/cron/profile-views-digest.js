/**
 * Vercel Cron: Profile Views Digest
 * 
 * Sends batched notifications to users about profile views.
 * Runs daily at 6pm to notify users who had profile views that day.
 * 
 * Schedule: 0 18 * * * (6pm daily)
 */

import { createClient } from '@supabase/supabase-js';
import { json, getEnv } from '../shopify/_utils.js';

const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Verify cron secret in production
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (cronSecret && auth !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    return json(res, 401, { error: 'Unauthorized' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(res, 200, { success: true, message: 'Skipped (missing env)', processed: 0 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get profile views from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Group views by viewed_email and count
    const { data: viewCounts, error: viewError } = await supabase
      .from('profile_views')
      .select('viewed_email')
      .gte('viewed_at', todayISO);

    if (viewError) {
      console.error('[ProfileViewsDigest] Error fetching views:', viewError);
      return json(res, 500, { error: 'Failed to fetch views' });
    }

    if (!viewCounts?.length) {
      return json(res, 200, { success: true, message: 'No views today', processed: 0 });
    }

    // Count views per user
    const viewsByUser = viewCounts.reduce((acc, { viewed_email }) => {
      acc[viewed_email] = (acc[viewed_email] || 0) + 1;
      return acc;
    }, {});

    // Filter to users with 3+ views (worth notifying)
    const usersToNotify = Object.entries(viewsByUser)
      .filter(([_, count]) => count >= 3)
      .map(([email, count]) => ({ email, count }));

    if (!usersToNotify.length) {
      return json(res, 200, { success: true, message: 'No users with 3+ views', processed: 0 });
    }

    // Check which users we've already notified today
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('user_email')
      .eq('type', 'profile_views')
      .gte('created_at', todayISO)
      .in('user_email', usersToNotify.map(u => u.email));

    const alreadyNotified = new Set((existingNotifs || []).map(n => n.user_email));
    const toNotify = usersToNotify.filter(u => !alreadyNotified.has(u.email));

    if (!toNotify.length) {
      return json(res, 200, { success: true, message: 'All users already notified', processed: 0 });
    }

    // Create notifications
    const notifications = toNotify.map(({ email, count }) => ({
      user_email: email,
      type: 'profile_views',
      title: 'Your profile is getting attention',
      message: `${count} people viewed your profile today`,
      link: 'Profile',
      metadata: { view_count: count, date: todayISO },
      read: false,
      created_at: new Date().toISOString(),
      created_date: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('[ProfileViewsDigest] Error creating notifications:', insertError);
      return json(res, 500, { error: 'Failed to create notifications' });
    }

    console.log(`[ProfileViewsDigest] Notified ${toNotify.length} users about profile views`);
    return json(res, 200, { 
      success: true, 
      processed: toNotify.length,
      totalViews: viewCounts.length,
    });

  } catch (error) {
    console.error('[ProfileViewsDigest] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
