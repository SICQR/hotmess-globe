import { getEnv, getQueryParam, json, getBearerToken } from '../../shopify/_utils.js';
import { getSupabaseServerClients } from '../../routing/_utils.js';
import { requireAdmin } from '../../_middleware/adminAuth.js';

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

/**
 * Check if request is authorized via cron secret or Vercel cron header.
 * For automated cron jobs.
 */
const isAuthorizedViaCron = (req) => {
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

  // Local dev without secrets: allow cron-style requests
  return !getBearerToken(req); // Only allow if no bearer token (avoid conflict with admin auth)
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error || !serviceClient) {
    return json(res, 500, { error: error || 'Supabase service client unavailable' });
  }

  // Support both cron secret auth (automated jobs) and admin JWT auth (manual triggers)
  const hasBearerToken = !!getBearerToken(req);
  
  if (hasBearerToken) {
    // Admin JWT authentication for manual triggers
    const adminCheck = await requireAdmin(req, { anonClient, serviceClient });
    if (adminCheck.error) {
      return json(res, adminCheck.status, { error: adminCheck.error });
    }
  } else if (!isAuthorizedViaCron(req)) {
    // Cron secret authentication for automated jobs
    return json(res, 401, { error: 'Unauthorized' });
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
