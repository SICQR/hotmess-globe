/**
 * GET/POST /api/admin/wa-template-create
 *
 * One-shot endpoint that submits the safety_alert_v1 WhatsApp template
 * to Meta for approval. Idempotent: if the template already exists on
 * the WABA, returns the existing one instead of resubmitting.
 *
 * Auth (any of):
 *   - Bearer ${CRON_SECRET} (or OUTBOX_CRON_SECRET)
 *   - x-vercel-cron header (Vercel cron trigger)
 *
 * Wired into vercel.json as a daily cron so Vercel's edge invokes it
 * automatically. Once the template lands status APPROVED, this file +
 * cron entry can be deleted.
 *
 * Why this exists: post-Glen (8 silent SOS presses 2026-05-17), WhatsApp
 * is supposed to be one of three redundant ops channels to Phil. WABA
 * 823532027036864 had zero templates → WhatsApp ops sends were no-oping.
 * Template bootstrap closes the last gap.
 */
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '823532027036864';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(body, null, 2));
}

function isAuthorized(req) {
  if (req.headers['x-vercel-cron']) return true;
  const cronSecret = process.env.CRON_SECRET || process.env.OUTBOX_CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${cronSecret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });

  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN;
  if (!token) return json(res, 500, { error: 'no_token' });

  // 1. Check existing templates first — idempotent.
  const listRes = await fetch(
    `https://graph.facebook.com/v17.0/${WABA_ID}/message_templates?fields=name,status,language,category`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listBody = await listRes.json();
  if (!listRes.ok) {
    return json(res, 502, { error: 'list_failed', status_code: listRes.status, response: listBody });
  }
  const existing = (listBody.data || []).find(t => t.name === 'safety_alert_v1');
  if (existing) {
    return json(res, 200, { ok: true, action: 'already_exists', template: existing, all: listBody.data });
  }

  // 2. Submit template.
  //   {{1}} = user display name
  //   {{2}} = location URL (Google Maps) or '(no location)'
  //   {{3}} = ack URL
  // UTILITY = transactional account-related notification (not marketing).
  const template = {
    name: 'safety_alert_v1',
    language: 'en_GB',
    category: 'UTILITY',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'HOTMESS SOS' },
      {
        type: 'BODY',
        text: '{{1}} just pressed SOS in HOTMESS.\n\nLocation: {{2}}\n\nAcknowledge: {{3}}',
        example: {
          body_text: [[
            'Glen',
            'https://maps.google.com/?q=51.5074,-0.1278',
            'https://hotmessldn.com/sos/ack/abc123',
          ]],
        },
      },
      { type: 'FOOTER', text: 'HOTMESS member safety' },
    ],
  };

  const createRes = await fetch(
    `https://graph.facebook.com/v17.0/${WABA_ID}/message_templates`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    }
  );
  const createBody = await createRes.json();
  return json(res, createRes.ok ? 200 : 502, {
    ok: createRes.ok,
    action: 'submitted',
    status_code: createRes.status,
    response: createBody,
    template_sent: template,
  });
}
