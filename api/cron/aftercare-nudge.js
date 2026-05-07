/**
 * api/cron/aftercare-nudge.js
 *
 * Fires the post-meetup "you good?" prompt 4h after a movement_session
 * arrives. The component (`src/components/safety/AftercareNudge.jsx`) is a
 * passive UI that reacts to events; before this cron, the only trigger was a
 * user-set check-in timer expiring. Anyone who completed a meet-up without a
 * timer never saw the nudge.
 *
 * Schedule: every 30 minutes (cron expression: every-30-min on hour boundary).
 * Secret: CRON_SECRET header.
 *
 * Logic:
 *   1. Find movement_sessions where arrived_at is between (now-5h, now-4h)
 *      — the 1-hour window stops missed runs from re-firing the nudge later
 *      and gives Vercel slack on cron jitter.
 *   2. Skip users who already received a nudge for this session — dedup via
 *      notification_outbox.notification_type='aftercare_nudge' rows scoped to
 *      the session_id in metadata.
 *   3. Skip users who manually responded — safety_checkins where
 *      status='aftercare_response' since arrived_at.
 *   4. Insert one notification_outbox row (channel='push', notification_type
 *      ='aftercare_nudge') per qualifying session. The dispatcher cron picks
 *      it up within 5min and surfaces a push that deep-links to /?aftercare=1.
 *
 * Idempotency comes purely from the dedup queries — no DB schema changes.
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

const NUDGE_LOOKBACK_HOURS = 5;
const NUDGE_FIRE_AFTER_HOURS = 4;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!supabase) {
    console.error('[aftercare-nudge] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() - NUDGE_FIRE_AFTER_HOURS * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - NUDGE_LOOKBACK_HOURS * 60 * 60 * 1000);

  let scanned = 0;
  let queued = 0;
  let skippedAlreadyNudged = 0;
  let skippedAlreadyResponded = 0;
  let errors = 0;

  try {
    const { data: sessions, error: sessErr } = await supabase
      .from('movement_sessions')
      .select('id, user_id, destination_label, arrived_at')
      .not('arrived_at', 'is', null)
      .gte('arrived_at', windowStart.toISOString())
      .lt('arrived_at', windowEnd.toISOString());

    if (sessErr) {
      console.error('[aftercare-nudge] sessions query failed:', sessErr.message);
      return res.status(500).json({ error: 'sessions_query_failed', detail: sessErr.message });
    }

    scanned = sessions?.length ?? 0;

    for (const session of sessions ?? []) {
      try {
        // 1. Already nudged for this session?
        const { count: priorNudges } = await supabase
          .from('notification_outbox')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user_id)
          .eq('notification_type', 'aftercare_nudge')
          .filter('metadata->>session_id', 'eq', session.id);
        if ((priorNudges ?? 0) > 0) {
          skippedAlreadyNudged++;
          continue;
        }

        // 2. Already responded manually since arrival?
        const { count: priorResponses } = await supabase
          .from('safety_checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user_id)
          .eq('status', 'aftercare_response')
          .gte('check_in_time', session.arrived_at);
        if ((priorResponses ?? 0) > 0) {
          skippedAlreadyResponded++;
          continue;
        }

        // 3. Queue the nudge.
        const dest = session.destination_label?.trim();
        const message = dest
          ? `How was ${dest}? Tap to check in.`
          : 'How are you doing? Tap to check in.';

        const { error: insErr } = await supabase
          .from('notification_outbox')
          .insert({
            user_id: session.user_id,
            notification_type: 'aftercare_nudge',
            title: 'You good?',
            message,
            channel: 'push',
            push_priority: 5,
            status: 'queued',
            metadata: {
              session_id: session.id,
              source: 'cron/aftercare-nudge',
              destination_label: dest ?? null,
              arrived_at: session.arrived_at,
              click_url: '/?aftercare=1',
            },
          });

        if (insErr) {
          console.error(`[aftercare-nudge] outbox insert failed for session ${session.id}:`, insErr.message);
          errors++;
          continue;
        }

        queued++;
      } catch (err) {
        console.error('[aftercare-nudge] per-session error:', err?.message ?? err);
        errors++;
      }
    }
  } catch (err) {
    console.error('[aftercare-nudge] unexpected error:', err?.message ?? err);
    return res.status(500).json({ error: 'unexpected', detail: err?.message ?? String(err) });
  }

  console.log(
    `[aftercare-nudge] scanned=${scanned} queued=${queued} skipped_already_nudged=${skippedAlreadyNudged} skipped_already_responded=${skippedAlreadyResponded} errors=${errors}`,
  );

  return res.status(200).json({
    ok: true,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    scanned,
    queued,
    skipped_already_nudged: skippedAlreadyNudged,
    skipped_already_responded: skippedAlreadyResponded,
    errors,
  });
}
