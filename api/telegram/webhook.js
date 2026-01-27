import { createClient } from '@supabase/supabase-js';
import { getEnv, json } from '../shopify/_utils.js';
import crypto from 'crypto';

// Telegram Bot API endpoint
const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Verify webhook request is from Telegram using secret token
 */
const verifyWebhook = (req) => {
  const secret = getEnv('TELEGRAM_WEBHOOK_SECRET');
  if (!secret) return true; // Skip verification if not configured
  
  const header = req.headers['x-telegram-bot-api-secret-token'];
  return header === secret;
};

/**
 * Send a message via Telegram Bot API
 */
const sendTelegramMessage = async (chatId, text, options = {}) => {
  const botToken = getEnv('TELEGRAM_BOT_TOKEN');
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not configured');

  const response = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options.parseMode || 'HTML',
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.description || 'Failed to send Telegram message');
  }

  return response.json();
};

/**
 * Handle /start command - link Telegram user to app account
 */
const handleStartCommand = async (message, serviceClient) => {
  const { chat, from, text } = message;
  const args = text.split(' ');
  const linkToken = args[1]; // Deep link token: /start <token>

  // Welcome message for new users
  const welcomeText = `
🌐 <b>Welcome to Hotmess Globe!</b>

I'll keep you updated on:
• 🔔 New matches and connections
• 💬 Messages from your matches  
• 📍 Nearby users going live
• 🎉 Events in your area

`;

  if (linkToken) {
    // Attempt to link account
    const { data: linkData, error: linkError } = await serviceClient
      .from('telegram_link_tokens')
      .select('user_id, expires_at')
      .eq('token', linkToken)
      .single();

    if (!linkError && linkData && new Date(linkData.expires_at) > new Date()) {
      // Link the Telegram user to the app user
      await serviceClient.from('telegram_users').upsert({
        telegram_id: from.id.toString(),
        user_id: linkData.user_id,
        chat_id: chat.id.toString(),
        username: from.username,
        first_name: from.first_name,
        last_name: from.last_name,
        linked_at: new Date().toISOString(),
        notifications_enabled: true,
      }, { onConflict: 'user_id' });

      // Delete used token
      await serviceClient
        .from('telegram_link_tokens')
        .delete()
        .eq('token', linkToken);

      await sendTelegramMessage(chat.id, 
        welcomeText + `✅ <b>Account linked successfully!</b>\n\nYou'll now receive notifications here.`
      );
      return;
    }
  }

  // Send welcome without linking
  await sendTelegramMessage(chat.id,
    welcomeText + `To link your Hotmess account, use the "Connect Telegram" button in the app settings.`
  );
};

/**
 * Handle /stop command - disable notifications
 */
const handleStopCommand = async (message, serviceClient) => {
  const { chat, from } = message;

  await serviceClient
    .from('telegram_users')
    .update({ notifications_enabled: false })
    .eq('telegram_id', from.id.toString());

  await sendTelegramMessage(chat.id,
    `🔕 Notifications disabled. Use /start to re-enable them.`
  );
};

/**
 * Handle /status command - show connection status
 */
const handleStatusCommand = async (message, serviceClient) => {
  const { chat, from } = message;

  const { data: telegramUser } = await serviceClient
    .from('telegram_users')
    .select('user_id, notifications_enabled, linked_at')
    .eq('telegram_id', from.id.toString())
    .single();

  if (!telegramUser) {
    await sendTelegramMessage(chat.id,
      `❌ Your Telegram is not linked to a Hotmess account.\n\nUse the "Connect Telegram" button in the app settings to link.`
    );
    return;
  }

  const status = telegramUser.notifications_enabled ? '✅ Enabled' : '🔕 Disabled';
  const linkedDate = new Date(telegramUser.linked_at).toLocaleDateString();

  await sendTelegramMessage(chat.id,
    `📊 <b>Connection Status</b>\n\n` +
    `Notifications: ${status}\n` +
    `Linked since: ${linkedDate}\n\n` +
    `Commands:\n` +
    `/stop - Disable notifications\n` +
    `/start - Enable notifications`
  );
};

