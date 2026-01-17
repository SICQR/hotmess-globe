import { getEnv, getQueryParam, json } from '../shopify/_utils.js';

const isAuthorized = (req) => {
  // Local dev convenience: this endpoint only returns booleans + hints (no secrets),
  // so allow it to run when not on Vercel.
  if (!process.env.VERCEL && !process.env.VERCEL_ENV) return true;

  const cronHeader = req.headers?.['x-vercel-cron'];
  if (cronHeader === '1' || cronHeader === 1 || cronHeader === true) return true;

  const secret = getEnv('EVENT_SCRAPER_CRON_SECRET');
  if (!secret) return false;

  const header = req.headers?.authorization || req.headers?.Authorization;
  const match = header && String(header).match(/^Bearer\s+(.+)$/i);
  const headerToken = match?.[1] || null;
  const queryToken = getQueryParam(req, 'secret');
  return headerToken === secret || queryToken === secret;
};

const isPresent = (key) => {
  const value = process.env[key];
  return !!(value && String(value).trim());
};

const parseUrl = (value) => {
  if (!value) return null;
  try {
    return new URL(String(value));
  } catch {
    return null;
  }
};

const readQueryFlag = (req, key) => {
  const raw = getQueryParam(req, key);
  if (!raw) return false;
  const value = String(raw).trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
};

const probeSupabaseAuthHealth = async ({ url, anonKey }) => {
  if (!url || !anonKey) return { ok: false, status: null, error: 'missing_url_or_key' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${String(url).replace(/\/+$/, '')}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: String(anonKey),
      },
      signal: controller.signal,
    });

    // Health endpoints usually respond with JSON, but we don't depend on it.
    return { ok: res.ok, status: res.status, error: null };
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'timeout'
      : error?.cause?.code || error?.code || error?.message || 'fetch_failed';
    return { ok: false, status: null, error: String(message) };
  } finally {
    clearTimeout(timeout);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return json(res, 401, {
      error: 'Unauthorized',
      details:
        'Run via Vercel Cron (x-vercel-cron) or set EVENT_SCRAPER_CRON_SECRET then call /api/events/diag?secret=... (or Authorization: Bearer ...).',
    });
  }

  const checks = {
    OPENAI_API_KEY: isPresent('OPENAI_API_KEY'),
    OPENAI_MODEL: isPresent('OPENAI_MODEL'),

    SUPABASE_URL: isPresent('SUPABASE_URL'),
    SUPABASE_ANON_KEY: isPresent('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: isPresent('SUPABASE_SERVICE_ROLE_KEY'),

    EVENT_SCRAPER_SOURCES_JSON: isPresent('EVENT_SCRAPER_SOURCES_JSON'),
    EVENT_SCRAPER_CRON_SECRET: isPresent('EVENT_SCRAPER_CRON_SECRET'),
  };

  const fallbacks = {
    VITE_SUPABASE_URL: isPresent('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: isPresent('VITE_SUPABASE_ANON_KEY'),
    vite_publicSUPABASE_URL: isPresent('vite_publicSUPABASE_URL'),
    vite_publicSUPABASE_ANON_KEY: isPresent('vite_publicSUPABASE_ANON_KEY'),
  };

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'vite_publicSUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY', 'vite_publicSUPABASE_ANON_KEY']);
  const parsedSupabaseUrl = parseUrl(supabaseUrl);
  const shouldProbe = readQueryFlag(req, 'probe');
  const supabaseProbe = shouldProbe
    ? await probeSupabaseAuthHealth({ url: supabaseUrl, anonKey: supabaseAnonKey })
    : null;

  const canScrape = checks.EVENT_SCRAPER_SOURCES_JSON || checks.OPENAI_API_KEY;
  const eventScraper = {
    canScrape,
    mode: checks.EVENT_SCRAPER_SOURCES_JSON
      ? 'json_sources'
      : checks.OPENAI_API_KEY
        ? 'openai_fallback'
        : 'disabled',
  };

  const hints = [];
  if (!checks.SUPABASE_URL && (fallbacks.VITE_SUPABASE_URL || fallbacks.vite_publicSUPABASE_URL)) {
    hints.push('SUPABASE_URL is missing but a Vite-prefixed URL is present; ensure server env uses SUPABASE_URL.');
  }
  if (!checks.SUPABASE_ANON_KEY && (fallbacks.VITE_SUPABASE_ANON_KEY || fallbacks.vite_publicSUPABASE_ANON_KEY)) {
    hints.push('SUPABASE_ANON_KEY is missing but a Vite-prefixed anon key is present; ensure server env uses SUPABASE_ANON_KEY.');
  }
  if (!checks.OPENAI_API_KEY) {
    hints.push('OPENAI_API_KEY not visible to this function. Confirm env is set for the correct Vercel environment (Preview/Production) and redeploy.');
  }
  if (!checks.EVENT_SCRAPER_SOURCES_JSON && checks.OPENAI_API_KEY) {
    hints.push('EVENT_SCRAPER_SOURCES_JSON is optional because OpenAI fallback is enabled (OPENAI_API_KEY present).');
  }
  if (!canScrape) {
    hints.push('Event scraper cannot run: set EVENT_SCRAPER_SOURCES_JSON or OPENAI_API_KEY.');
  }
  if (checks.OPENAI_API_KEY && !checks.OPENAI_MODEL) {
    hints.push('OPENAI_MODEL is not set; defaulting to gpt-4o-mini. Set OPENAI_MODEL explicitly to control costs/quality.');
  }

  return json(res, 200, {
    ok: true,
    vercel: {
      env: process.env.VERCEL_ENV || null,
      region: process.env.VERCEL_REGION || null,
    },
    supabase: {
      urlHost: parsedSupabaseUrl?.host || null,
      urlProtocol: parsedSupabaseUrl?.protocol || null,
      authHealth: supabaseProbe,
    },
    has: checks,
    eventScraper,
    fallbacks,
    examples: {
      EVENT_SCRAPER_SOURCES_JSON: {
        '*': ['https://example.com/events/all.json'],
        London: ['https://example.com/events/london.json'],
        Manchester: ['https://example.com/events/manchester.json'],
        Brighton: ['https://example.com/events/brighton.json'],
      },
      OPENAI_MODEL: 'gpt-4o-mini',
    },
    hints,
  });
}
