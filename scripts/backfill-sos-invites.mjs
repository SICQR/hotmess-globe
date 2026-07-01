#!/usr/bin/env node
/**
 * scripts/backfill-sos-invites.mjs
 *
 * ONE-OFF BACKFILL — Option B rollout.
 *
 * Sends the trusted-contact acceptance invitation to every existing contact
 * that has never been invited and has neither accepted nor declined:
 *
 *     accepted_at IS NULL
 *     AND declined_at IS NULL
 *     AND invitation_sent_at IS NULL
 *
 * These are the pre-Option-B contacts (added when "add contact" did not send an
 * invite). Until they accept, SOS reaches them only while the consent grace
 * window (SOS_CONSENT_GRACE_UNTIL) is open. This backfill is what closes that
 * gap: it gives every legacy contact the chance to confirm before the grace
 * window expires.
 *
 * It reuses the LIVE invitation flow (POST /api/safety/dispatch-invitation) so
 * templates, tokens, throttling, and audit trail all stay identical to the
 * normal invite-on-add path. It does NOT write to trusted_contacts itself — the
 * endpoint persists invitation_sent_at + acceptance_token.
 *
 * Per-owner auth: the endpoint authorises by owner JWT. This script mints a
 * short-lived owner session via the Supabase admin API (generateLink →
 * verifyOtp) for each owner, exactly as a signed-in owner would.
 *
 * ── HOW PHIL RUNS IT (once, after deploy) ────────────────────────────────────
 *   Phil runs this ONE TIME after the Option B change is deployed to prod.
 *   It sends REAL messages (email / SMS / Telegram) to real people.
 *
 *   Dry run (default — lists who WOULD be invited, sends nothing):
 *     node scripts/backfill-sos-invites.mjs
 *
 *   Live run (actually sends):
 *     node scripts/backfill-sos-invites.mjs --confirm
 *
 * Env required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   APP_BASE_URL   (e.g. https://hotmessldn.com — where the endpoint is deployed)
 */
import { createClient } from '@supabase/supabase-js';

const CONFIRM = process.argv.includes('--confirm');
const APP_BASE_URL =
  process.env.APP_BASE_URL || process.env.SITE_URL || 'https://hotmessldn.com';
const THROTTLE_MS = 1200; // gentle pacing so we don't hammer Twilio/Resend

function banner() {
  const line = '='.repeat(72);
  console.log(line);
  if (CONFIRM) {
    console.log('  BACKFILL SOS INVITES — LIVE RUN (--confirm)');
    console.log('  THIS SENDS REAL MESSAGES (email / SMS / Telegram) to real people.');
  } else {
    console.log('  BACKFILL SOS INVITES — DRY RUN');
    console.log('  No messages will be sent. Re-run with --confirm to send for real.');
    console.log('  (LIVE RUN SENDS REAL MESSAGES to real people.)');
  }
  console.log(`  Endpoint: ${APP_BASE_URL}/api/safety/dispatch-invitation`);
  console.log(line);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  banner();

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
    process.exit(2);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Find never-invited, never-answered contacts.
  const { data: pending, error } = await admin
    .from('trusted_contacts')
    .select('id, user_id, user_email, contact_name')
    .is('accepted_at', null)
    .is('declined_at', null)
    .is('invitation_sent_at', null);
  if (error) {
    console.error('Query failed:', error.message);
    process.exit(2);
  }

  if (!pending?.length) {
    console.log('Nothing to backfill — no un-invited, un-answered contacts.');
    return;
  }

  console.log(`Found ${pending.length} contact(s) to invite.\n`);

  // Cache one minted owner JWT per owner so we don't re-mint for every contact.
  const jwtCache = new Map();

  async function ownerJwt(ownerId, ownerEmail) {
    const cacheKey = ownerId || ownerEmail;
    if (jwtCache.has(cacheKey)) return jwtCache.get(cacheKey);

    // Resolve the owner's email if we only have a user_id.
    let email = ownerEmail || null;
    if (!email && ownerId) {
      const { data: prof } = await admin
        .from('profiles')
        .select('email')
        .eq('id', ownerId)
        .maybeSingle();
      email = prof?.email || null;
    }
    if (!email) return null;

    // Mint a short-lived owner session (generateLink → verifyOtp), the same
    // shape a real signed-in owner would present to the endpoint.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr || !link?.properties?.email_otp) {
      console.warn(`  ! could not mint session for ${email}: ${linkErr?.message || 'no otp'}`);
      jwtCache.set(cacheKey, null);
      return null;
    }
    const { data: verified, error: vErr } = await admin.auth.verifyOtp({
      email,
      token: link.properties.email_otp,
      type: 'email',
    });
    const jwt = verified?.session?.access_token || null;
    if (vErr || !jwt) {
      console.warn(`  ! could not verify session for ${email}: ${vErr?.message || 'no token'}`);
    }
    jwtCache.set(cacheKey, jwt);
    return jwt;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const tc of pending) {
    const label = `${tc.contact_name || '(no name)'} [${tc.id}]`;

    if (!CONFIRM) {
      console.log(`  DRY RUN → would invite ${label}`);
      skipped++;
      continue;
    }

    const jwt = await ownerJwt(tc.user_id, tc.user_email);
    if (!jwt) {
      console.warn(`  SKIP ${label} — no owner session`);
      failed++;
      continue;
    }

    try {
      const res = await fetch(`${APP_BASE_URL}/api/safety/dispatch-invitation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ trusted_contact_id: tc.id, force: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn(`  FAIL ${label} — ${res.status} ${data?.error || ''}`);
        failed++;
      } else if (data.throttled) {
        console.log(`  THROTTLED ${label} (invited recently)`);
        skipped++;
      } else {
        console.log(`  SENT ${label} — any_succeeded=${!!data.any_succeeded}`);
        sent++;
      }
    } catch (e) {
      console.warn(`  ERROR ${label} — ${e?.message || 'network'}`);
      failed++;
    }

    await sleep(THROTTLE_MS);
  }

  console.log(`\nDone. sent=${sent} skipped=${skipped} failed=${failed}`);
  if (!CONFIRM) {
    console.log('This was a DRY RUN. Re-run with --confirm to actually send.');
  }
}

main().catch((e) => {
  console.error('Fatal:', e?.message || e);
  process.exit(1);
});
