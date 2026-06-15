/**
 * GET /api/tickets/export?beacon_id=<uuid>
 *
 * CSV export of ticket_orders for a given beacon.
 * Requires Bearer JWT. Server-side has_event_access() assertion.
 * Only owner / staff / scanner-only with has_event_access may export.
 *
 * Columns: order_id, display_name, email, ticket_type, ticket_state,
 *          price_paid, fee_amount, created_at, scanned_at, qr_token
 */

import { getSupabaseServerClients, getBearerToken, getAuthedUser, json } from '../routing/_utils.js';
import { getQueryParam } from '../shopify/_utils.js';

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  if (error || !serviceClient) return json(res, 500, { error: error || 'Service role key missing' });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.id) return json(res, 401, { error: 'Invalid auth token' });

  const beaconId = getQueryParam(req, 'beacon_id');
  if (!beaconId) return json(res, 400, { error: 'Missing beacon_id' });

  // Server-side access check — never trust client-supplied role
  const { data: hasAccess, error: accessErr } = await serviceClient.rpc('has_event_access', {
    p_beacon_id: beaconId,
    p_user_id: user.id,
    p_min_role: 'scanner-only',
  });

  if (accessErr) {
    console.error('[tickets/export] has_event_access error:', accessErr.message);
    return json(res, 500, { error: 'Access check failed' });
  }

  if (!hasAccess) return json(res, 403, { error: 'Forbidden' });

  // Fetch orders + joined profile display name + email
  const { data: orders, error: ordersErr } = await serviceClient
    .from('ticket_orders')
    .select(`
      id,
      ticket_type,
      ticket_state,
      price_paid,
      fee_amount,
      created_at,
      scanned_at,
      qr_token,
      profiles:user_id (display_name, email)
    `)
    .eq('beacon_id', beaconId)
    .order('created_at', { ascending: true });

  if (ordersErr) {
    console.error('[tickets/export] orders error:', ordersErr.message);
    return json(res, 500, { error: 'Failed to fetch orders' });
  }

  // Build CSV
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = ['order_id', 'display_name', 'email', 'ticket_type', 'ticket_state',
                  'price_paid', 'fee_amount', 'created_at', 'scanned_at', 'qr_token'];

  const rows = (orders ?? []).map(o => [
    o.id,
    o.profiles?.display_name ?? '',
    o.profiles?.email ?? '',
    o.ticket_type,
    o.ticket_state,
    o.price_paid,
    o.fee_amount,
    o.created_at,
    o.scanned_at ?? '',
    o.qr_token ?? '',
  ].map(escape).join(','));

  const csv = [header.join(','), ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tickets-${beaconId}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(csv);
}
