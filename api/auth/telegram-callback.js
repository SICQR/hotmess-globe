/**
 * POST /api/auth/telegram-callback
 *
 * Validates the auth_data hash from Telegram Login Widget against the bot
 * token (per https://core.telegram.org/widgets/login#checking-authorization),
 * then upserts a Supabase user keyed by Telegram ID and returns an
 * action_link the client redirects to (Supabase magiclink → /auth/callback
 * with a fresh session).
 *
 * Body (whatever Telegram Login Widget passes back to onTelegramAuth):
 *   {
 *     id, first_name, last_name?, username?, photo_url?, auth_date, hash
 *   }
 *
 * Env required:
 *   TELEGRAM_BOT_TOKEN          (from @BotFather — full token string)
 *   TELEGRAM_BOT_USERNAME       (e.g. 'HotmessAuthBot' — informational, not used here)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Returns:
 *   200 { ok: true, user_id, action_link }
 *   400 { error: 'invalid_hash' | 'expired' | 'missing_fields' }
 *   500 { error: 'MISSING_TELEGRAM_BOT_TOKEN' | 'SUPABASE_ADMIN_NOT_CONFIGURED' | … }
 */

import crypto from 'crypto';
import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

const AUTH_DATA_TTL_SECONDS = 86400; // 24h per Telegram recommendation

function verifyTelegramAuth(authData, botToken) {
  const { hash, ...data } = authData;
  if (!hash) return { verified: false, reason: 'missing_hash' };

  const authDate = parseInt(data.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || now - authDate > AUTH_DATA_TTL_SECONDS) {
    return { verified: false, reason: 'expired' };
  }

  const dataCheckString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (hash !== expected) return { verified: false, reason: 'invalid_hash' };
  return { verified: true, user: data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({
      error: 'MISSING_TELEGRAM_BOT_TOKEN',
      detail: 'Set TELEGRAM_BOT_TOKEN in env (issued by @BotFather).',
    });
  }

  const authData = req.body || {};
  const required = ['id', 'first_name', 'auth_date', 'hash'];
  const missing = required.filter((k) => !authData[k]);
  if (missing.length) {
    return res.status(400).json({ error: 'missing_fields', missing });
  }

  // Step 1: cryptographically verify the auth payload
  const result = verifyTelegramAuth(authData, botToken);
  if (!result.verified) {
    return res.status(400).json({ error: result.reason || 'invalid_hash' });
  }

  // Step 2: upsert Supabase user, mint magiclink
  let admin;
  try {
    admin = supabaseAdmin();
  } catch (e) {
    return res.status(500).json({
      error: 'SUPABASE_ADMIN_NOT_CONFIGURED',
      detail: e.message,
    });
  }

  try {
    const tgId = String(authData.id);
    const syntheticEmail = `tg-${tgId}@hotmess.telegram`;

    // Find or create
    let userId = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = existing?.users?.find((u) => u.email === syntheticEmail);
    if (match) {
      userId = match.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          auth_method: 'telegram',
          telegram_id: tgId,
          telegram_username: authData.username || null,
          first_name: authData.first_name,
          last_name: authData.last_name || null,
          photo_url: authData.photo_url || null,
        },
      });
      if (createErr || !created?.user?.id) {
        return res.status(500).json({
          error: 'supabase_create_user_failed',
          detail: createErr?.message,
        });
      }
      userId = created.user.id;
    }

    // Mint a magiclink action_link the client can redirect to
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: syntheticEmail,
      options: {
        redirectTo: `${getOrigin(req)}/auth/callback`,
      },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return res.status(500).json({
        error: 'supabase_generate_link_failed',
        detail: linkErr?.message,
      });
    }

    return res.status(200).json({
      ok: true,
      user_id: userId,
      action_link: linkData.properties.action_link,
    });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: e.message });
  }
}

function getOrigin(req) {
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  const host = req.headers?.host || 'hotmessldn.com';
  return `${proto}://${host}`;
}
