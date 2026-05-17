/**
 * GET/POST /api/admin/wa-template-create
 *
 * One-shot endpoint that submits the safety_alert_v1 WhatsApp template
 * to Meta for approval. Idempotent: if the template already exists,
 * returns the existing one.
 *
 * Diagnostic: writes every Meta API response to public._wa_template_diag
 * so we can inspect failures even when runtime logs truncate.
 */
import { createClient } from '@supabase/supabase-js';

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '823532027036864';
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function diagWrite(stage, httpStatus, body) {
  if (!supabaseUrl || !serviceKey) return;
  try {
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    await sb.from('_wa_template_diag').insert({ stage, http_status: httpStatus, meta_response: body });
  } catch (e) {
    console.error('[wa-template-create] diag write failed', e?.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  if (!isAuthorized(req)) return json(res, 401, { error: 'unauthorized' });

  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN;
  if (!token) {
    await diagWrite('no_token', 0, { error: 'no token env' });
    return json(res, 500, { error: 'no_token' });
  }

  await diagWrite('start', 0, { waba: WABA_ID, token_len: token.length, token_prefix: token.slice(0, 8) });

  // 1. List existing templates
  const listRes = await fetch(
    `https://graph.facebook.com/v17.0/${WABA_ID}/message_templates?fields=name,status,language,category`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listBody = await listRes.json();
  await diagWrite('list', listRes.status, listBody);
  if (!listRes.ok) {
    return json(res, 502, { error: 'list_failed', status_code: listRes.status, response: listBody });
  }
  const existing = (listBody.data || []).find(t => t.name === 'safety_alert_v1');
  if (existing) {
    return json(res, 200, { ok: true, action: 'already_exists', template: existing, all: listBody.data });
  }

  // 2. Create
  const template = {
    name: 'safety_alert_v1',
    language: 'en_GB',
    category: 'UTILITY',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'HOTMESS SOS' },
      {
        type: 'BODY',
        text: '{{1}} just pressed SOS in HOTMESS.\n\nLocation: {{2}}\n\nAcknowledge: {{3}}',
        example: { body_text: [['Glen', 'https://maps.google.com/?q=51.5074,-0.1278', 'https://hotmessldn.com/sos/ack/abc123']] },
      },
      { type: 'FOOTER', text: 'HOTMESS member safety' },
    ],
  };
  const createRes = await fetch(
    `https://graph.facebook.com/v17.0/${WABA_ID}/message_templates`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(template) }
  );
  const createBody = await createRes.json();
  await diagWrite('create', createRes.status, createBody);
  return json(res, createRes.ok ? 200 : 502, {
    ok: createRes.ok,
    action: 'submitted',
    status_code: createRes.status,
    response: createBody,
  });
}
