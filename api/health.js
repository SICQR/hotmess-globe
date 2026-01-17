import { getEnv, json } from './shopify/_utils.js';

const bool = (v) => Boolean(v && String(v).trim());
const hostFromUrl = (raw) => {
  try {
    return new URL(String(raw)).host;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') return json(res, 405, { ok: false, error: 'Method not allowed' });

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  const googleMapsApiKey = getEnv('GOOGLE_MAPS_API_KEY');
  const ticketSecret = getEnv('TICKET_QR_SIGNING_SECRET', ['QR_SIGNING_SECRET']);
  const outboxCron = getEnv('OUTBOX_CRON_SECRET', ['CRON_SECRET']);
  const rateLimitCron = getEnv('RATE_LIMIT_CLEANUP_SECRET', ['CRON_SECRET']);
  const eventScraperCron = getEnv('EVENT_SCRAPER_CRON_SECRET');

  const rawTicket = process.env.TICKET_QR_SIGNING_SECRET;
  const rawQrTicket = process.env.QR_SIGNING_SECRET;

  const env = {
    // Required
    SUPABASE_URL: bool(supabaseUrl),
    SUPABASE_ANON_KEY: bool(supabaseAnonKey),

    // Recommended for production features
    SUPABASE_SERVICE_ROLE_KEY: bool(supabaseServiceRoleKey),
    TICKET_QR_SIGNING_SECRET: bool(ticketSecret),
    OUTBOX_CRON_SECRET: bool(outboxCron),
    RATE_LIMIT_CLEANUP_SECRET: bool(rateLimitCron),
    EVENT_SCRAPER_CRON_SECRET: bool(eventScraperCron),

    // Optional
    GOOGLE_MAPS_API_KEY: bool(googleMapsApiKey),
  };

  let supabaseAuthHealth = null;
  let supabaseAuthHealthStatus = null;
  let supabaseAuthHealthError = null;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const url = new URL('/auth/v1/health', supabaseUrl).toString();
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });
      supabaseAuthHealthStatus = r.status;
      const contentType = r.headers.get('content-type') || '';
      supabaseAuthHealth = contentType.includes('application/json') ? await r.json() : await r.text();
    } catch (err) {
      supabaseAuthHealthError = err?.message || String(err);
    }
  }

  const missingRequired = !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY;
  const authHealthOk = supabaseAuthHealthStatus === null ? false : supabaseAuthHealthStatus >= 200 && supabaseAuthHealthStatus < 300;

  const ok = !missingRequired && (authHealthOk || supabaseAuthHealthError === null);

  return json(res, ok ? 200 : 500, {
    ok,
    runtime: {
      vercel: bool(process.env.VERCEL || process.env.VERCEL_ENV),
      vercelEnv: process.env.VERCEL_ENV || null,
      nodeEnv: process.env.NODE_ENV || null,
      region: process.env.VERCEL_REGION || null,
    },
    supabase: {
      urlHost: hostFromUrl(supabaseUrl),
      authHealthStatus: supabaseAuthHealthStatus,
      authHealthError: supabaseAuthHealthError,
      authHealth: supabaseAuthHealth,
    },
    debug: {
      // Never return secret values; only presence metadata.
      hasTicketEnvKey: Object.prototype.hasOwnProperty.call(process.env, 'TICKET_QR_SIGNING_SECRET'),
      ticketEnvLen: typeof rawTicket === 'string' ? rawTicket.trim().length : null,
      hasQrSigningEnvKey: Object.prototype.hasOwnProperty.call(process.env, 'QR_SIGNING_SECRET'),
      qrSigningEnvLen: typeof rawQrTicket === 'string' ? rawQrTicket.trim().length : null,
    },
    env,
  });
}
