/**
 * api/cron/safety-events-stale-close.js
 *
 * ⚠️ DRAFT / DISABLED-BY-DEFAULT — DO NOT ENABLE WITHOUT SAFETY REVIEW ⚠️
 *
 * Lifecycle fix (Option B item 6): safety_events historically had no resolve
 * path, so events accumulated with resolved_at = NULL forever. The primary,
 * SAFE resolve write now lives in api/safety/ack/[id].js (a contact tapping
 * "reached them" sets resolved_at). This file is a SEPARATE, GUARDED, LAST-
 * RESORT janitor to close events that were acknowledged-as-handled but whose
 * resolved_at was never written (e.g. legacy rows), so dashboards aren't
 * polluted by stale-open incidents.
 *
 * ── SAFETY INVARIANTS (why this cannot close a live SOS) ────────────────────
 * This mechanism is deliberately hard to fire. ALL of the following must hold
 * before ANY row is touched:
 *
 *   1. GLOBAL KILL SWITCH: process.env.SAFETY_STALE_CLOSE_ENABLED === 'true'.
 *      Unset/anything-else ⇒ this cron is a NO-OP. It ships DISABLED.
 *
 *   2. EXPLICIT ACK FLAG: only events whose metadata.acknowledged === true
 *      (or metadata.status === 'acknowledged') are eligible. An active,
 *      never-acknowledged emergency is NEVER eligible — the code path that
 *      could close a live SOS simply does not exist here.
 *
 *   3. ALREADY-UNRESOLVED ONLY: resolved_at IS NULL (we never re-close).
 *
 *   4. LONG TTL: created_at older than STALE_TTL_HOURS (default 168h = 7 days).
 *      A long floor so nothing recent can be swept.
 *
 * Even with all guards, this writes resolved_at ONLY — it never deletes, never
 * changes type, and never touches delivery. Before enabling in prod, a human
 * must confirm the metadata.acknowledged contract is actually populated by the
 * ack/acknowledge path (it is NOT wired yet — see TODO below), otherwise this
 * cron correctly does nothing.
 *
 * TODO(safety-review): (a) wire an explicit metadata.acknowledged=true (or a
 *   dedicated acknowledged_at column) on the human-acknowledge path before
 *   enabling; (b) review STALE_TTL_HOURS with Phil; (c) only then set
 *   SAFETY_STALE_CLOSE_ENABLED=true. Until (a)+(b)+(c), leave DISABLED.
 *
 * Auth: CRON_SECRET header (same convention as sibling crons).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

// Long TTL floor (hours). Deliberately generous so nothing recent is swept.
const STALE_TTL_HOURS = Number(process.env.SAFETY_STALE_TTL_HOURS) || 168; // 7 days

export default async function handler(req, res) {
  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // GUARD 1 — global kill switch. Ships DISABLED. Never touches a row unless a
  // human has explicitly turned this on AFTER the safety review above.
  if (process.env.SAFETY_STALE_CLOSE_ENABLED !== 'true') {
    return res.status(200).json({
      ok: true,
      enabled: false,
      note: 'DRAFT stale-close is disabled (SAFETY_STALE_CLOSE_ENABLED!=true). No-op. See safety review TODO before enabling.',
      closed: 0,
    });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const cutoffIso = new Date(Date.now() - STALE_TTL_HOURS * 60 * 60 * 1000).toISOString();

  // GUARDS 2–4 expressed as a read-only SELECT first (never a blind UPDATE):
  //   resolved_at IS NULL         (never re-close)
  //   created_at  < cutoff        (long TTL)
  //   metadata.acknowledged=true  (explicit human ack — filtered in JS below so
  //                                an active, unacknowledged SOS can never match)
  const { data: candidates, error } = await supabase
    .from('safety_events')
    .select('id, created_at, resolved_at, metadata')
    .is('resolved_at', null)
    .lt('created_at', cutoffIso)
    .limit(200);

  if (error) {
    return res.status(500).json({ error: 'query_failed', message: error.message });
  }

  // Final in-code guard: require an EXPLICIT acknowledged flag. If it is absent
  // (the current reality — nothing writes it yet), the eligible set is EMPTY
  // and this cron closes nothing. That is the intended fail-safe.
  const eligible = (candidates || []).filter((ev) => {
    const meta = (ev.metadata && typeof ev.metadata === 'object') ? ev.metadata : {};
    return meta.acknowledged === true || meta.status === 'acknowledged';
  });

  let closed = 0;
  const nowIso = new Date().toISOString();
  for (const ev of eligible) {
    const { error: upErr } = await supabase
      .from('safety_events')
      .update({ resolved_at: nowIso })
      .eq('id', ev.id)
      .is('resolved_at', null); // re-check at write time — never clobber a resolve
    if (!upErr) closed++;
  }

  return res.status(200).json({
    ok: true,
    enabled: true,
    ttl_hours: STALE_TTL_HOURS,
    candidates: (candidates || []).length,
    eligible: eligible.length,
    closed,
  });
}
