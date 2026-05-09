/**
 * POST /api/auth/phone-otp-verify
 *
 * Verifies a Twilio Verify OTP code, then creates / fetches a Supabase user
 * keyed by phone and returns a session for the client to setSession() with.
 *
 * Body: { phone: '+447700900123', code: '123456' }
 *
 * Env required:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_VERIFY_SERVICE_SID
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Returns:
 *   200 { user_id, action_link } — frontend opens action_link to redeem session
 *   400 { error: 'invalid_code' | 'invalid_phone' }
 *   500 { error: 'MISSING_TWILIO_VERIFY_SID' | 'SUPABASE_ADMIN_NOT_CONFIGURED' | … }
 *
 * Why action_link instead of access_token: minting a Supabase-compatible JWT
 * needs SUPABASE_JWT_SECRET + manual signing. generateLink('magiclink') is
 * server-side-only too but uses Supabase's own minting machinery and is
 * already supported in @supabase/supabase-js admin client.
 */

import { supabaseAdmin } from '../_utils/supabaseAdmin.js';

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
      detail: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID in env.',
    });
  }

  const phone = String(req.body?.phone || '').trim();
  const code = String(req.body?.code || '').trim();

  if (!E164_RE.test(phone)) {
    return res.status(400).json({ error: 'invalid_phone' });
  }
  if (!/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ error: 'invalid_code_format' });
  }

  // Step 1: Verify the OTP with Twilio Verify
  try {
    const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/VerificationCheck`;
    const body = new URLSearchParams({ To: phone, Code: code });
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
        error: data?.message || 'Twilio verify check failed',
        code: data?.code,
      });
    }
    if (data?.status !== 'approved') {
      return res.status(400).json({ error: 'invalid_code', status: data?.status });
    }
  } catch (e) {
    return res.status(502).json({ error: 'twilio_unreachable', detail: e.message });
  }

  // Step 2: upsert Supabase user by phone, get/issue a magiclink action_link
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
    // listUsers can't filter by phone directly; use a synthetic email keyed
    // by phone so generateLink('magiclink') works. The phone is also stored
    // on the user for canonical identity.
    const syntheticEmail = `${phone.replace(/[^0-9]/g, '')}@hotmess.phone`;

    // Find or create the user
    let userId = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = existing?.users?.find(
      (u) => u.phone === phone.replace(/^\+/, '') || u.email === syntheticEmail,
    );
    if (match) {
      userId = match.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        phone: phone.replace(/^\+/, ''),
        phone_confirm: true,
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: { auth_method: 'phone_otp', phone_e164: phone },
      });
      if (createErr || !created?.user?.id) {
        return res.status(500).json({
          error: 'supabase_create_user_failed',
          detail: createErr?.message,
        });
      }
      userId = created.user.id;
    }

    // Generate a one-time magiclink for the synthetic email
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
