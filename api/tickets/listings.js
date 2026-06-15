/**
 * GET /api/tickets/listings
 *
 * Public browse endpoint — wraps get_ticket_listings RPC.
 * Auth optional: pass Bearer token to enable age-gated listings.
 *
 * Query params:
 *   city      (string)   filter by beacons.location_city (case-insensitive LIKE)
 *   date_from (ISO date) filter event_start_at >= date_from
 *   date_to   (ISO date) filter event_start_at <= date_to
 *   max_price (number)   filter pool.price <= max_price (pounds)
 *   lat       (float)    geo-sort (haversine)
 *   lng       (float)    geo-sort (haversine)
 *   limit     (int)      default 20, max 50
 *   offset    (int)      default 0
 */

import { getSupabaseServerClients, getBearerToken, getAuthedUser, json } from '../routing/_utils.js';
import { getQueryParam } from '../shopify/_utils.js';

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error) return json(res, 500, { error });

  // Auth is optional — unauthed callers get age-unverified listings only
  let userId = null;
  const accessToken = getBearerToken(req);
  if (accessToken && anonClient) {
    const { user } = await getAuthedUser({ anonClient, accessToken });
    userId = user?.id ?? null;
  }

  // Parse query params
  const city      = getQueryParam(req, 'city') || null;
  const dateFrom  = getQueryParam(req, 'date_from') || null;
  const dateTo    = getQueryParam(req, 'date_to') || null;
  const maxPrice  = getQueryParam(req, 'max_price') ? Number(getQueryParam(req, 'max_price')) : null;
  const lat       = getQueryParam(req, 'lat')  ? Number(getQueryParam(req, 'lat'))  : null;
  const lng       = getQueryParam(req, 'lng')  ? Number(getQueryParam(req, 'lng'))  : null;
  const limit     = Math.min(Number(getQueryParam(req, 'limit')  || 20), 50);
  const offset    = Math.max(Number(getQueryParam(req, 'offset') || 0),  0);

  const client = serviceClient || anonClient;
  const { data, error: rpcError } = await client.rpc('get_ticket_listings', {
    p_user_id:   userId,
    p_city:      city,
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_max_price: maxPrice,
    p_lat:       lat,
    p_lng:       lng,
    p_limit:     limit,
    p_offset:    offset,
  });

  if (rpcError) {
    console.error('[tickets/listings] RPC error:', rpcError.message);
    return json(res, 500, { error: 'Failed to fetch listings', details: rpcError.message });
  }

  // Cache for 30s at CDN edge — listings are near-realtime but don't need to be live
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  return json(res, 200, { listings: data ?? [], count: (data ?? []).length, offset, limit });
}
