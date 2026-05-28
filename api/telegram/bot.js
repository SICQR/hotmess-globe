/**
 * Telegram Bot Webhook Handler
 * 
 * POST /api/telegram/bot
 * 
 * Handles incoming Telegram messages and commands.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Validate required env vars at module load
if (!TELEGRAM_BOT_TOKEN) {
}

// Bot commands
const COMMANDS = {
  '/start': handleStart,
  '/link': handleLink,
  '/unlink': handleUnlink,
  '/settings': handleSettings,
  '/help': handleHelp,
  '/events': handleEvents,
  '/status': handleStatus
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check bot token is configured
  if (!TELEGRAM_BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot not configured' });
  }

  // Verify webhook secret if configured (recommended for production)
  if (TELEGRAM_WEBHOOK_SECRET) {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const update = req.body;

  try {
    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const userId = message.from.id;
  const username = message.from.username;

  if (!text) return;

  // Check for commands
  const command = text.split(' ')[0].toLowerCase();
  const args = text.split(' ').slice(1);

  if (COMMANDS[command]) {
    await COMMANDS[command](chatId, userId, username, args);
    return;
  }

  // Default response for non-commands
  await sendMessage(chatId, `
🔥 *HOTMESS Bot*

I didn't quite catch that. Try one of these:

/link - Connect your HOTMESS account
/events - See nearby events
/settings - Notification preferences
/help - All commands
  `.trim(), { parse_mode: 'Markdown' });
}

async function handleStart(chatId, telegramUserId, username, args) {
  // Check if this is a deep link (from link token)
  const linkToken = args[0];

  if (linkToken) {
    // M5 (Phil 2026-05-28) — schema reconciliation:
    // The app writes the one-shot link token to `profiles.telegram_link_token`
    // (NotificationsScreen + L2NotificationSettingsSheet). The bot was reading from
    // a separate `telegram_link_tokens` table that nothing ever wrote to, so every
    // Telegram link attempt hit "Invalid or expired link". Reading from profiles now.
    const { data: profileRow, error } = await supabase
      .from('profiles')
      .select('id, telegram_link_token')
      .eq('telegram_link_token', linkToken)
      .maybeSingle();

    if (error || !profileRow) {
      await sendMessage(chatId, '❌ Invalid or expired link. Generate a new one from the HOTMESS app.');
      return;
    }

    // Bind: write chat_id back so dispatcher (api/notifications/process.js + dispatcher.js)
    // can route notifications. Also null the one-shot token so it can't be re-used.
    const linkedAt = new Date().toISOString();
    await supabase
      .from('profiles')
      .update({
        telegram_chat_id: chatId,
        telegram_link_token: null,
        updated_at: linkedAt,
      })
      .eq('id', profileRow.id);

    // Maintain the bot-internal telegram_users mapping (used by /unsubscribe etc.)
    await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: telegramUserId.toString(),
        user_id: profileRow.id,
        username: username,
        chat_id: chatId.toString(),
        linked_at: linkedAt
      }, { onConflict: 'telegram_id' });

    await sendMessage(chatId, `
✅ *Account Linked!*

You'll now receive HOTMESS notifications here.

What you'll get:
• Match alerts
• Message notifications
• Event drops near you
• Safety check-ins

Use /settings to customize.
    `.trim(), { parse_mode: 'Markdown' });
    return;
  }

  // Regular start
  await sendMessage(chatId, `
🔥 *Welcome to HOTMESS Bot*

Your direct line to the scene.

*Quick Start:*
1. Go to Settings in the HOTMESS app
2. Tap "Link Telegram"
3. Click the link to connect

Or type /help for all commands.

Stay messy 💋
  `.trim(), { parse_mode: 'Markdown' });
}

async function handleLink(chatId, telegramUserId, username) {
  // Check if already linked
  const { data: existing } = await supabase
    .from('telegram_users')
    .select('user_id')
    .eq('telegram_id', telegramUserId.toString())
    .single();

  if (existing) {
    await sendMessage(chatId, '✅ Your account is already linked! Use /unlink to disconnect.');
    return;
  }

  await sendMessage(chatId, `
🔗 *Link Your Account*

To connect your HOTMESS account:

1. Open HOTMESS app
2. Go to Settings → Notifications
3. Tap "Link Telegram"
4. You'll get a unique link - tap it

That's it! Your accounts will be connected.
  `.trim(), { parse_mode: 'Markdown' });
}

async function handleUnlink(chatId, telegramUserId) {
  const { error } = await supabase
    .from('telegram_users')
    .delete()
    .eq('telegram_id', telegramUserId.toString());

  if (error) {
    await sendMessage(chatId, '❌ Failed to unlink. Please try again.');
    return;
  }

  await sendMessage(chatId, `
🔓 *Account Unlinked*

You won't receive HOTMESS notifications here anymore.

Changed your mind? Use /link to reconnect anytime.
  `.trim(), { parse_mode: 'Markdown' });
}

async function handleSettings(chatId, telegramUserId) {
  const { data: telegramUser } = await supabase
    .from('telegram_users')
    .select('user_id, notification_preferences')
    .eq('telegram_id', telegramUserId.toString())
    .single();

  if (!telegramUser) {
    await sendMessage(chatId, '❌ Account not linked. Use /link first.');
    return;
  }

  const prefs = telegramUser.notification_preferences || {};

  await sendMessage(chatId, `
⚙️ *Notification Settings*

Current preferences:
• Matches: ${prefs.matches !== false ? '✅' : '❌'}
• Messages: ${prefs.messages !== false ? '✅' : '❌'}
• Events: ${prefs.events !== false ? '✅' : '❌'}
• Safety: ${prefs.safety !== false ? '✅' : '❌'}

To change, tap a button below:
  `.trim(), {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${prefs.matches !== false ? '✅' : '❌'} Matches`, callback_data: 'toggle_matches' },
          { text: `${prefs.messages !== false ? '✅' : '❌'} Messages`, callback_data: 'toggle_messages' }
        ],
        [
          { text: `${prefs.events !== false ? '✅' : '❌'} Events`, callback_data: 'toggle_events' },
          { text: `${prefs.safety !== false ? '✅' : '❌'} Safety`, callback_data: 'toggle_safety' }
        ]
      ]
    }
  });
}

async function handleEvents(chatId, telegramUserId) {
  // Get user's location from their profile
  const { data: telegramUser } = await supabase
    .from('telegram_users')
    .select('user_id')
    .eq('telegram_id', telegramUserId.toString())
    .single();

  if (!telegramUser) {
    await sendMessage(chatId, '❌ Account not linked. Use /link first.');
    return;
  }

  // Get upcoming events
  const { data: events } = await supabase
    .from('beacons')
    .select('event_title, venue_name, event_start, ticket_url')
    .eq('kind', 'event')
    .gt('beacon_expires_at', new Date().toISOString())
    .order('event_start', { ascending: true })
    .limit(5);

  if (!events || events.length === 0) {
    await sendMessage(chatId, '📅 No events nearby right now. Check back later!');
    return;
  }

  let message = '🎉 *Upcoming Events*\n\n';
  
  events.forEach((event, i) => {
    const date = event.event_start 
      ? new Date(event.event_start).toLocaleDateString('en-GB', { 
          weekday: 'short', 
          day: 'numeric', 
          month: 'short' 
        })
      : 'TBD';
    
    message += `${i + 1}. *${event.event_title || 'Event'}*\n`;
    message += `   📍 ${event.venue_name || 'Location TBD'}\n`;
    message += `   📅 ${date}\n`;
    if (event.ticket_url) {
      message += `   🎫 [Get tickets](${event.ticket_url})\n`;
    }
    message += '\n';
  });

  await sendMessage(chatId, message.trim(), { 
    parse_mode: 'Markdown',
    disable_web_page_preview: true 
  });
}

async function handleStatus(chatId, telegramUserId) {
  const { data: telegramUser } = await supabase
    .from('telegram_users')
    .select(`
      user_id,
      linked_at,
      User:user_id (
        display_name,
        tier
      )
    `)
    .eq('telegram_id', telegramUserId.toString())
    .single();

  if (!telegramUser) {
    await sendMessage(chatId, '❌ Account not linked. Use /link first.');
    return;
  }

  const linkedDate = new Date(telegramUser.linked_at).toLocaleDateString('en-GB');

  await sendMessage(chatId, `
📊 *Your HOTMESS Status*

👤 ${telegramUser.User?.display_name || 'User'}
⭐ Tier: ${telegramUser.User?.tier || 'FREE'}
🔗 Linked since: ${linkedDate}

All good! Notifications flowing.
  `.trim(), { parse_mode: 'Markdown' });
}

async function handleHelp(chatId) {
  await sendMessage(chatId, `
🔥 *HOTMESS Bot Commands*

/link - Connect your HOTMESS account
/unlink - Disconnect your account
/settings - Notification preferences
/events - See upcoming events
/status - Check your account status
/help - Show this message

*What I do:*
• Send you match notifications
• Alert you to new messages
• Drop event announcements
• Safety check-ins

Questions? support@hotmess.com
  `.trim(), { parse_mode: 'Markdown' });
}

async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  const data = callbackQuery.data;

  // Handle setting toggles
  if (data.startsWith('toggle_')) {
    const setting = data.replace('toggle_', '');
    
    const { data: telegramUser } = await supabase
      .from('telegram_users')
      .select('notification_preferences')
      .eq('telegram_id', telegramUserId.toString())
      .single();

    if (!telegramUser) {
      await answerCallback(callbackQuery.id, 'Account not linked');
      return;
    }

    const prefs = telegramUser.notification_preferences || {};
    prefs[setting] = !(prefs[setting] !== false);

    await supabase
      .from('telegram_users')
      .update({ notification_preferences: prefs })
      .eq('telegram_id', telegramUserId.toString());

    await answerCallback(callbackQuery.id, `${setting} notifications ${prefs[setting] ? 'enabled' : 'disabled'}`);
    
    // Refresh settings message
    await handleSettings(chatId, telegramUserId);
  }
}

// Helper to send messages
async function sendMessage(chatId, text, options = {}) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options
      })
    });
  } catch (error) {
  }
}

// Helper to answer callback queries
async function answerCallback(callbackId, text) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text
      })
    });
  } catch (error) {
  }
}
