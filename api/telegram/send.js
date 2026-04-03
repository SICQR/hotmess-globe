/**
 * Telegram Notification Sender
 * 
 * POST /api/telegram/send (cron job)
 * 
 * Processes telegram_notification_queue and sends messages.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CRON_SECRET = process.env.CRON_SECRET;

// Message templates
const TEMPLATES = {
  new_match: (data) => `
🔥 *New Match!*

${data.match_name || 'Someone'} matched with you!

${data.match_preview || ''}

[View Profile](${data.profile_url || 'https://app.hotmess.com'})
  `.trim(),

  new_message: (data) => `
💬 *New Message*

From: ${data.sender_name || 'Someone'}

"${data.message_preview || '...'}"

[Reply](${data.conversation_url || 'https://app.hotmess.com/messages'})
  `.trim(),

  event_nearby: (data) => `
🎉 *Event Drop!*

*${data.event_title || 'New Event'}*
📍 ${data.venue || 'Near you'}
📅 ${data.date || 'Soon'}

${data.description || ''}

${data.ticket_url ? `[Get Tickets](${data.ticket_url})` : '[View Details](https://app.hotmess.com/events)'}
  `.trim(),

  product_drop: (data) => `
🛍️ *MESSMARKET Drop*

*${data.product_name || 'New Product'}*
💰 £${data.price || '??'}

${data.description || ''}

[Shop Now](${data.product_url || 'https://app.hotmess.com/shop'})
  `.trim(),

  safety_checkin: (data) => `
💚 *Safety Check-in*

Hey, just checking in! Everything okay?

${data.context || ''}

Tap below to respond:
  `.trim(),

  streak_reminder: (data) => `
🔥 *Streak Alert!*

Your ${data.streak_days || '?'}-day streak is about to expire!

Log in to keep it going 💪

[Open HOTMESS](https://app.hotmess.com)
  `.trim(),

  weekly_digest: (data) => `
📊 *Your Week in HOTMESS*

👀 Profile views: ${data.views || 0}
💬 Messages: ${data.messages || 0}
🔥 Matches: ${data.matches || 0}

${data.top_visitor ? `Most viewed by: ${data.top_visitor}` : ''}

Keep the momentum going! 🚀
  `.trim()
};

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get pending notifications
    const { data: pending, error: fetchError } = await supabase
      .from('telegram_notification_queue')
      .select(`
        id,
        user_id,
        notification_type,
        payload,
        created_at,
        telegram_users!inner (
          telegram_id,
          chat_id,
          notification_preferences
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!pending || pending.length === 0) {
      return res.status(200).json({ processed: 0 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const notification of pending) {
      const telegramUser = notification.telegram_users;
      
      // Check notification preferences
      const prefs = telegramUser.notification_preferences || {};
      const typeKey = getPreferenceKey(notification.notification_type);
      
      if (prefs[typeKey] === false) {
        // User has disabled this notification type
        await markAsSkipped(notification.id);
        skipped++;
        continue;
      }

      // Get template
      const template = TEMPLATES[notification.notification_type];
      if (!template) {
        await markAsFailed(notification.id, 'Unknown notification type');
        failed++;
        continue;
      }

      // Generate message
      const message = template(notification.payload || {});
      
      // Build options
      const options = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      };

      // Add safety check-in buttons
      if (notification.notification_type === 'safety_checkin') {
        options.reply_markup = {
          inline_keyboard: [
            [
              { text: '✅ All good', callback_data: `checkin_ok_${notification.payload?.checkin_id}` },
              { text: '⏰ Need a minute', callback_data: `checkin_wait_${notification.payload?.checkin_id}` }
            ],
            [
              { text: '🆘 Need help', callback_data: `checkin_help_${notification.payload?.checkin_id}` }
            ]
          ]
        };
      }

      // Send message
      const success = await sendTelegramMessage(
        telegramUser.chat_id,
        message,
        options
      );

      if (success) {
        await markAsSent(notification.id);
        sent++;
      } else {
        await markAsFailed(notification.id, 'Failed to send');
        failed++;
      }

      // Small delay to avoid rate limiting
      await sleep(50);
    }

    return res.status(200).json({
      processed: pending.length,
      sent,
      failed,
      skipped
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getPreferenceKey(notificationType) {
  const mapping = {
    new_match: 'matches',
    new_message: 'messages',
    event_nearby: 'events',
    product_drop: 'events',
    safety_checkin: 'safety',
    streak_reminder: 'reminders',
    weekly_digest: 'digest'
  };
  return mapping[notificationType] || 'other';
}

async function sendTelegramMessage(chatId, text, options = {}) {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options
      })
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    return false;
  }
}

async function markAsSent(notificationId) {
  await supabase
    .from('telegram_notification_queue')
    .update({ 
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', notificationId);
}

async function markAsFailed(notificationId, reason) {
  await supabase
    .from('telegram_notification_queue')
    .update({ 
      status: 'failed',
      error: reason
    })
    .eq('id', notificationId);
}

async function markAsSkipped(notificationId) {
  await supabase
    .from('telegram_notification_queue')
    .update({ 
      status: 'skipped'
    })
    .eq('id', notificationId);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
