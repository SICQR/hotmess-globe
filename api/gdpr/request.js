import { getBearerToken, json, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';
import { bestEffortRateLimit, minuteBucket } from '../_rateLimit.js';
import { getRequestIp } from '../routing/_utils.js';

export default async function handler(req, res) {
  const method = (req.method || 'POST').toUpperCase();
  if (method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.email) return json(res, 401, { error: 'Invalid auth token' });

  const ip = getRequestIp(req);
  const rl = await bestEffortRateLimit({
    serviceClient,
    bucketKey: `gdpr:${user.id || user.email}:${ip || 'noip'}:${minuteBucket()}`,
    userId: user.id || null,
    ip,
    windowSeconds: 60,
    maxRequests: 5,
  });

  if (rl.allowed === false) {
    return json(res, 429, { error: 'Rate limit exceeded', remaining: rl.remaining ?? 0 });
  }

  const body = (await readJsonBody(req)) || {};
  const requestType = String(body.request_type || '').toLowerCase();
  if (requestType !== 'export' && requestType !== 'delete') {
    return json(res, 400, { error: 'request_type must be export or delete' });
  }

  const { data, error: insertError } = await serviceClient
    .from('gdpr_requests')
    .insert({
      user_email: user.email,
      request_type: requestType,
      reason: typeof body.reason === 'string' ? body.reason : null,
      details: typeof body.details === 'object' && body.details ? body.details : {},
    })
    .select('*')
    .single();

  if (insertError) return json(res, 500, { error: insertError.message || 'Failed to create GDPR request' });
  return json(res, 201, { request: data });
}
