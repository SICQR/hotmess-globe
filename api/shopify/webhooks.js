import crypto from 'node:crypto';
import { getEnv, json, readJsonBody } from './_utils.js';

const timingSafeEqual = (a, b) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const verifyWebhook = ({ secret, rawBody, signature }) => {
  if (!secret || !signature || !rawBody) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return timingSafeEqual(digest, signature);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const secret = getEnv('SHOPIFY_WEBHOOK_SECRET');
  if (!secret) {
    return json(res, 500, { error: 'Webhook secret not configured', details: 'Set SHOPIFY_WEBHOOK_SECRET.' });
  }

  // Vercel may hand us a parsed body; we need a stable raw string for HMAC.
  // Prefer reading the raw body if possible.
  let rawBody = null;
  if (typeof req.body === 'string') rawBody = req.body;
  if (!rawBody) {
    const parsed = await readJsonBody(req);
    rawBody = parsed ? JSON.stringify(parsed) : '';
  }

  const signature = String(req.headers?.['x-shopify-hmac-sha256'] || req.headers?.['X-Shopify-Hmac-Sha256'] || '');
  const topic = String(req.headers?.['x-shopify-topic'] || req.headers?.['X-Shopify-Topic'] || '');

  const ok = verifyWebhook({ secret, rawBody, signature });
  if (!ok) {
    return json(res, 401, { error: 'Invalid webhook signature' });
  }

  // Parse JSON payload (best-effort)
  const body = (() => {
    try {
      return rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return null;
    }
  })();

  // This endpoint is intentionally non-customer-facing.
  // Hook your internal analytics/messaging here.
  res.setHeader('Cache-Control', 'no-store');
  return json(res, 200, {
    ok: true,
    received: {
      topic,
      id: body?.id || body?.admin_graphql_api_id || null,
    },
  });
}
