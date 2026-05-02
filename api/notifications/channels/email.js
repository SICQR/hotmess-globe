/**
 * Email channel — Resend.
 *
 * The platform's daily-brief mailer already uses Resend. Safety email reuses the
 * same provider with a distinct from-address (safety@send.hotmessldn.com) so
 * recipients can filter independently.
 */
import { buildAlertCopy } from './_types.js';

const FROM_ADDR = process.env.RESEND_SAFETY_FROM
  || 'HOTMESS Safety <safety@send.hotmessldn.com>';

function plainEmailBody({ copy, ackUrl }) {
  return [
    copy.body,
    '',
    ackUrl ? `Tap to confirm you've reached them: ${ackUrl}` : null,
    '',
    '— HOTMESS — care as kink',
  ].filter(Boolean).join('\n');
}

function htmlEmailBody({ copy, ackUrl }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#050507;color:#fff;font-family:-apple-system,system-ui,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;">
  <h1 style="font-size:18px;font-weight:500;color:#C8962C;letter-spacing:0.02em;margin:0 0 16px;">${copy.title}</h1>
  <p style="font-size:15px;line-height:1.55;opacity:0.86;white-space:pre-line;margin:0 0 20px;">${copy.body}</p>
  ${ackUrl ? `<p style="margin:24px 0;"><a href="${ackUrl}" style="display:inline-block;padding:14px 22px;background:#C8962C;color:#050507;text-decoration:none;border-radius:6px;font-weight:600;">Confirm you've reached them</a></p>` : ''}
  <p style="font-size:11px;opacity:0.45;margin:32px 0 0;">HOTMESS — care as kink</p>
</div></body></html>`;
}

export async function send(opts) {
  const { contact, user, event, ackUrl } = opts;

  if (!contact.contact_email) {
    return { ok: false, skipped: true, error: 'no_email' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, skipped: true, error: 'resend_not_configured' };
  }

  const copy = buildAlertCopy({ user, event, ackUrl });
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ADDR,
        to: [contact.contact_email],
        subject: copy.title,
        text: plainEmailBody({ copy, ackUrl }),
        html: htmlEmailBody({ copy, ackUrl }),
        headers: { 'X-Hotmess-Kind': 'safety' },
        tags: [{ name: 'kind', value: 'safety' }, { name: 'event_id', value: event.id }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `resend_${res.status}:${data?.message || ''}`, raw: data };
    }
    return { ok: true, providerId: data?.id || null, raw: data };
  } catch (err) {
    return { ok: false, error: `resend_fetch_failed:${err.message}` };
  }
}
