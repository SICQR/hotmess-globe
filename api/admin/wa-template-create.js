/**
 * GET/POST /api/admin/wa-template-create
 *
 * One-shot endpoint that submits the safety_alert_v1 WhatsApp template
 * to Meta for approval. Idempotent: if the template already exists on
 * the WABA, returns the existing one instead of resubmitting.
 *
 * Wired into vercel.json as a per-minute cron until template approved,
 * then file + cron entry should be removed.
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
  if (!token) {
    console.error('[wa-template-create] no_token');
    return json(res, 500, { error: 'no_token' });
  }
  console.log('[wa-template-create] starting | waba=' + WABA_ID + ' | token_len=' + token.length + ' | token_prefix=' + token.slice(0,8));

  const listRes = await fetch(
    `https://graph.facebook.com/v17.0/${WABA_ID}/message_templates?fields=name,status,language,category`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listBody = await listRes.json();
  console.log('[wa-template-create] list status=' + listRes.status + ' body=' + JSON.stringify(listBody).slice(0,800));
  if (!listRes.ok) {
    return json(res, 502, { error: 'list_failed', status_code: listRes.status, response: listBody });
  }
  const existing = (listBody.data || []).find(t => t.name === 'safety_alert_v1');
  if (existing) {
    console.log('[wa-template-create] already exists | status=' + existing.status);
    return json(res, 200, { ok: true, action: 'already_exists', template: existing, all: listBody.data });
  }

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
  console.log('[wa-template-create] create status=' + createRes.status + ' body=' + JSON.stringify(createBody).slice(0,800));
  return json(res, createRes.ok ? 200 : 502, {
    ok: createRes.ok,
    action: 'submitted',
    status_code: createRes.status,
    response: createBody,
  });
}
