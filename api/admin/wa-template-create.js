/**
 * POST /api/admin/wa-template-create
 *
 * One-time admin endpoint to submit the safety_alert_v1 WhatsApp template
 * for approval. Auth via CRON_SECRET. Idempotent — if template already
 * exists, returns the existing one. Delete this file after Meta approves
 * the template (target deletion: 2026-05-19).
 *
 * Why this exists: post-Glen (8 silent SOS presses 2026-05-17), we need
 * WhatsApp as a redundant ops channel to Phil. WABA 823532027036864 has
 * zero templates → SOS WhatsApp sends fail. This bootstraps the template.
 */
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '823532027036864';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(body, null, 2));
}

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET || process.env.OUTBOX_CRON_SECRET;
  if (!cronSecret) return false;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${cronSecret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });

  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN;
  if (!token) return json(res, 500, { error: 'no_token' });

  // First check existing templates
  const listRes = await fetch(
    `https://graph.facebook.com/v17.0/${WABA_ID}/message_templates?fields=name,status,language,category`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listBody = await listRes.json();
  const existing = (listBody.data || []).find(t => t.name === 'safety_alert_v1');
  if (existing) {
    return json(res, 200, { ok: true, action: 'already_exists', template: existing, all: listBody.data });
  }

  // Template body uses 3 positional params:
  //   {{1}} = user display name
  //   {{2}} = location URL (Google Maps) or '(no location)'
  //   {{3}} = ack URL
  // Category UTILITY — safety alert is account-related, not marketing.
  const template = {
    name: 'safety_alert_v1',
    language: 'en_GB',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'HOTMESS SOS',
      },
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
      {
        type: 'FOOTER',
        text: 'HOTMESS member safety',
      },
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
