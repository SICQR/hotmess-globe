/**
 * D59 S2 — Accept (or decline) a trusted-contact invitation.
 *
 * POST /api/safety/accept-token
 *   { trusted_contact_id, token, exp,
 *     action: 'preview' | 'accept' | 'decline',
 *     // accept fields (recipient-provided, per D59 Recipient Identity
 *     // Ownership amendment — these are the source of truth post-accept):
 *     confirmed_phone?, confirmed_telegram_handle?, confirmed_whatsapp?,
 *     confirmed_email?, channel_preference_order?,
 *     // decline field (D60 §C.6 dignified decline — optional reason text):
 *     decline_reason?
 *   }
 *
 * No JWT required — the HMAC token IS the authentication. Recipient is
 * anonymous (Safety Constitution: account-free acceptance).
 *
 * Doctrine refs:
 *   - Safety Constitution Account-free acceptance invariant
 *   - D59 Recipient Identity Ownership amendment (confirmed_* are SoT)
 *   - D60 Appendix C §C.6 dignified decline
 *   - D15 HOTMESS Care Language (nominator notification copy)
 */
import { createClient } from '@supabase/supabase-js';
import { verifyAcceptanceToken } from './_acceptance-token.js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

function clean(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function asArray(v) {
  if (!Array.isArray(v)) return null;
  const clean = v.filter((x) => typeof x === 'string' && x.trim().length).slice(0, 8);
  return clean.length ? clean : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const body = (typeof req.body === 'object' && req.body) ? req.body : {};
  const trustedContactId = clean(body.trusted_contact_id);
  const token = clean(body.token);
  const exp = clean(body.exp);
  const action = clean(body.action);

  if (!trustedContactId || !token || !exp || !action) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (action !== 'preview' && action !== 'accept' && action !== 'decline') {
    return res.status(400).json({ error: 'invalid_action' });
  }

  // Load the row first — we need its nominator user_id to verify the HMAC.
  const { data: tc, error: tcErr } = await supabaseAdmin
    .from('trusted_contacts')
    .select(
      'id, user_id, user_email, contact_name, contact_phone, relationship, accepted_at, declined_at, acceptance_token'
    )
    .eq('id', trustedContactId)
    .maybeSingle();
  if (tcErr) {
    console.error('[accept-token] tc load failed:', tcErr.message);
    return res.status(500).json({ error: 'tc_load_failed' });
  }
  if (!tc) return res.status(404).json({ error: 'trusted_contact_not_found' });
  if (!tc.user_id) {
    // Row lacks user_id — schema isn't ready yet. Reject rather than
    // silently accept against an unverified actor.
    return res.status(400).json({ error: 'tc_user_id_missing' });
  }

  // Verify HMAC against the row's canonical nominator user_id.
  const ok = verifyAcceptanceToken(trustedContactId, tc.user_id, exp, token);
  if (!ok) {
    return res.status(401).json({ error: 'invalid_or_expired_token' });
  }

  // Preview branch — read-only. Returns minimal context so the recipient
  // can make an informed accept/decline decision. NEVER discloses nominator
  // email, phone, or precise location. Display name + relationship label only.
  if (action === 'preview') {
    // Fetch nominator display name from profiles. Optional — fail-soft if
    // missing (we still want the page to render with a generic label).
    let nominatorName = null;
    try {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('display_name, username')
        .eq('id', tc.user_id)
        .maybeSingle();
      nominatorName = prof?.display_name || prof?.username || null;
    } catch (e) {
      console.warn('[accept-token] nominator profile lookup failed:', e?.message);
    }
    return res.status(200).json({
      ok: true,
      state: tc.accepted_at
        ? 'accepted'
        : tc.declined_at
          ? 'declined'
          : 'pending',
      nominator_name: nominatorName,
      contact_name: tc.contact_name || null,
      relationship: tc.relationship || null,
    });
  }

  // Idempotency: if already accepted/declined, return the existing state.
  // The recipient may have tapped twice or revisited the link.
  if (action === 'accept' && tc.accepted_at) {
    return res.status(200).json({ ok: true, already: 'accepted' });
  }
  if (action === 'decline' && tc.declined_at) {
    return res.status(200).json({ ok: true, already: 'declined' });
  }

  if (action === 'decline') {
    const declineReason = clean(body.decline_reason).slice(0, 500);
    const { error: updErr } = await supabaseAdmin
      .from('trusted_contacts')
      .update({
        declined_at: new Date().toISOString(),
        decline_reason: declineReason || null,
      })
      .eq('id', tc.id);
    if (updErr) {
      console.error('[accept-token] decline persist failed:', updErr.message);
      return res.status(500).json({ error: 'decline_persist_failed' });
    }
    // Best-effort nominator notification — Care Language compliant.
    // (Outbox path may not exist on all envs; failures here are non-fatal.)
    try {
      // Use canonical notification_outbox schema (notification_type/title/
      // message/metadata) — the legacy {kind, payload} shape from earlier
      // gauntlet draft silently failed against the real columns.
      await supabaseAdmin.from('notification_outbox').insert({
        user_id: tc.user_id,
        notification_type: 'safety_contact_declined',
        title: 'Safety contact invitation declined',
        message: "One of your invited contacts couldn't take on being your trusted contact.", // D63 Class A: no names in lock-screen-visible bodies
        metadata: {
          contact_name: tc.contact_name,
          decline_reason: declineReason || null,
        },
        status: 'queued',
      });
    } catch (e) {
      console.warn('[accept-token] nominator notify failed (non-fatal):', e?.message);
    }
    return res.status(200).json({ ok: true, action: 'declined' });
  }

  // ── Accept path. Persist the recipient's confirmed contact details +
  // their channel preference order. These become the source of truth for
  // future SOS dispatch (D59 Recipient Identity Ownership amendment).
  const update = {
    accepted_at: new Date().toISOString(),
    confirmed_phone: clean(body.confirmed_phone) || null,
    confirmed_telegram_handle: clean(body.confirmed_telegram_handle) || null,
    confirmed_whatsapp: clean(body.confirmed_whatsapp) || null,
    confirmed_email: clean(body.confirmed_email) || null,
    channel_preference_order: asArray(body.channel_preference_order),
  };

  const { error: updErr } = await supabaseAdmin
    .from('trusted_contacts')
    .update(update)
    .eq('id', tc.id);
  if (updErr) {
    console.error('[accept-token] accept persist failed:', updErr.message);
    return res.status(500).json({ error: 'accept_persist_failed' });
  }

  try {
    // Canonical schema — see decline path note above.
    await supabaseAdmin.from('notification_outbox').insert({
      user_id: tc.user_id,
      notification_type: 'safety_contact_accepted',
      title: 'Safety contact confirmed',
      message: 'One of your invited contacts accepted being your trusted contact.', // D63 Class A: no names in lock-screen-visible bodies
      metadata: {
        contact_name: tc.contact_name,
      },
      status: 'queued',
    });
  } catch (e) {
    console.warn('[accept-token] nominator notify failed (non-fatal):', e?.message);
  }

  return res.status(200).json({ ok: true, action: 'accepted' });
}
// gauntlet-rebuild-marker: 2026-06-05T03:00Z (env: SAFETY_ACK_SECRET added preview-only)
