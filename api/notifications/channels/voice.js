/**
 * Voice channel — Twilio Voice (TTS).
 *
 * Used as the escalation when no other channel acks within 90s (fan-out mode)
 * or after 15 minutes (sequential mode). Plays a short TwiML prompt:
 *   "Press 1 if they're OK. Press 2 to escalate to operator."
 *
 * The DTMF response goes to /api/safety/voice-response/[id] (separate
 * endpoint, not implemented in this commit — see TODO at end of file).
 */
const FETCH_TIMEOUT_MS = 10_000;

export async function send(opts) {
  // Voice ack happens via DTMF (press 1) → /api/safety/voice-response — no
  // ackUrl is embedded in the call audio. Unused channel-contract field omitted.
  const { contact, deliveryId, user, event } = opts;

  if (!contact.contact_phone) {
    return { ok: false, skipped: true, error: 'no_phone' };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, skipped: true, error: 'twilio_voice_not_configured' };
  }

  const publicBase = (process.env.PUBLIC_URL || 'https://hotmessldn.com').replace(/\/$/, '');
  const callbackUrl = `${publicBase}/api/safety/voice-response/${encodeURIComponent(deliveryId)}`;
  const userName = (user.display_name || 'A friend').replace(/[<&>]/g, '');
  const where = (event.location_str || 'Location unavailable').replace(/[<&>]/g, '');

  const twiml =
`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-GB">This is HOTMESS Safety. ${userName} has triggered a safety alert.</Say>
  <Say voice="alice" language="en-GB">Last known location: ${where}.</Say>
  <Gather numDigits="1" action="${callbackUrl}" method="POST">
    <Say voice="alice" language="en-GB">Press 1 if you have reached them. Press 2 to escalate to an operator.</Say>
  </Gather>
  <Say voice="alice" language="en-GB">No response received. Goodbye.</Say>
</Response>`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Calls.json`;
  const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
  const body = new URLSearchParams({
    From: from,
    To: contact.contact_phone,
    Twiml: twiml,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `twilio_voice_${res.status}:${data?.message || ''}`, raw: data };
    }
    return { ok: true, providerId: data?.sid || null, raw: data };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    return { ok: false, error: `twilio_voice_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

// TODO follow-up PR: api/safety/voice-response/[id].js — receives DTMF, marks acked
// or escalates. Twilio webhook signature verification required.