/**
 * Handle /live command - broadcast going live
 */
const handleLiveCommand = async (message, serviceClient) => {
  const { chat, from, text } = message;

  const { data: telegramUser } = await serviceClient
    .from('telegram_users')
    .select('user_id')
    .eq('telegram_id', from.id.toString())
    .single();

  if (!telegramUser) {
    await sendTelegramMessage(chat.id, 
      `❌ Link your account first using the app.`
    );
    return;
  }

  // Extract optional message
  const liveMessage = text.replace('/live', '').trim() || 'Going live now!';

  // Update user's right_now status
  await serviceClient
    .from('users')
    .update({
      right_now: true,
      right_now_status: liveMessage,
      right_now_updated_at: new Date().toISOString(),
    })
    .eq('id', telegramUser.user_id);

  await sendTelegramMessage(chat.id,
    `🟢 <b>You're now live!</b>\n\n"${liveMessage}"\n\nNearby matches will be notified.`
  );
};

/**
 * Handle incoming callback queries (button clicks)
 */
const handleCallbackQuery = async (callbackQuery, serviceClient) => {
  const { id, from, data, message } = callbackQuery;
  const botToken = getEnv('TELEGRAM_BOT_TOKEN');

  // Acknowledge the callback
  await fetch(`${TELEGRAM_API}${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id }),
  });

  const [action, ...params] = data.split(':');

  switch (action) {
    case 'view_profile':
      // Send deep link to profile
      const profileId = params[0];
      await sendTelegramMessage(message.chat.id,
        `👤 View profile in the app:\nhttps://hotmess.globe/profile/${profileId}`,
        { 
          reply_markup: {
            inline_keyboard: [[
              { text: '📱 Open App', url: `https://hotmess.globe/profile/${profileId}` }
            ]]
          }
        }
      );
      break;

    case 'send_wave':
      // Quick action to send a wave
      const targetUserId = params[0];
      const { data: telegramUser } = await serviceClient
        .from('telegram_users')
        .select('user_id')
        .eq('telegram_id', from.id.toString())
        .single();

      if (telegramUser) {
        await serviceClient.from('interactions').insert({
          from_user_id: telegramUser.user_id,
          to_user_id: targetUserId,
          interaction_type: 'wave',
          created_at: new Date().toISOString(),
        });

        await sendTelegramMessage(message.chat.id, `👋 Wave sent!`);
      }
      break;

    case 'mute_1h':
    case 'mute_24h':
      const hours = action === 'mute_1h' ? 1 : 24;
      const muteUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      
      await serviceClient
        .from('telegram_users')
        .update({ muted_until: muteUntil.toISOString() })
        .eq('telegram_id', from.id.toString());

      await sendTelegramMessage(message.chat.id,
        `🔇 Notifications muted for ${hours} hour${hours > 1 ? 's' : ''}.`
      );
      break;
  }
};

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Verify webhook authenticity
  if (!verifyWebhook(req)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  // Parse body
  let body;
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (typeof req.body === 'object') {
      body = req.body;
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    }
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  // Initialize Supabase
  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return json(res, 500, { error: 'Server configuration error' });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Handle message updates
    if (body.message) {
      const { text } = body.message;

      if (text?.startsWith('/start')) {
        await handleStartCommand(body.message, serviceClient);
      } else if (text === '/stop') {
        await handleStopCommand(body.message, serviceClient);
      } else if (text === '/status') {
        await handleStatusCommand(body.message, serviceClient);
      } else if (text?.startsWith('/live')) {
        await handleLiveCommand(body.message, serviceClient);
      }
      // Ignore other messages
    }

    // Handle callback queries (button clicks)
    if (body.callback_query) {
      await handleCallbackQuery(body.callback_query, serviceClient);
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return json(res, 500, { error: error.message });
  }
}
