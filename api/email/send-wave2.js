/**
 * Wave 2 founder email blast.
 *
 * Auth: requires header `x-wave2-secret: <WAVE2_SEND_SECRET>` (Vercel env var).
 * Runs server-side, never hit by browsers.
 *
 * Recipients: auth.users where email_confirmed_at IS NOT NULL,
 *             excluding e2e/test/example addresses AND email_optouts.
 *
 * Per-recipient: signs a one-click unsubscribe token (HMAC-SHA256 of email + secret),
 * interpolates {{OPEN_APP_URL}} and {{UNSUB_URL}} into the HTML body.
 *
 * Send: Resend /emails/batch (max 100 per call). Two calls for 164. 200ms gap.
 * Headers: List-Unsubscribe + List-Unsubscribe-Post for Gmail/Yahoo bulk policy.
 *
 * Logs: every recipient outcome → email_send_log table.
 *
 * Returns: { dry_run, recipients_total, sent, failed, opted_out_skipped, test_skipped, sample_failures }.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const FROM_ADDR = process.env.WAVE2_FROM || 'Phil — HOTMESS <phil@hotmessldn.com>';
const REPLY_TO  = process.env.WAVE2_REPLY_TO || 'phil@hotmessldn.com';
const SUBJECT   = "You're in.";
const CAMPAIGN  = 'wave2-welcome';
const OPEN_APP_URL = 'https://hotmessldn.com';
const APP_BASE     = 'https://hotmessldn.com';
const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';

// Template lives at /public/email-templates/wave2-welcome.html in the bundle.
// We inline it here as a string constant baked at deploy time to avoid fs reads
// in serverless cold start.
const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
  <title>You're in.</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <!-- EDITORIAL BUILD. Image bands live in ./email_editorial/ (relative to this file).
       Open from the HOTMESS Uploads folder to preview. For sending: host the 3 band PNGs and swap src to hosted URLs. -->
  <style>
    body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img{ -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
    body{ margin:0; padding:0; width:100% !important; background:#050507; }
    a{ color:#C8962C; }
  </style>
</head>
<body style="margin:0; padding:0; background:#050507;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#050507; font-size:1px; line-height:1px;">After midnight, the rules change. The first wave is in.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050507" style="background:#050507;">
   <tr><td align="center" style="padding:0;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

      <!-- HERO title-card -->
      <tr><td style="padding:0; font-size:0; line-height:0;">
        <a href="{{OPEN_APP_URL}}" target="_blank">
          <img src="https://hotmessldn.com/email/eml_hero.png" width="600" alt="HOTMESS — always too much, yet never enough" style="width:100%; max-width:600px; display:block;">
        </a>
      </td></tr>

      <!-- BODY 1: first wave + drop a beacon -->
      <tr><td style="padding:0; font-size:0; line-height:0;">
        <img src="https://hotmessldn.com/email/eml_body1.png" width="600" alt="The first wave is in. You're one of the first inside HOTMESS, here while it's still being built. Drop a beacon — looking, hosting, cruising, aftercare, quiet hold. It lights Pulse for 4 hours, then fades." style="width:100%; max-width:600px; display:block;">
      </td></tr>

      <!-- BODY 2: care suite + enter -->
      <tr><td style="padding:0; font-size:0; line-height:0;">
        <a href="{{OPEN_APP_URL}}" target="_blank">
          <img src="https://hotmessldn.com/email/eml_body2.png" width="600" alt="We built the part that gets you home. Trusted contacts, Silent SOS, Aftercare check-ins. Add to home screen, notifications on. Enter HOTMESS." style="width:100%; max-width:600px; display:block;">
        </a>
      </td></tr>

      <!-- LIVE CTA fallback (clickable text in case images are blocked) -->
      <tr><td align="center" style="padding:26px 40px 6px 40px;">
        <a href="{{OPEN_APP_URL}}" target="_blank" style="font-family:Helvetica,Arial,sans-serif; font-size:14px; letter-spacing:2px; text-transform:uppercase; color:#C8962C; text-decoration:none; font-weight:700;">Enter HOTMESS →</a>
      </td></tr>
      <tr><td align="center" style="padding:8px 40px 0 40px;">
        <p style="margin:0; font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#EDEDED;">See you in there. Tell me what's broken. — Phil</p>
      </td></tr>

      <!-- FOOTER -->
      <tr><td align="center" style="padding:22px 40px 36px 40px; font-family:Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#8A8A8A;">
        <p style="margin:0 0 6px 0;">HOTMESS · <a href="https://hotmessldn.com" style="color:#8A8A8A; text-decoration:underline;">hotmessldn.com</a></p>
        <p style="margin:0;">You're in the HOTMESS beta. <a href="{{UNSUB_URL}}" style="color:#8A8A8A; text-decoration:underline;">Unsubscribe</a></p>
      </td></tr>

    </table>
   </td></tr>
  </table>
</body>
</html>
`;

function signUnsubToken(email, secret) {
  return crypto.createHmac('sha256', secret).update(`${email}|${CAMPAIGN}`).digest('hex');
}

function unsubUrlFor(email, secret) {
  const token = signUnsubToken(email, secret);
  return `${APP_BASE}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}&c=${CAMPAIGN}`;
}

function renderHtml(html, vars) {
  return html
    .replace(/\{\{OPEN_APP_URL\}\}/g, vars.OPEN_APP_URL)
    .replace(/\{\{UNSUB_URL\}\}/g, vars.UNSUB_URL);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const secret = process.env.WAVE2_SEND_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'WAVE2_SEND_SECRET not configured' });
    return;
  }
  if (req.headers['x-wave2-secret'] !== secret) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const dryRun = url.searchParams.get('dry') === '1';
  const limit  = parseInt(url.searchParams.get('limit') || '0', 10) || null;
  const onlyTo = url.searchParams.get('only_to'); // single recipient for smoke test

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Pull recipients
  let recipients = [];
  if (onlyTo) {
    recipients = [onlyTo];
  } else {
    const { data: users, error: usersErr } = await supabase
      .from('auth_user_emails_for_wave2') // see view below — we create a SECURITY DEFINER view
      .select('email');
    if (usersErr) {
      // Fallback: direct query via RPC if view not present
      const { data: rpcData, error: rpcErr } = await supabase.rpc('wave2_recipient_list');
      if (rpcErr) {
        res.status(500).json({ error: 'recipient_query_failed', details: usersErr.message, rpc: rpcErr.message });
        return;
      }
      recipients = (rpcData || []).map(r => r.email);
    } else {
      recipients = (users || []).map(r => r.email);
    }
  }

  // Scrub opt-outs + test patterns
  const { data: optouts } = await supabase.from('email_optouts').select('email');
  const optoutSet = new Set((optouts || []).map(r => r.email.toLowerCase()));
  const isTest = e => /^e2e\.|test|@example\.com$/i.test(e);

  const filtered = [];
  const skippedOptout = [];
  const skippedTest = [];
  for (const e of recipients) {
    if (!e) continue;
    if (optoutSet.has(e.toLowerCase())) { skippedOptout.push(e); continue; }
    if (isTest(e)) { skippedTest.push(e); continue; }
    filtered.push(e);
  }

  const send = limit ? filtered.slice(0, limit) : filtered;

  if (dryRun) {
    res.status(200).json({
      dry_run: true,
      recipients_total: send.length,
      sample: send.slice(0, 5),
      opted_out_skipped: skippedOptout.length,
      test_skipped: skippedTest.length,
    });
    return;
  }

  // Build payload per recipient
  const buildItem = (email) => {
    const unsub = unsubUrlFor(email, secret);
    const html  = renderHtml(TEMPLATE_HTML, { OPEN_APP_URL, UNSUB_URL: unsub });
    return {
      from: FROM_ADDR,
      reply_to: REPLY_TO,
      to: [email],
      subject: SUBJECT,
      html,
      headers: {
        'List-Unsubscribe': `<${unsub}>, <mailto:unsubscribe@hotmessldn.com?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };
  };

  // Chunk into batches of 100 (Resend batch max)
  const chunks = [];
  for (let i = 0; i < send.length; i += 100) chunks.push(send.slice(i, i + 100));

  const report = { sent: 0, failed: 0, sample_failures: [] };

  for (let ci = 0; ci < chunks.length; ci++) {
    const batch = chunks[ci].map(buildItem);
    try {
      const resp = await fetch(RESEND_BATCH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const data = await resp.json();
      if (!resp.ok) {
        // Whole batch failed — log every recipient as failed
        for (const e of chunks[ci]) {
          report.failed++;
          if (report.sample_failures.length < 5) report.sample_failures.push({ email: e, error: data?.message || `http_${resp.status}` });
          await supabase.from('email_send_log').insert({ campaign: CAMPAIGN, email: e, status: 'failed', error: (data?.message || `http_${resp.status}`).slice(0, 500) });
        }
      } else {
        // Resend batch returns { data: [{id, …}, …] } in order
        const results = data?.data || [];
        for (let i = 0; i < chunks[ci].length; i++) {
          const e = chunks[ci][i];
          const r = results[i];
          if (r?.id) {
            report.sent++;
            await supabase.from('email_send_log').insert({ campaign: CAMPAIGN, email: e, status: 'sent', resend_id: r.id });
          } else {
            report.failed++;
            if (report.sample_failures.length < 5) report.sample_failures.push({ email: e, error: 'no_id_in_response' });
            await supabase.from('email_send_log').insert({ campaign: CAMPAIGN, email: e, status: 'failed', error: 'no_id_in_response' });
          }
        }
      }
    } catch (err) {
      for (const e of chunks[ci]) {
        report.failed++;
        if (report.sample_failures.length < 5) report.sample_failures.push({ email: e, error: err.message });
        await supabase.from('email_send_log').insert({ campaign: CAMPAIGN, email: e, status: 'failed', error: String(err.message).slice(0, 500) });
      }
    }
    // 200ms gap between batches
    if (ci < chunks.length - 1) await new Promise(r => setTimeout(r, 200));
  }

  // Log opt-out skips for the record
  for (const e of skippedOptout) {
    await supabase.from('email_send_log').insert({ campaign: CAMPAIGN, email: e, status: 'skipped_optout' });
  }

  res.status(200).json({
    dry_run: false,
    recipients_total: send.length,
    sent: report.sent,
    failed: report.failed,
    opted_out_skipped: skippedOptout.length,
    test_skipped: skippedTest.length,
    sample_failures: report.sample_failures,
  });
}
