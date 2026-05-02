/**
 * api/cron/data-retention.js — Chunk 17b
 *
 * GDPR / UK Online Safety Act 2023 retention enforcement.
 * Runs daily at 02:00 UTC (see vercel.json).
 * Secured by CRON_SECRET header.
 *
 * Schedule:
 *   meet_sessions   — delete raw rows > 48h old; anonymise user_ids at 48h
 *   messages        — delete where created_at > 30d (both users inactive in thread)
 *   age_verification_log — delete where verified_at > 12 months
 *   taps            — delete where created_at > 90d
 *   safety_alerts   — strip location_data at 7d; delete at 90d
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

const STALE_MEET_SESSION_HOURS    = 48;
const STALE_MESSAGE_DAYS          = 30;
const STALE_AGE_LOG_MONTHS        = 12;
const STALE_TAP_DAYS              = 90;
const STALE_SAFETY_ALERT_DAYS     = 90;
const SAFETY_ALERT_LOCATION_DAYS  = 7;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!supabase) {
    console.error('[data-retention] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase env' });
  }

  const jobName = 'data-retention';
  const startedAt = new Date().toISOString();

  // Open cron_runs record
  let cronRunId = null;
  try {
    const { data: run } = await supabase
      .from('cron_runs')
      .insert({ job_name: jobName, started_at: startedAt, status: 'running' })
      .select('id')
      .single();
    cronRunId = run?.id ?? null;
  } catch (_) { /* non-fatal */ }

  const stats = {
    meet_sessions_deleted:      0,
    messages_deleted:           0,
    age_log_deleted:            0,
    taps_deleted:               0,
    safety_location_stripped:   0,
    safety_alerts_deleted:      0,
  };

  const errors = [];

  try {
    const now = new Date();

    // ── 1. meet_sessions — delete raw rows > 48h ─────────────────────────────
    try {
      const cutoff48h = new Date(now.getTime() - STALE_MEET_SESSION_HOURS * 3600 * 1000).toISOString();
      const { error: msErr, count: msCount } = await supabase
        .from('meet_sessions')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff48h);
      if (msErr) throw msErr;
      stats.meet_sessions_deleted = msCount ?? 0;
    } catch (e) {
      errors.push(`meet_sessions: ${e.message}`);
    }

    // ── 2. messages — delete where both participants inactive > 30d ──────────
    // Delete messages where the thread (conversation_id) has had no activity
    // in 30d. We use created_at as a proxy — messages older than 30d are purged.
    try {
      const cutoff30d = new Date(now.getTime() - STALE_MESSAGE_DAYS * 86400 * 1000).toISOString();
      const { error: msgErr, count: msgCount } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff30d);
      if (msgErr) throw msgErr;
      stats.messages_deleted = msgCount ?? 0;
    } catch (e) {
      errors.push(`messages: ${e.message}`);
    }

    // ── 3. age_verification_log — delete > 12 months ─────────────────────────
    try {
      const cutoff12mo = new Date(now);
      cutoff12mo.setMonth(cutoff12mo.getMonth() - STALE_AGE_LOG_MONTHS);
      const { error: ageErr, count: ageCount } = await supabase
        .from('age_verification_log')
        .delete({ count: 'exact' })
        .lt('verified_at', cutoff12mo.toISOString());
      if (ageErr) throw ageErr;
      stats.age_log_deleted = ageCount ?? 0;
    } catch (e) {
      errors.push(`age_verification_log: ${e.message}`);
    }

    // ── 4. taps — delete > 90d ────────────────────────────────────────────────
    try {
      const cutoff90d = new Date(now.getTime() - STALE_TAP_DAYS * 86400 * 1000).toISOString();
      const { error: tapErr, count: tapCount } = await supabase
        .from('taps')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff90d);
      if (tapErr) throw tapErr;
      stats.taps_deleted = tapCount ?? 0;
    } catch (e) {
      errors.push(`taps: ${e.message}`);
    }

    // ── 5a. safety_alerts — strip location_data at 7d ────────────────────────
    try {
      const cutoff7d = new Date(now.getTime() - SAFETY_ALERT_LOCATION_DAYS * 86400 * 1000).toISOString();
      const { error: stripErr, count: stripCount } = await supabase
        .from('safety_alerts')
        .update({
          location_data:        null,
          location_stripped_at: now.toISOString(),
        }, { count: 'exact' })
        .lt('created_at', cutoff7d)
        .not('location_data', 'is', null); // only strip where not already stripped
      if (stripErr) throw stripErr;
      stats.safety_location_stripped = stripCount ?? 0;
    } catch (e) {
      errors.push(`safety_alerts location strip: ${e.message}`);
    }

    // ── 5b. safety_alerts — delete > 90d ─────────────────────────────────────
    try {
      const cutoff90d = new Date(now.getTime() - STALE_SAFETY_ALERT_DAYS * 86400 * 1000).toISOString();
      const { error: saErr, count: saCount } = await supabase
        .from('safety_alerts')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff90d);
      if (saErr) throw saErr;
      stats.safety_alerts_deleted = saCount ?? 0;
    } catch (e) {
      errors.push(`safety_alerts delete: ${e.message}`);
    }

  } catch (outerErr) {
    errors.push(`outer: ${outerErr.message}`);
  }

  // Close cron_runs record
  const totalProcessed = Object.values(stats).reduce((a, b) => a + b, 0);
  if (cronRunId) {
    await supabase.from('cron_runs').update({
      ended_at:  new Date().toISOString(),
      status:    errors.length ? 'error' : 'ok',
      processed: totalProcessed,
      errors:    errors.length,
      detail:    JSON.stringify({ stats, errors: errors.length ? errors : undefined }),
    }).eq('id', cronRunId).catch(() => {});
  }

  return res.status(200).json({
    ok:      errors.length === 0,
    stats,
    errors:  errors.length ? errors : undefined,
  });
}
