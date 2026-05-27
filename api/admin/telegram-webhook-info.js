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
  const secret =
    process.env.CRON_SECRET ||
    process.env.OUTBOX_CRON_SECRET ||
    process.env.EVENT_SCRAPER_CRON_SECRET;
  if (!secret) return false;
  const header = req.headers?.authorization || req.headers?.Authorization;
  const m = header && String(header).match(/^Bearer\s+(.+)$/i);
  const t = m?.[1] || null;
  const q =
    (req.query && req.query.secret) ||
    new URL(req.url || '', 'http://x').searchParams.get('secret');
  return t === secret || q === secret;
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
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
    return res.status(200).json({
      action: 'getWebhookInfo',
      wantedUrl: wantsUrl,
      actualUrl,
      matches: actualUrl === wantsUrl,
      hasSecret: !!secret,
      telegramResponse: j,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
