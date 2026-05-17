// scripts/reentry-send.mjs — campaign dispatch for brief #02 reentry invitation.
//
// Modes:
//   MODE=preview RECIPIENT=phil@hotmessldn.com TOKEN_PROFILE=<uuid>
//     - Sends a SINGLE email directly via Resend to the recipient. Doesn't
//       touch the outbox. Used for the Phil-preview gate.
//   MODE=enqueue
//     - Reads all profiles + auth.users.email, skips Dean, skips empties,
//       mints a reentry token per profile, inserts into reentry_tokens
//       (ON CONFLICT token_hash DO NOTHING for idempotency), inserts into
//       notification_outbox status='paused' (ON CONFLICT user_id+notification_type DO NOTHING).
//   MODE=ship
//     - Flips paused outbox rows to status='sent', sends each via Resend with
//       the rendered HTML. Tracks send results per profile. Run only after
//       Phil's "ship it".
//
// Env required: RESEND_API_KEY, REENTRY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEAN_ID = '10a5232a-867a-4e48-bceb-d24a291c0d61';
const SITE = 'https://hotmessldn.com';
const FROM = 'Phil Gizzie <phil@hotmessldn.com>';
const SUBJECT = 'You showed up too early.';
const NOTIFICATION_TYPE = 'reentry-invitation';

function mintToken(profileId, secret) {
  const sig = crypto.createHmac('sha256', secret).update(profileId).digest('hex');
  return `${profileId}.${sig}`;
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function htmlBody(firstName, reentryUrl) {
  const fn = (firstName || 'mate').replace(/[<>]/g, '');
  return `<!doctype html><html><body style="background:#050507;color:#ECECEC;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;margin:0;padding:32px 24px;">
<div style="max-width:560px;margin:0 auto;line-height:1.6;font-size:16px;">
  <div style="font-size:12px;color:#C8962C;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">HOTMESS</div>
  <p style="font-size:20px;margin:0 0 16px;">Hey ${fn},</p>
  <p>A while back &mdash; maybe months, maybe over a year &mdash; you signed up for HOTMESS.</p>
  <p>I want to say sorry. The platform wasn't ready. The age gate was broken on half the phones it tried to run on, the sign-up loop pushed people back to where they started, and most of what you came for didn't exist yet.</p>
  <p>You turned up anyway. Thank you.</p>
  <p>It works now. Properly. Six tier sprites on the globe, SOS rings, proximity for the people who want it and opt-out for the people who don't. Recovery and sobriety as first-class identities, not afterthoughts. Radio, market, drops. The whole thing.</p>
  <p>I'm opening the founding cohort this Monday. 50 Original spots. 115 Founding spots after that. First in, first served &mdash; no friend-of-friend, no waitlist gymnastics.</p>
  <p style="margin:24px 0;">
    <a href="${reentryUrl}" style="display:inline-block;background:#C8962C;color:#050507;font-weight:600;padding:14px 24px;border-radius:12px;text-decoration:none;">Claim my spot &rarr;</a>
  </p>
  <p>It'll walk you through age verification again (the old one was busted, sorry), let you lock your username before someone else takes it, and put you on the globe.</p>
  <p>If you don't want one, no follow-up email. We're cool. I just owed you the chance.</p>
  <p>Phil<br/>HOTMESS</p>
  <p style="color:#888;font-size:12px;line-height:1.6;margin-top:24px;">&mdash; Sent from my own address on an actual Sunday morning because I couldn't sleep until I'd written this. Reply if anything's off &mdash; it'll come to me, not a queue.</p>
  <p style="color:#666;font-size:11px;">If the button doesn't work, paste this URL in your browser: ${reentryUrl}</p>
</div></body></html>`;
}

function textBody(firstName, reentryUrl) {
  const fn = firstName || 'mate';
  return `Hey ${fn},\n\nA while back you signed up for HOTMESS. I want to say sorry. The platform wasn't ready.\n\nIt works now. I'm opening the founding cohort this Monday. 50 Original spots. 115 Founding spots after that. First in, first served.\n\nIf you want one: ${reentryUrl}\n\nIf you don't, no follow-up. I just owed you the chance.\n\nPhil\nHOTMESS`;
}

async function sendOne({ to, firstName, reentryUrl, resendKey, replyTo, tags }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: SUBJECT,
      reply_to: replyTo || 'phil@hotmessldn.com',
      html: htmlBody(firstName, reentryUrl),
      text: textBody(firstName, reentryUrl),
      tags: tags || [{ name: 'campaign', value: 'reentry-invitation' }],
    }),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

async function runPreview({ sb, resendKey, secret }) {
  // For the preview, use Dean's profile id (real UUID, won't actually be used
  // by Dean because he's grandfathered and skipped in the enqueue). Token is
  // a real signed token so Phil can click it on the preview deploy if curious.
  const recipient = process.env.RECIPIENT || 'scanme@sicqr.com';
  const profileId = process.env.TOKEN_PROFILE || DEAN_ID;
  const token = mintToken(profileId, secret);
  const reentryUrl = `${SITE}/reentry?token=${token}`;
  console.log(`[preview] sending to ${recipient}, token for profile ${profileId}`);
  const result = await sendOne({
    to: recipient,
    firstName: 'Phil',
    reentryUrl,
    resendKey,
    replyTo: 'phil@hotmessldn.com',
    tags: [{ name: 'campaign', value: 'reentry-invitation' }, { name: 'mode', value: 'preview' }],
  });
  console.log(`[preview] HTTP ${result.status}`);
  console.log(JSON.stringify(result.data, null, 2));
}

