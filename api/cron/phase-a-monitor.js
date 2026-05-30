/**
 * D12 Slice 2 / #303 Phase A monitor — hourly drift check during the 24h hold.
 *
 * Phil-locked 2026-05-30: turn the hold into structural discipline instead of
 * vibes. Calls phase_a_monitor_check() once per hour. Pings Telegram only when
 * severity > 0 (drift detected) or when the 24h window is about to close.
 *
 * Auth: CRON_SECRET via Bearer or ?secret=. Same pattern as the morning digest.
 *
 * Self-bounded: window_start + window_end live in the SQL function. After the
 * hold expires, the function returns window_active=false and this handler
 * skips the Telegram ping (still returns the JSON so the cron logs stay clean).
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PHIL_CHAT_ID = process.env.PHIL_TELEGRAM_CHAT_ID;
const CRON_SECRET = process.env.CRON_SECRET;

async function sendTelegram(text, opts = {}) {
  if (!TELEGRAM_BOT_TOKEN || !PHIL_CHAT_ID) {
    return { ok: false, skipped: 'PHIL_TELEGRAM_CHAT_ID or TELEGRAM_BOT_TOKEN not configured' };
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: PHIL_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...opts,
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function fmtDriftMessage(snap) {
  const d = snap.drift_signals || {};
  const h = snap.health_snapshot || {};
  const lines = [
    '*Phase A drift detected*',
    `_${snap.checked_at}_  · ${snap.hours_remaining}h left in window`,
    '',
    '*Drift signals*',
    `· backfill drift: \`${d.backfill_drift ?? '?'}\``,
    `· care drift: \`${d.care_drift ?? '?'}\``,
    `· render disagreement: \`${d.render_disagreement ?? '?'}\``,
    `· recent insert drift: \`${d.recent_insert_drift ?? '?'}\``,
    '',
    '*Health snapshot*',
    `· total ${h.total_beacons} · live ${h.live_active}`,
    `· beacon=${h.beacon_rows} venue=${h.venue_rows} event=${h.event_rows}`,
    `· aftercare rows: ${h.aftercare_rows}`,
    '',
    'Investigate before starting Phase B.',
  ];
  return lines.join('\n');
}

export default async function handler(req, res) {
  // Auth — Vercel cron passes Bearer CRON_SECRET. Manual triggers via ?secret= for ops.
  const auth = req.headers.authorization || '';
  const querySecret = (req.query && req.query.secret) || '';
  const okAuth = auth === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
  if (!okAuth) {
    return res.status(401).json({ error: 'unauthorised' });
  }

  // Call the SQL function. Returns a single jsonb column.
  const { data, error } = await supabase.rpc('phase_a_monitor_check');

  if (error) {
    console.error('[phase-a-monitor] rpc failed:', error.message);
    return res.status(500).json({ error: 'rpc_failed', message: error.message });
  }

  const snap = data || {};
  const severity = snap.severity ?? 0;
  const windowActive = snap.window_active === true;

  // Only ping Telegram when window is still active AND drift was detected.
  // No ping for the all-clean hourly check (Phil-locked: ping ONLY on drift).
  let tg = null;
  if (windowActive && severity > 0) {
    tg = await sendTelegram(fmtDriftMessage(snap));
    console.warn('[phase-a-monitor] drift detected, severity=' + severity);
  } else if (!windowActive) {
    console.log('[phase-a-monitor] window closed — no further pings');
  } else {
    console.log('[phase-a-monitor] severity=0, clean check, no ping');
  }

  return res.status(200).json({
    ok: true,
    window_active: windowActive,
    severity,
    drift_signals: snap.drift_signals || null,
    hours_remaining: snap.hours_remaining ?? null,
    telegram: tg,
  });
}
