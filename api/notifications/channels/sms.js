/**
 * SMS channel — Twilio.
 *
 * Two entry points:
 *
 *   send({ contact, user, event, ackUrl }) — legacy contract used by the
 *     safety-fan-out path (api/notifications/channels/* shape). Builds copy
 *     via _types.buildAlertCopy and forwards to sendSms.
 *
 *   sendSms({ to, body })                  — low-level helper used by
 *     api/notifications/dispatch.js when fanning notification_outbox rows.
 *
 * Auth resolution order:
 *   1. TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (recommended for production)
 *   2. TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN (legacy fallback)
 *
 * Routing resolution order:
 *   1. TWILIO_MESSAGING_SERVICE_SID (recommended — sticky sender, fallbacks,
 *      ASCII downgrade, sender pool incl. UK Alpha sender once approved)
 *   2. TWILIO_FROM_NUMBER / TWILIO_SMS_FROM (bare From number)
 *
 * Modules MUST NOT throw — return { ok: false, error } on any failure
 * (including missing env vars). The dispatcher writes error_message into
 * notification_outbox for observability.
 */
import { buildAlertCopy } from './_types.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_CHARS = 320; // 2 segments GSM-7

function basicAuth(sid, secret) {
  return 'Basic ' + Buffer.from(`${sid}:${secret}`).toString('base64');
}

function resolveAuth() {
  const accountSid    = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKeySid     = process.env.TWILIO_API_KEY_SID?.trim();
  const apiKeySecret  = process.env.TWILIO_API_KEY_SECRET?.trim();
  const authToken     = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (!accountSid) {
    return { ok: false, error: 'twilio_account_sid_missing' };
  }
  if (apiKeySid && apiKeySecret) {
    return { ok: true, accountSid, authHeader: basicAuth(apiKeySid, apiKeySecret) };
  }
  if (authToken) {
    return { ok: true, accountSid, authHeader: basicAuth(accountSid, authToken) };
  }
  return { ok: false, error: 'twilio_credentials_missing' };
}

function resolveRouting() {
  const msgService = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (msgService) return { MessagingServiceSid: msgService };
  const from = (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_SMS_FROM)?.trim();
  if (from) return { From: from };
  return null;
}

function normaliseTo(to) {
  const raw = String(to || '').trim();
  if (!raw) return null;
  if (raw.startsWith('+')) return raw;
  return '+' + raw.replace(/\D/g, '');
}

function clamp(body) {
  if (!body) return '';
  return body.length > MAX_BODY_CHARS ? body.slice(0, MAX_BODY_CHARS - 1) + '…' : body;
}

/**
 * Low-level Twilio SMS send.
 * Returns { ok, providerId?, error?, skipped?, raw? }.
 * Never throws.
 */
export async function sendSms({ to, body }) {
  const dest = normaliseTo(to);
  if (!dest) return { ok: false, skipped: true, error: 'no_phone' };

  const auth = resolveAuth();
  if (!auth.ok) return { ok: false, skipped: true, error: auth.error };

  const routing = resolveRouting();
  if (!routing) return { ok: false, skipped: true, error: 'twilio_routing_missing' };

  const params = new URLSearchParams({ To: dest, Body: clamp(body), ...routing });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(auth.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: auth.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal,
        body: params,
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: `twilio_${res.status}:${data?.code || ''}:${data?.message || ''}`.slice(0, 500),
        raw: data,
      };
    }
    return { ok: true, providerId: data?.sid || null, raw: data };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    return { ok: false, error: `twilio_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safety-fan-out contract (preserved). Used by the panic-alert / safety
 * delivery pipeline that hands us {contact, user, event, ackUrl}.
 */
export async function send(opts) {
  const { contact, user, event, ackUrl } = opts;
  if (!contact?.contact_phone) {
    return { ok: false, skipped: true, error: 'no_phone' };
  }
  const copy = buildAlertCopy({ user, event, ackUrl });
  return sendSms({ to: contact.contact_phone, body: copy.short });
}
