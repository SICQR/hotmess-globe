/**
 * WhatsApp channel — Meta Graph API (template-based, since most contacts won't
 * have an active 24h conversation window with us).
 *
 * Template `safety_alert_v1` must be approved in Meta Business Manager. While
 * approval is pending, this channel returns 401 from Meta — the dispatcher
 * records the failure and moves on. Other channels keep firing.
 */
import { buildAlertCopy } from './_types.js';

export async function send(opts) {
  const { contact, user, event, ackUrl } = opts;

  if (!contact.contact_phone) {
    return { ok: false, skipped: true, error: 'no_phone' };
  }

  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN || '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (!token || !phoneId) {
    return { ok: false, skipped: true, error: 'whatsapp_not_configured' };
  }

  const cleanPhone = String(contact.contact_phone).replace(/\D/g, '');
  const copy = buildAlertCopy({ user, event, ackUrl });

  // Template parameters: {1}=user_name, {2}=location, {3}=ack_url
  const components = [{
    type: 'body',
    parameters: [
      { type: 'text', text: user.display_name || 'A friend' },
      { type: 'text', text: event.location_str || 'Location unavailable' },
      { type: 'text', text: ackUrl || 'https://hotmessldn.com/' },
    ],
  }];

  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_TEMPLATE_NAME || 'safety_alert_v1',
          language: { code: 'en_GB' },
          components,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `meta_${res.status}:${data?.error?.code || ''}:${data?.error?.message || ''}`, raw: data };
    }
    const msgId = data?.messages?.[0]?.id || null;
    return { ok: true, providerId: msgId, raw: data };
  } catch (err) {
    return { ok: false, error: `meta_fetch_failed:${err.message}` };
  }
}
