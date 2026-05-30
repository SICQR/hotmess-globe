/**
 * POST /api/auth/phone-otp-send
 *
 * Sends an OTP via Twilio Verify to the supplied phone number.
 * Body: { phone: '+447700900123' }  (E.164)
 *
 * Env required:
 *   TWILIO_ACCOUNT_SID         (already in Vercel for SMS)
 *   TWILIO_API_KEY_SID         (rotatable API Key, starts with 'SK…')
 *   TWILIO_API_KEY_SECRET      (rotatable API Key secret)
 *   TWILIO_VERIFY_SERVICE_SID  (Verify service "Service SID" — Phil
 *                               provisions this in Twilio Console)
 *
 * Twilio Basic auth uses API Key SID:API Key Secret. Falls back to
 * AccountSid:AuthToken if API Key creds aren't set, for migration safety.
 *
 * Twilio Verify docs: https://www.twilio.com/docs/verify/api/verification
 *
 * Frontend should pre-validate phone to E.164 (use react-phone-number-input).
 * This endpoint trusts the validation but still rejects obviously bad input.
 */

const E164_RE = /^\+[1-9]\d{6,14}$/;

function getTwilioBasicAuth() {
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Prefer API Key creds (rotatable). Fall back to Account SID + Auth Token.
  if (apiKeySid && apiKeySecret) {
    return Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64');
  }
  if (accountSid && authToken) {
    return Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const basicAuth = getTwilioBasicAuth();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!basicAuth || !serviceSid) {
    return res.status(503).json({
      error: 'TWILIO_VERIFY_SERVICE_SID not configured',
      detail:
        'Set TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (preferred) or ' +
        'TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, plus TWILIO_VERIFY_SERVICE_SID.',
    });
  }

  const phone = String(req.body?.phone || '').trim();
  if (!E164_RE.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number — must be E.164 (e.g. +447700900123)' });
  }

  try {
    const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/Verifications`;
    const body = new URLSearchParams({ To: phone, Channel: 'sms' });
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.message || 'Twilio Verify send failed',
        code: data?.code,
      });
    }
    return res.status(200).json({
      ok: true,
      sid: data?.sid,
      status: data?.status,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
}
