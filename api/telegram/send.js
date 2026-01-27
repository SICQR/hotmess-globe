import { createClient } from '@supabase/supabase-js';
import { getEnv, json, getBearerToken } from '../shopify/_utils.js';

const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Send notification to a user via Telegram
 */
const sendToUser = async (userId, message, options = {}) => {
  const botToken = getEnv('TELEGRAM_BOT_TOKEN');
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not configured');

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Get user's Telegram info
  const { data: telegramUser, error } = await serviceClient
    .from('telegram_users')
    .select('chat_id, notifications_enabled, muted_until')
    .eq('user_id', userId)
    .single();

  if (error || !telegramUser) {
    return { success: false, error: 'User not linked to Telegram' };
  }

  if (!telegramUser.notifications_enabled) {
    return { success: false, error: 'Notifications disabled' };
  }

  // Check if muted
  if (telegramUser.muted_until && new Date(telegramUser.muted_until) > new Date()) {
    return { success: false, error: 'Notifications muted' };
  }

  // Send message
  const response = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramUser.chat_id,
      text: message,
      parse_mode: options.parseMode || 'HTML',
      reply_markup: options.replyMarkup,
      disable_notification: options.silent || false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return { success: false, error: errorData.description || 'Failed to send' };
  }

  const result = await response.json();
  return { success: true, messageId: result.result?.message_id };
};

/**
 * Notification templates
 */
const NOTIFICATION_TEMPLATES = {
  new_match: (data) => ({
    text: `🔥 <b>New Match!</b>\n\n${data.matchName} matched with you!\n\n${data.matchBio || 'Check out their profile'}`,
    replyMarkup: {
      inline_keyboard: [[
        { text: '👤 View Profile', callback_data: `view_profile:${data.matchUserId}` },
        { text: '👋 Send Wave', callback_data: `send_wave:${data.matchUserId}` },
      ]],
    },
  }),

  new_message: (data) => ({
    text: `💬 <b>New Message</b>\n\nFrom ${data.senderName}:\n\n"${data.messagePreview}"`,
    replyMarkup: {
      inline_keyboard: [[
        { text: '💬 Reply', url: `https://hotmess.globe/messages/${data.threadId}` },
      ]],
    },
  }),

  nearby_live: (data) => ({
    text: `📍 <b>${data.userName}</b> just went live nearby!\n\n"${data.status}"\n\n${data.distance} away`,
    replyMarkup: {
      inline_keyboard: [[
        { text: '👤 View', callback_data: `view_profile:${data.userId}` },
        { text: '🔇 Mute 1h', callback_data: 'mute_1h' },
      ]],
    },
  }),

  event_reminder: (data) => ({
    text: `🎉 <b>Event Reminder</b>\n\n${data.eventName}\n📅 ${data.eventDate}\n📍 ${data.eventLocation}\n\n${data.attendeeCount} people attending`,
    replyMarkup: {
      inline_keyboard: [[
        { text: '📱 View Event', url: `https://hotmess.globe/events/${data.eventId}` },
      ]],
    },
  }),

  weekly_digest: (data) => ({
    text: `📊 <b>Your Weekly Digest</b>\n\n` +
      `👀 ${data.profileViews} profile views\n` +
      `❤️ ${data.newMatches} new matches\n` +
      `💬 ${data.messagesReceived} messages\n\n` +
      `Top match this week: ${data.topMatchName}`,
    replyMarkup: {
      inline_keyboard: [[
        { text: '📱 Open Hotmess', url: 'https://hotmess.globe' },
      ]],
    },
  }),
};

/**
 * API handler for sending Telegram notifications
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Verify cron secret or admin token
  const cronSecret = getEnv('CRON_SECRET');
  const authHeader = req.headers.authorization;
  const isCron = req.headers['x-cron-secret'] === cronSecret;
  const isInternal = authHeader?.startsWith('Internal ');

  if (!isCron && !isInternal) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const { userId, type, data } = body;

  if (!userId || !type) {
    return json(res, 400, { error: 'Missing userId or type' });
  }

  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) {
    return json(res, 400, { error: `Unknown notification type: ${type}` });
  }

  try {
    const { text, replyMarkup } = template(data || {});
    const result = await sendToUser(userId, text, { replyMarkup });
    return json(res, result.success ? 200 : 400, result);
  } catch (error) {
    console.error('Telegram send error:', error);
    return json(res, 500, { error: error.message });
  }
}