async function runEnqueue({ sb, secret }) {
  // Pull all profiles + their auth email, skip Dean, skip empty emails.
  const { data: rows, error } = await sb.rpc('reentry_enqueue_targets'); // see fallback below if RPC missing
  let targets = rows;
  if (error) {
    // Fallback: build via direct query
    const { data: profiles, error: e2 } = await sb.from('profiles').select('id, display_name');
    if (e2) throw e2;
    const adminAuth = sb.auth.admin;
    targets = [];
    for (const p of profiles) {
      if (p.id === DEAN_ID) continue;
      const { data: u } = await adminAuth.getUserById(p.id);
      const email = u?.user?.email;
      if (!email) continue;
      targets.push({ id: p.id, display_name: p.display_name, email });
    }
  }
  console.log(`[enqueue] ${targets.length} target profiles`);

  let inserted = 0, skippedNoEmail = 0, skippedExisting = 0;
  for (const t of targets) {
    if (!t.email) { skippedNoEmail++; continue; }
    if (t.id === DEAN_ID) continue;
    const firstName = (t.display_name || '').split(' ')[0] || 'mate';
    const token = mintToken(t.id, secret);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const tokenHash = hashToken(token);

    // Insert token (idempotent)
    await sb.from('reentry_tokens').upsert({
      profile_id: t.id, token_hash: tokenHash, expires_at: expiresAt,
    }, { onConflict: 'token_hash' });

    // Skip if outbox row already exists for this profile + type
    const { data: existing } = await sb.from('notification_outbox')
      .select('id, status').eq('user_id', t.id).eq('notification_type', NOTIFICATION_TYPE).maybeSingle();
    if (existing) { skippedExisting++; continue; }

    // Insert paused outbox row
    const reentryUrl = `${SITE}/reentry?token=${token}`;
    const { error: insErr } = await sb.from('notification_outbox').insert({
      user_id: t.id,
      user_email: t.email,
      notification_type: NOTIFICATION_TYPE,
      title: SUBJECT,
      message: `Founding cohort reentry invitation. Click: ${reentryUrl}`,
      metadata: {
        campaign: 'reentry-invitation',
        first_name: firstName,
        reentry_url: reentryUrl,
        from: FROM,
        reply_to: 'phil@hotmessldn.com',
      },
      status: 'paused',
      channel: 'email',
      send_at: '2026-05-18T07:00:00+00:00',
    });
    if (insErr) { console.error(`[enqueue] insert failed for ${t.id}: ${insErr.message}`); continue; }
    inserted++;
  }
  console.log(`[enqueue] inserted=${inserted} skipped_existing=${skippedExisting} skipped_no_email=${skippedNoEmail}`);
}

async function runShip({ sb, resendKey, secret }) {
  // Read all paused outbox rows for this campaign + send via Resend, mark sent.
  // SAFETY: requires explicit CONFIRM_SHIP=yes to actually run.
  if (process.env.CONFIRM_SHIP !== 'yes') {
    console.error('runShip refusing without CONFIRM_SHIP=yes');
    process.exit(2);
  }
  const { data: rows, error } = await sb.from('notification_outbox')
    .select('id, user_id, user_email, metadata').eq('notification_type', NOTIFICATION_TYPE).eq('status', 'paused');
  if (error) throw error;
  console.log(`[ship] ${rows.length} paused rows to dispatch`);
  let sent = 0, failed = 0;
  for (const r of rows) {
    const result = await sendOne({
      to: r.user_email,
      firstName: r.metadata?.first_name || 'mate',
      reentryUrl: r.metadata?.reentry_url,
      resendKey,
    });
    if (result.ok) {
      await sb.from('notification_outbox').update({
        status: 'sent', sent_at: new Date().toISOString(),
        metadata: { ...r.metadata, resend_id: result.data?.id ?? null },
      }).eq('id', r.id);
      sent++;
    } else {
      await sb.from('notification_outbox').update({
        status: 'failed', error_message: JSON.stringify(result.data).slice(0, 500),
      }).eq('id', r.id);
      failed++;
    }
    await new Promise(r => setTimeout(r, 50)); // rate-limit gentle
  }
  console.log(`[ship] sent=${sent} failed=${failed}`);
}

const mode = process.env.MODE;
const resendKey = process.env.RESEND_API_KEY;
const secret = process.env.REENTRY_SECRET;
const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret || secret.length < 32) { console.error('REENTRY_SECRET missing/too short'); process.exit(2); }
if (!sbUrl || !sbKey) { console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(2); }
if (mode !== 'enqueue' && !resendKey) { console.error('RESEND_API_KEY missing'); process.exit(2); }

const sb = createClient(sbUrl, sbKey);
switch (mode) {
  case 'preview': await runPreview({ sb, resendKey, secret }); break;
  case 'enqueue': await runEnqueue({ sb, secret }); break;
  case 'ship':    await runShip({ sb, resendKey, secret }); break;
  default:
    console.error('MODE must be preview|enqueue|ship');
    process.exit(2);
}
