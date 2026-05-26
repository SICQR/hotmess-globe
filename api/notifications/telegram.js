/**
 * api/notifications/telegram.js
 *
 * Telegram Bot webhook handler. Receives POST from Telegram when users
 * message the bot. Always returns 200 — Telegram retries on anything else.
 *
 * Brief: PR 1 of the notification stack (Phil 2026-05-26).
 *
 * Webhook setup (Phil-only, post-deploy):
 *   curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
 *     -d "url=https://hotmessldn.com/api/notifications/telegram" \
 *     -d "secret_token={TELEGRAM_WEBHOOK_SECRET}"
 *
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN       — from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET  — random string, same value passed to setWebhook
 *   SUPABASE_URL             — already set
 *   SUPABASE_SERVICE_ROLE_KEY — already set
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function tgSend(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN not set — skipping send');
    return { ok: false, error: 'no_token' };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j.description || `http_${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export default async function handler(req, res) {
  // Always 200 — Telegram retries non-2xx aggressively
  if (req.method !== 'POST') return res.status(200).end();

  // Verify the request is from Telegram via the secret-token header.
  // Open the gate only when the secret is configured AND matches; if the env
  // var is missing entirely we 200-acknowledge without acting (deploy-time
  // grace period before Phil completes the webhook setup).
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers['x-telegram-bot-api-secret-token'];
    if (got !== expected) return res.status(200).end();
  } else {
    console.warn('[telegram] TELEGRAM_WEBHOOK_SECRET not set — webhook unverified, acknowledging only');
    return res.status(200).json({ ok: true, warn: 'unverified' });
  }

  const update = req.body;
  const msg = update?.message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat?.id;
  const text = (msg.text ?? '').trim();
  if (!chatId) return res.status(200).json({ ok: true });

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const token = parts[1] || null;

    if (token) {
      // Match token to profiles.telegram_link_token. Write chat_id, clear
      // the token, default the channel to telegram if user hasn't picked one.
      const { data: row, error: lookupErr } = await sb
        .from('profiles')
        .select('id, notification_channel')
        .eq('telegram_link_token', token)
        .maybeSingle();

      if (lookupErr || !row) {
        await tgSend(
          chatId,
          'That link expired or doesn\'t match a HOTMESS account. Open HOTMESS settings and try again.'
        );
        return res.status(200).json({ ok: true });
      }

      const newChannel = row.notification_channel && row.notification_channel !== 'none'
        ? row.notification_channel
        : 'telegram';

      const { error: updErr } = await sb
        .from('profiles')
        .update({
          telegram_chat_id: chatId,
          telegram_link_token: null,
          notification_channel: newChannel,
        })
        .eq('id', row.id);

      if (updErr) {
        console.warn('[telegram] failed to save chat_id:', updErr);
        await tgSend(chatId, 'Couldn\'t connect — try again in a moment.');
      } else {
        await tgSend(chatId, '✓ Connected to HOTMESS. You will receive notifications here.');
      }
      return res.status(200).json({ ok: true });
    }

    // No token — generic onboarding
    await tgSend(
      chatId,
      'Open HOTMESS and connect via Notifications settings to link your account.'
    );
    return res.status(200).json({ ok: true });
  }

  // Any other message — silent ack (we don't run a chatbot)
  return res.status(200).json({ ok: true });
}
