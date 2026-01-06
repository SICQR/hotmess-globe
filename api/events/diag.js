import { getEnv, getQueryParam, json } from '../shopify/_utils.js';

const isAuthorized = (req) => {
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

  return json(res, 200, {
    ok: true,
    vercel: {
      env: process.env.VERCEL_ENV || null,
      region: process.env.VERCEL_REGION || null,
    },
    has: checks,
    fallbacks,
    hints,
  });
}
