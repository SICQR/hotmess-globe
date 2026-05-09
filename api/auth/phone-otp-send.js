/**
 * POST /api/auth/phone-otp-send
 *
 * Sends an OTP via Twilio Verify to the supplied phone number.
 * Body: { phone: '+447700900123' }  (E.164)
 *
 * Env required:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_VERIFY_SERVICE_SID  (Verify service "Service SID")
 *
 * Twilio Verify docs: https://www.twilio.com/docs/verify/api/verification
 *
 * Frontend should pre-validate phone to E.164 (use react-phone-number-input).
 * This endpoint trusts the validation but still rejects obviously bad input.
 */

const E164_RE = /^\+[1-9]\d{6,14}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return res.status(500).json({
      error: 'MISSING_TWILIO_VERIFY_SID',
      detail: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in env to enable phone OTP.',
    });
  }

  const phone = String(req.body?.phone || '').trim();
  if (!E164_RE.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number — must be E.164 (e.g. +447700900123)' });
  }

  try {
    const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/Verifications`;
    const body = new URLSearchParams({ To: phone, Channel: 'sms' });
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
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
