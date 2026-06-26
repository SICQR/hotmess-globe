/**
 * GET/POST /api/tickets/settle-payouts   (cron: 30 every 6h)
 *
 * The settlement step between a ticket sale and a venue's bank account.
 *
 * Each paid ticket_order carries payout_status='pending' plus its fee_amount
 * and stripe_processing_cost. This job groups every pending, still-valid order
 * by SELLER (beacon owner → market_sellers) and writes one `payouts` row per
 * seller with gross / platform-fee / net in pence, then flips those orders to
 * payout_status='settled' and links them to the payout (idempotent — a re-run
 * never double-counts).
 *
 * It does NOT move money. The existing payouts-worker performs the Stripe
 * Connect transfer, and only for sellers whose onboarding is complete — so a
 * seller who hasn't connected a bank simply accrues a pending payout until they
 * do. Resale proceeds (metadata.type='resale') are excluded here; the original
 * seller is settled via the resale path.
 *
 * Auth: CRON_SECRET (Authorization: Bearer <secret> or x-cron-secret).
 * Pass ?dry_run=1 to preview groupings without writing.
 */
import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => { res.setHeader('Content-Type', 'application/json'); res.status(status).json(body); };
const pence = (n) => Math.round((Number(n) || 0) * 100);

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-cron-secret'];
  if (!cronSecret || provided !== cronSecret) return json(res, 401, { error: 'Unauthorized' });

  const dryRun = req.query?.dry_run === '1' || req.query?.dry_run === 'true';
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // 1. Pending, still-valid, paid primary orders.
  const { data: orders, error } = await supabase
    .from('ticket_orders')
    .select('id, beacon_id, price_paid, fee_amount, stripe_processing_cost, created_at, ticket_state, metadata')
    .eq('payout_status', 'pending')
    .in('ticket_state', ['issued', 'valid', 'scanned', 'reissued'])
    .gt('price_paid', 0)
    .limit(2000);
  if (error) return json(res, 500, { error: error.message });

  const primary = (orders || []).filter((o) => (o.metadata?.type ?? 'primary') !== 'resale');
  if (primary.length === 0) {
    return json(res, 200, { dryRun, scanned: 0, settleable_sellers: 0, unsettleable_orders: 0, payouts: [] });
  }

  // 2. Resolve seller per order: beacon → owner → market_sellers.
  const beaconIds = [...new Set(primary.map((o) => o.beacon_id).filter(Boolean))];
  const { data: beacons } = await supabase.from('beacons').select('id, owner_id').in('id', beaconIds);
  const ownerByBeacon = Object.fromEntries((beacons || []).map((b) => [b.id, b.owner_id]));
  const ownerIds = [...new Set(Object.values(ownerByBeacon).filter(Boolean))];
  const { data: sellers } = await supabase.from('market_sellers').select('id, owner_id').in('owner_id', ownerIds);
  const sellerByOwner = Object.fromEntries((sellers || []).map((s) => [s.owner_id, s.id]));

  // 3. Group by seller.
  const groups = {};
  let unsettleable = 0;
  for (const o of primary) {
    const sellerId = sellerByOwner[ownerByBeacon[o.beacon_id]];
    if (!sellerId) { unsettleable++; continue; } // owner not onboarded as a seller yet
    const g = (groups[sellerId] ||= { orderIds: [], gross: 0, fee: 0, stripe: 0, count: 0, minCreated: o.created_at });
    g.orderIds.push(o.id);
    g.gross += Number(o.price_paid) || 0;
    g.fee += Number(o.fee_amount) || 0;
    g.stripe += Number(o.stripe_processing_cost) || 0;
    g.count += 1;
    if (o.created_at < g.minCreated) g.minCreated = o.created_at;
  }

  const now = new Date().toISOString();
  const out = [];
  for (const [sellerId, g] of Object.entries(groups)) {
    const grossP = pence(g.gross), feeP = pence(g.fee), stripeP = pence(g.stripe);
    const netP = Math.max(0, grossP - feeP - stripeP);
    if (dryRun) { out.push({ seller_id: sellerId, gross_pence: grossP, platform_fee_pence: feeP, stripe_pence: stripeP, net_pence: netP, sales_count: g.count }); continue; }

    const { data: payout, error: pErr } = await supabase
      .from('payouts')
      .insert({
        seller_id: sellerId, status: 'pending', method: 'stripe_connect',
        amount: netP / 100, gross_pence: grossP, platform_fee_pence: feeP, net_pence: netP,
        sales_count: g.count, period_start: g.minCreated, period_end: now,
      })
      .select('id')
      .single();
    if (pErr) { out.push({ seller_id: sellerId, error: pErr.message }); continue; }

    await supabase
      .from('ticket_orders')
      .update({ payout_status: 'settled', payout_intent_id: payout.id, updated_at: now })
      .in('id', g.orderIds);
    out.push({ seller_id: sellerId, payout_id: payout.id, net_pence: netP, sales_count: g.count });
  }

  return json(res, 200, {
    dryRun,
    scanned: primary.length,
    settleable_sellers: Object.keys(groups).length,
    unsettleable_orders: unsettleable,
    payouts: out,
  });
}
