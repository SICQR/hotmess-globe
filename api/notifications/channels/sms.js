/**
 * SMS channel — Twilio.
 *
 * Wired via REST (no SDK install required) so we can ship without a dep bump.
 * Gracefully no-ops when TWILIO_* env vars aren't present so non-prod
 * environments don't fail loudly.
 */
import { buildAlertCopy } from './_types.js';

const FETCH_TIMEOUT_MS = 10_000;

function basicAuth(sid, token) {
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
}

export async function send(opts) {
  const { contact, user, event, ackUrl } = opts;

  if (!contact.contact_phone) {
    return { ok: false, skipped: true, error: 'no_phone' };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, skipped: true, error: 'twilio_not_configured' };
  }

  const copy = buildAlertCopy({ user, event, ackUrl });
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;

  const body = new URLSearchParams({
    From: from,
    To: contact.contact_phone,
    Body: copy.short,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(sid, token),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `twilio_${res.status}:${data?.message || data?.code || ''}`, raw: data };
    }
    return {
      ok: true,
      providerId: data?.sid || null,
      raw: data,
      // Twilio doesn't confirm delivery synchronously — only `queued`/`sent` here.
      // Status callbacks would update delivered_at, but we don't have a webhook wired yet.
    };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    return { ok: false, error: `twilio_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}
