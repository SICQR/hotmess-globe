/**
 * /api/portal/verify
 *
 * Phase 3b — Welcome Portal verifier (read-only stub).
 *
 * The token is minted by the hotmess-founding Stripe webhook on
 * checkout.session.completed and emailed to the partner. Format:
 *
 *     <inquiryId>.<hex(hmacSHA256(inquiryId, PORTAL_COOKIE_SECRET))>
 *
 * This endpoint:
 *   1. Splits + verifies the HMAC (timing-safe).
 *   2. Fetches the founding_partner_inquiries row by id with service role.
 *   3. Only returns it if the row is paid (status='paid' OR paid_at IS NOT NULL).
 *   4. Strips PII not needed for the welcome screen.
 *
 * No cookies are set here. The Welcome Portal is read-only for launch week —
 * Phase 3c+ will introduce a signed-cookie session for richer pages.
 */

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PORTAL_SECRET = process.env.PORTAL_COOKIE_SECRET || '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(res, status, body) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store, max-age=0');
  res.end(JSON.stringify(body));
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function parseToken(token) {
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (trimmed.length < 40 || trimmed.length > 200) return null;
  const dot = trimmed.indexOf('.');
  if (dot < 36) return null;
  const id = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!UUID_RE.test(id)) return null;
  if (!/^[0-9a-f]+$/i.test(sig)) return null;
  return { id, sig };
}

function verifyToken(token) {
  if (!PORTAL_SECRET) return null;
  const parsed = parseToken(token);
  if (!parsed) return null;
  const expected = crypto
    .createHmac('sha256', PORTAL_SECRET)
    .update(parsed.id)
    .digest('hex');
  return timingSafeEqualHex(expected, parsed.sig) ? parsed.id : null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 4096) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'method_not_allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return jsonResponse(res, 500, { error: 'supabase_not_configured' });
  }
  if (!PORTAL_SECRET) {
    return jsonResponse(res, 500, { error: 'portal_secret_not_configured' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return jsonResponse(res, 400, { error: 'bad_request' });
  }

  const token = body && typeof body === 'object' ? body.token : null;
  const id = verifyToken(token || '');
  if (!id) {
    return jsonResponse(res, 401, { error: 'invalid_token' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('founding_partner_inquiries')
    .select(
      'id, entity_name, contact_name, contact_email, city, category, tier_interest, status, paid_at'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[portal/verify] supabase error', error);
    return jsonResponse(res, 500, { error: 'lookup_failed' });
  }
  if (!data) {
    return jsonResponse(res, 404, { error: 'not_found' });
  }

  const paid = data.status === 'paid' || !!data.paid_at;
  if (!paid) {
    return jsonResponse(res, 402, {
      error: 'not_paid_yet',
      status: data.status || 'new',
    });
  }

  return jsonResponse(res, 200, {
    ok: true,
    partner: {
      entity_name: data.entity_name,
      contact_name: data.contact_name,
      city: data.city || null,
      category: data.category || null,
      tier_interest: data.tier_interest || null,
      paid_at: data.paid_at,
    },
  });
}
