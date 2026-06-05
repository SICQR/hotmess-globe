/**
 * D59 S1 — Invitation dispatcher.
 *
 * POST /api/safety/dispatch-invitation
 *   Authorization: Bearer <user-jwt>
 *   { trusted_contact_id, force? }
 *
 * Sends a trusted-contact invitation across whichever of email / Telegram /
 * SMS the nominator provided. Recipient is NOT a HOTMESS user (Safety
 * Constitution: account-free acceptance). They receive a link to
 *   /contact/accept/{trusted_contact_id}?token=...&exp=...
 * which the D59 S2 landing page verifies anonymously.
 *
 * Idempotency: throttled to 1 send per 5 min per row. force=true overrides
 * (used by the explicit "Resend invitation" button in Settings).
 *
 * Doctrine refs:
 *   - Safety Posture / Purpose Invariants
 *   - Account-free acceptance invariant
 *   - D15 HOTMESS Care Language
 *   - D59 Recipient Identity Ownership amendment
 */
import { createClient } from '@supabase/supabase-js';
import { buildAcceptanceUrl } from './_acceptance-token.js';
import {
  emailSubject,
  emailTextBody,
  emailHtmlBody,
  telegramBody,
  smsBody,
} from './_invitation-templates.js';
import { sendSms } from '../notifications/channels/sms.js';

const RESEND_FROM = process.env.RESEND_SAFETY_FROM
  || 'HOTMESS Safety <safety@hotmessldn.com>';
const FETCH_TIMEOUT_MS = 10_000;
const THROTTLE_MS = 5 * 60 * 1000;

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

function firstNameOf(full) {
  if (!full) return null;
  const t = String(full).trim();
  if (!t) return null;
  return t.split(/\s+/)[0];
}

async function sendEmailInvitation(ctx, contactEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { channel: 'email', ok: false, skipped: true, error: 'resend_not_configured' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [contactEmail],
        subject: emailSubject(ctx),
        text: emailTextBody(ctx),
        html: emailHtmlBody(ctx),
        headers: { 'X-Hotmess-Kind': 'invitation' },
        tags: [{ name: 'kind', value: 'invitation' }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { channel: 'email', ok: false, error: `resend_${res.status}:${data?.message || ''}` };
    }
    return { channel: 'email', ok: true, providerId: data?.id || null };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    return { channel: 'email', ok: false, error: `resend_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

async function sendTelegramInvitation(ctx, chatId) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) {
    return { channel: 'telegram', ok: false, skipped: true, error: 'telegram_not_configured' };
  }
  if (!chatId) {
    return { channel: 'telegram', ok: false, skipped: true, error: 'no_chat_id' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramBody(ctx),
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        channel: 'telegram',
        ok: false,
        error: `telegram_${res.status}:${data?.description || 'unknown'}`,
      };
    }
    return {
      channel: 'telegram',
      ok: true,
      providerId: String(data?.result?.message_id ?? ''),
    };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    return { channel: 'telegram', ok: false, error: `telegram_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

async function sendSmsInvitation(ctx, phone) {
  if (!phone) {
    return { channel: 'sms', ok: false, skipped: true, error: 'no_phone' };
  }
  const result = await sendSms({ to: phone, body: smsBody(ctx) });
  if (result?.ok) {
    return {
      channel: 'sms',
      ok: true,
      providerId: result.providerId || result.sid || null,
    };
  }
  return {
    channel: 'sms',
    ok: false,
    error: result?.error || 'sms_failed',
    skipped: !!result?.skipped,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[dispatch-invitation] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const jwt = req.headers.authorization?.replace('Bearer ', '');
  if (!jwt) return res.status(401).json({ error: 'unauthenticated' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const trustedContactId = body.trusted_contact_id;
  if (!trustedContactId) {
    return res.status(400).json({ error: 'missing_trusted_contact_id' });
  }
  const force = body.force === true;

  // Load the trusted_contact row.
  const { data: tc, error: tcErr } = await supabaseAdmin
    .from('trusted_contacts')
    .select(
      'id, user_id, user_email, contact_name, contact_phone, contact_email, contact_telegram_chat_id, contact_telegram_handle, invitation_sent_at'
    )
    .eq('id', trustedContactId)
    .maybeSingle();
  if (tcErr) {
    console.error('[dispatch-invitation] tc load failed:', tcErr.message);
    return res.status(500).json({ error: 'tc_load_failed' });
  }
  if (!tc) return res.status(404).json({ error: 'trusted_contact_not_found' });

  // Authorise: caller must own this trusted_contact row. Schema currently
  // tracks ownership by user_email (RLS), but newer rows may carry user_id
  // (post #651 D59 S0). Accept either.
  const ownsByUserId = tc.user_id && tc.user_id === user.id;
  const ownsByEmail =
    tc.user_email && user.email && tc.user_email.toLowerCase() === user.email.toLowerCase();
  if (!ownsByUserId && !ownsByEmail) {
    return res.status(403).json({ error: 'not_owner' });
  }

  // Throttle: 5-min minimum between sends unless force=true.
  if (tc.invitation_sent_at && !force) {
    const ageMs = Date.now() - new Date(tc.invitation_sent_at).getTime();
    if (ageMs < THROTTLE_MS) {
      return res
        .status(200)
        .json({ ok: true, throttled: true, age_ms: ageMs });
    }
  }

  // Load nominator profile for display name.
  const { data: nomProfile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .maybeSingle();
  const nominatorDisplay =
    (nomProfile?.display_name || '').trim() || 'Someone you know';
  const nominatorFirstName = firstNameOf(nominatorDisplay);

  // Build acceptance URL.
  const built = buildAcceptanceUrl(tc.id, user.id);
  if (!built) {
    return res.status(500).json({ error: 'token_secret_missing' });
  }
  const { url: acceptUrl, token, expiresAt } = built;

  const ctx = {
    nominatorDisplay,
    nominatorFirstName: nominatorFirstName || nominatorDisplay,
    contactFirstName: firstNameOf(tc.contact_name),
    acceptUrl,
  };

  // Dispatch across whichever channels the nominator provided. We fire all
  // in parallel rather than sequentially so the user doesn't wait for
  // Twilio + Resend + Telegram serially.
  const tasks = [];
  if (tc.contact_email) tasks.push(sendEmailInvitation(ctx, tc.contact_email));
  if (tc.contact_telegram_chat_id) {
    tasks.push(sendTelegramInvitation(ctx, tc.contact_telegram_chat_id));
  }
  if (tc.contact_phone) tasks.push(sendSmsInvitation(ctx, tc.contact_phone));

  const attempts = await Promise.all(tasks);
  const anySucceeded = attempts.some((a) => a.ok);

  // Persist token + invitation timestamp. Write even when all channels
  // failed so the row reflects an attempt — a future cron retry can pick
  // it up by checking acceptance_token IS NULL (still null = nothing
  // succeeded structurally yet).
  const update = {
    invitation_sent_at: new Date().toISOString(),
    acceptance_token: token,
    acceptance_token_expires_at: expiresAt,
  };
  const { error: updErr } = await supabaseAdmin
    .from('trusted_contacts')
    .update(update)
    .eq('id', tc.id);
  if (updErr) {
    console.error('[dispatch-invitation] persist failed:', updErr.message);
  }

  return res.status(200).json({
    ok: true,
    any_succeeded: anySucceeded,
    attempts: attempts.map((a) => ({
      channel: a.channel,
      ok: !!a.ok,
      skipped: !!a.skipped,
      error: a.error || null,
    })),
  });
}

export const __testing = { firstNameOf };
