import { getEnv, getQueryParam, json } from '../../shopify/_utils.js';
import { getSupabaseServerClients } from '../../routing/_utils.js';
import { requireAdminOrCron } from '../../_middleware/adminAuth.js';

const getHeader = (req, name) => {
  const value = req?.headers?.[name] || req?.headers?.[name.toLowerCase()] || req?.headers?.[name.toUpperCase()];
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
};

const isRunningOnVercel = () => {
  const flag = process.env.VERCEL || process.env.VERCEL_ENV;
  return !!flag;
};

const isVercelCronRequest = (req) => {
  const value = getHeader(req, 'x-vercel-cron');
  return String(value || '') === '1';
};

const getSecret = () => getEnv('RATE_LIMIT_CLEANUP_SECRET', ['CRON_SECRET']);

const isAuthorizedLegacy = (req) => {
  const secret = getSecret();
  const allowVercelCron = isRunningOnVercel() && isVercelCronRequest(req);

  if (secret && !allowVercelCron) {
    const providedHeader = getHeader(req, 'x-cron-secret');
    const providedQuery =
      getQueryParam(req, 'secret') ||
      getQueryParam(req, 'cron_secret') ||
      getQueryParam(req, 'x_cron_secret');
    const provided = providedHeader || providedQuery;
    return !!provided && String(provided) === String(secret);
  }

  if (!secret && isRunningOnVercel()) {
    return allowVercelCron;
  }

  // Local dev without secrets: allow.
  return true;
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Try new centralized admin/cron auth first
  const authResult = await requireAdminOrCron(req);
  
  // Fall back to legacy cron auth if new auth fails (for backwards compatibility)
  if (authResult.error && !isAuthorizedLegacy(req)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const { error, serviceClient } = getSupabaseServerClients();
  if (error || !serviceClient) {
    return json(res, 500, { error: error || 'Supabase service client unavailable' });
  }

  // Keep some history for debugging; purge older buckets.
  const cutoffDays = Number(getQueryParam(req, 'days') || 2);
  const safeDays = Number.isFinite(cutoffDays) ? Math.min(Math.max(Math.trunc(cutoffDays), 1), 30) : 2;

  const cutoffIso = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();

  const { error: deleteError, count } = await serviceClient
    .from('routing_rate_limits')
    .delete({ count: 'exact' })
    .lt('window_start', cutoffIso);

  if (deleteError) {
    return json(res, 500, { error: deleteError.message || 'Failed to cleanup routing_rate_limits' });
  }

  return json(res, 200, { ok: true, deleted: count ?? null, cutoff_days: safeDays, cutoff_iso: cutoffIso });
}
