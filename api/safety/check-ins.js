/**
 * Safety Check-ins Cron Job
 * 
 * Runs every 15 minutes to:
 * 1. Find users who ended Right Now 2+ hours ago
 * 2. Send proactive check-in notifications
 * 3. Escalate missed check-ins
 * 
 * Trigger: Vercel Cron or manual GET/POST
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Auth check for cron
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = {
      rightNowCheckins: 0,
      missedCheckins: 0,
      errors: []
    };

    // 1. Check for users who ended Right Now 2-4 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data: rightNowUsers, error: rightNowError } = await supabase
      .from('right_now_status')
      .select('user_id, user_email, ended_at')
      .eq('status', 'ended')
      .lt('ended_at', twoHoursAgo)
      .gt('ended_at', fourHoursAgo);

    if (rightNowError) {
      results.errors.push({ type: 'right_now_query', error: rightNowError.message });
    }

    // Process Right Now check-ins
    for (const user of rightNowUsers || []) {
      try {
        // Check if we already sent a check-in for this session
        const { data: existing } = await supabase
          .from('safety_checkins')
          .select('id')
          .eq('user_email', user.user_email)
          .eq('trigger_type', 'after_right_now')
          .gt('created_at', user.ended_at)
          .limit(1);

        if (existing?.length > 0) continue; // Already sent

        // Create check-in record
        await supabase
          .from('safety_checkins')
          .insert({
            user_email: user.user_email,
            user_id: user.user_id,
            trigger_type: 'after_right_now',
            status: 'pending',
            note: 'Automatic check-in after Right Now session'
          });

        // Send notification
        await supabase
          .from('notification_outbox')
          .insert({
            user_email: user.user_email,
            notification_type: 'safety_checkin',
            title: 'Check-in',
            message: "Hey, just checking in. You good? 💚",
            channel: 'in_app',
            metadata: {
              trigger: 'after_right_now',
              link: '/safety/checkin'
            }
          });

        results.rightNowCheckins++;
      } catch (err) {
        results.errors.push({ type: 'right_now_process', user: user.user_email, error: err.message });
      }
    }

    // 2. Check for missed check-ins (pending for 30+ minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: missedCheckins, error: missedError } = await supabase
      .from('safety_checkins')
      .select('*, trusted_contacts(contact_email, contact_phone, notify_on_checkin)')
      .eq('status', 'pending')
      .lt('created_at', thirtyMinutesAgo)
      .is('escalated_at', null);

    if (missedError) {
      results.errors.push({ type: 'missed_query', error: missedError.message });
    }

    // Process missed check-ins
    for (const checkin of missedCheckins || []) {
      try {
        // Mark as escalated
        await supabase
          .from('safety_checkins')
          .update({ 
            status: 'missed',
            escalated_at: new Date().toISOString()
          })
          .eq('id', checkin.id);

        // Send follow-up notification
        await supabase
          .from('notification_outbox')
          .insert({
            user_email: checkin.user_email,
            notification_type: 'safety_checkin_urgent',
            title: 'Still there?',
            message: "You didn't respond to our check-in. Everything okay? Tap here if you need help.",
            channel: 'in_app',
            metadata: {
              trigger: 'missed_checkin',
              checkin_id: checkin.id,
              link: '/safety/checkin'
            }
          });

        // Notify trusted contacts if configured
        const contactsToNotify = checkin.trusted_contacts?.filter(c => c.notify_on_checkin) || [];
        
        for (const contact of contactsToNotify) {
          if (contact.contact_email) {
            await supabase
              .from('notification_outbox')
              .insert({
                user_email: contact.contact_email,
                notification_type: 'trusted_contact_alert',
                title: 'HOTMESS Safety Alert',
                message: `Your friend missed their safety check-in on HOTMESS. They may need a friendly check-in from you.`,
                channel: 'email',
                metadata: {
                  type: 'missed_checkin',
                  user_email: checkin.user_email
                }
              });
          }
        }

        results.missedCheckins++;
      } catch (err) {
        results.errors.push({ type: 'missed_process', checkin_id: checkin.id, error: err.message });
      }
    }

    // 3. Check for late night active users (2am-5am)
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: lateNightUsers } = await supabase
        .from('User')
        .select('email, display_name')
        .gt('last_active', fiveMinutesAgo)
        .limit(100);

      for (const user of lateNightUsers || []) {
        // Check if we already sent a late night check-in today
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('safety_checkins')
          .select('id')
          .eq('user_email', user.email)
          .eq('trigger_type', 'late_night')
          .gte('created_at', today)
          .limit(1);

        if (existing?.length > 0) continue;

        // Create check-in
        await supabase
          .from('safety_checkins')
          .insert({
            user_email: user.email,
            trigger_type: 'late_night',
            status: 'pending',
            note: 'Late night activity check-in'
          });

        await supabase
          .from('notification_outbox')
          .insert({
            user_email: user.email,
            notification_type: 'safety_checkin',
            title: 'Still up?',
            message: "Everything okay? I'm here if you need anything. 💚",
            channel: 'in_app',
            metadata: {
              trigger: 'late_night',
              link: '/safety/checkin'
            }
          });
      }
    }

    return res.status(200).json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
