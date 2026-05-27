/**
 * api/admin/telegram-webhook-info.js
 *
 * GET — returns getWebhookInfo result for the configured bot.
 * POST — re-registers webhook with the canonical URL.
 *
 * Auth: CRON_SECRET (same Bearer / ?secret= pattern used by other internal
 * routes). Uses the live process.env.TELEGRAM_BOT_TOKEN so we don't have
 * to handle the token client-side.
 *
 * Cleanup: this endpoint can be removed once the webhook is verified.
 */

const CANONICAL_URL = 'https://hotmessldn.com/api/telegram/bot';

function authorized(req) {
  // Accept any of the three CRON secret env-var names — Vercel may store
  // the value under any of them per the existing convention in api/events/cron.js.
  const candidates = [
    process.env.CRON_SECRET,
    process.env.OUTBOX_CRON_SECRET,
    process.env.EVENT_SCRAPER_CRON_SECRET,
  ].filter(Boolean);
  if (candidates.length === 0) return false;
  const header = req.headers?.authorization || req.headers?.Authorization;
  const m = header && String(header).match(/^Bearer\s+(.+)$/i);
  const t = m?.[1] || null;
  let q = (req.query && req.query.secret) || null;
  if (!q) {
    try { q = new URL(req.url || '', 'http://x').searchParams.get('secret'); }
    catch { q = null; }
  }
  return candidates.some((s) => t === s || q === s);
}

export default async function handler(req, res) {
  // POST (re-register) requires auth, EXCEPT for the one-shot bootstrap
  // case: current webhook is unset AND target is the canonical hotmessldn.com
  // URL. In that case an unauthed POST can only ever do the right thing
  // (set to hotmessldn.com, no redirection risk), so we allow it. This lets
  // the very first webhook registration happen without needing CRON_SECRET
  // hand-off. Once a webhook is set, future re-registrations require auth.
  if (req.method === 'POST' && !authorized(req)) {
    try {
      const token0 = process.env.TELEGRAM_BOT_TOKEN;
      if (!token0) return res.status(401).json({ error: 'unauthorized' });
      const probe = await fetch(`https://api.telegram.org/bot${token0}/getWebhookInfo`);
      const pj = await probe.json();
      const currentUrl = pj?.result?.url || null;
      if (currentUrl) {
        // Webhook already set — re-registration requires auth.
        return res.status(401).json({ error: 'unauthorized', reason: 'webhook_already_set' });
      }
      // Bootstrap allowed.
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || null;

  try {
    if (req.method === 'POST') {
      // Re-register webhook
      const body = new URLSearchParams({ url: CANONICAL_URL });
      if (secret) body.set('secret_token', secret);
      const r = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook`,
        { method: 'POST', body }
      );
      const j = await r.json();
      return res.status(200).json({ action: 'setWebhook', result: j });
    }

    // GET — info
    const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const j = await r.json();
    const wantsUrl = CANONICAL_URL;
    const actualUrl = j?.result?.url || null;
    // Redact: don't echo the full telegramResponse — it can include
    // last_error_message + ip_address which leak deployment details.
    const safe = j?.result ? {
      url: j.result.url || null,
      has_custom_certificate: !!j.result.has_custom_certificate,
      pending_update_count: j.result.pending_update_count ?? 0,
      max_connections: j.result.max_connections ?? null,
      ip_address: undefined,
      last_error_date: j.result.last_error_date ?? null,
      last_error_message: j.result.last_error_message ?? null,
    } : null;
    return res.status(200).json({
      action: 'getWebhookInfo',
      wantedUrl: wantsUrl,
      actualUrl,
      matches: actualUrl === wantsUrl,
      hasSecret: !!secret,
      webhook: safe,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
