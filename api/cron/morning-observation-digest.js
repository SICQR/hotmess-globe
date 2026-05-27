/**
 * Morning observation digest — reads the obs_* views and sends a short summary
 * to Phil's Telegram at 09:00 UTC daily.
 *
 * Phil 2026-05-27 — observation phase. Passive views become active push so
 * the morning brief isn't a ritual that requires remembering to look.
 *
 * Triggers an alert ping (separate message) when feedback_clusters has any
 * escalated > 0 rows — that's a "trust/safety concern was filed" signal and
 * it should not wait for the next morning's read.
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

function fmtPipeline(p) {
  if (!p) return 'no pipeline data';
  return `boos:${p.total_boos ?? 0} · mutual:${p.mutual_pairs ?? 0} · trusted-eligible:${p.trusted_eligible_pairs ?? 0} · new-mutuals-7d:${p.new_mutuals_last_7d ?? 0}`;
}
function fmtCadence(c) {
  if (!c || c.total_droppers == null) return 'no cadence data';
  const med = c.median_gap_hours != null ? `${Number(c.median_gap_hours).toFixed(1)}h` : '—';
  return `droppers:${c.total_droppers} (${c.returning_droppers ?? 0} returning) · median-gap:${med}`;
}
function fmtBoost(rows) {
  if (!rows || rows.length === 0) return '_no purchases in last 14d_';
  return rows.map((r) => `· *${r.boost_key}* — bought ${r.purchased}, active ${r.active_now}, consumed ${r.consumed}, repeat-buys ${r.repeat_buys}`).join('\n');
}
function fmtFeedbackTop(rows, max = 8) {
  if (!rows || rows.length === 0) return '_no feedback in last 72h_';
  return rows.slice(0, max).map((r) =>
    `· *${r.temperature}* on \`${r.surface}\` (${r.type}) — ${r.hits} hit${r.hits === 1 ? '' : 's'}${r.escalated > 0 ? ` *⚠️ ${r.escalated} escalated*` : ''}`,
  ).join('\n');
}

export default async function handler(req, res) {
  // Auth — Vercel cron passes Bearer CRON_SECRET. Manual triggers via ?secret= for ops.
  const auth = req.headers.authorization || '';
  const querySecret = (req.query && req.query.secret) || '';
  const okAuth = auth === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
  if (!okAuth) {
    return res.status(401).json({ error: 'unauthorised' });
  }

  // Read all four views in parallel. Each one is small + indexed.
  const [feedbackRes, boostRes, cadenceRes, pipelineRes] = await Promise.all([
    supabase.from('obs_feedback_clusters_72h').select('*').limit(30),
    supabase.from('obs_boost_lifecycle_14d').select('*').limit(20),
    supabase.from('obs_beacon_return_cadence_30d').select('*').limit(1),
    supabase.from('obs_relationship_pipeline').select('*').limit(1),
  ]);

  if (feedbackRes.error) console.warn('[digest] feedback read failed:', feedbackRes.error.message);
  if (boostRes.error) console.warn('[digest] boost read failed:', boostRes.error.message);
  if (cadenceRes.error) console.warn('[digest] cadence read failed:', cadenceRes.error.message);
  if (pipelineRes.error) console.warn('[digest] pipeline read failed:', pipelineRes.error.message);

  const feedback = feedbackRes.data || [];
  const boost = boostRes.data || [];
  const cadence = (cadenceRes.data || [])[0] || null;
  const pipeline = (pipelineRes.data || [])[0] || null;

  // Build the morning message.
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const totalEscalated = feedback.reduce((s, r) => s + (r.escalated || 0), 0);

  const lines = [
    `*HOTMESS — morning observation · ${date}*`,
    '',
    '*Feedback (72h)*',
    fmtFeedbackTop(feedback),
    '',
    '*Boost lifecycle (14d)*',
    fmtBoost(boost),
    '',
    '*Beacon cadence (30d)*  ' + fmtCadence(cadence),
    '*Relationship pipeline*  ' + fmtPipeline(pipeline),
    '',
    `_feedback rows: ${feedback.length} · boost rows: ${boost.length}_`,
  ];

  const digestText = lines.join('\n');
  const digestResult = await sendTelegram(digestText);

  // If any escalated rows, send a separate alert ping (different chat thread,
  // bumps Phil's notification — escalations shouldn't wait for the body).
  let alertResult = null;
  if (totalEscalated > 0) {
    const alertLines = [
      '⚠️ *Escalated feedback — last 72h*',
      '',
      ...feedback.filter((r) => (r.escalated || 0) > 0)
        .slice(0, 10)
        .map((r) => `· ${r.escalated}× *${r.temperature}* on \`${r.surface}\` (${r.type})`),
      '',
      '_See /admin/feedback for full thread._',
    ];
    alertResult = await sendTelegram(alertLines.join('\n'), { disable_notification: false });
  }

  return res.status(200).json({
    ok: true,
    date,
    counts: {
      feedback_rows: feedback.length,
      boost_rows: boost.length,
      escalated: totalEscalated,
    },
    digest_sent: digestResult.ok,
    alert_sent: alertResult ? alertResult.ok : null,
    digest_telegram_status: digestResult.status,
    digest_telegram_skipped: digestResult.skipped || null,
  });
}
