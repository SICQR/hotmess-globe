/**
 * GET /api/tickets/payouts-worker
 *
 * Cron: 0 */6 * * *  (every 6 hours)
 *
 * Processes pending ticket sale payouts:
 *   1. Reads all payouts WHERE status='pending'
 *   2. Joins market_sellers via seller_id to get stripe_account_id
 *   3. Skips sellers without completed Stripe Connect onboarding
 *   4. Creates Stripe Transfer to connected account
 *   5. Marks payout paid / failed
 *
 * Idempotent: rows already in 'paid' or 'failed' are never re-processed.
 * Amounts: payouts.amount is net pounds (numeric). Transfer uses pence (integer).
 *
 * Auth: CRON_SECRET header required (same pattern as other crons).
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getEnvRequired = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const json = (res, status, body) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(body);
};

// Max rows per run — prevent runaway on backlog
const BATCH_SIZE = 50;

export default async function handler(req, res) {
  // Allow GET (cron) or POST (manual trigger)
  const method = (req.method || 'GET').toUpperCase();
  if (!['GET', 'POST'].includes(method)) {
    res.setHeader('Allow', 'GET,POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Auth: CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = req.headers['authorization']?.replace('Bearer ', '')
      || req.headers['x-cron-secret'];
    if (provided !== cronSecret) {
      return json(res, 401, { error: 'Unauthorized' });
    }
  }

  let stripe;
  let supabase;
  try {
    const stripeKey  = getEnvRequired('STRIPE_SECRET_KEY');
    const sbUrl      = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey      = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sbUrl || !sbKey) throw new Error('Missing Supabase credentials');

    stripe   = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' });
    supabase = createClient(sbUrl, sbKey);
  } catch (err) {
    console.error('[payouts-worker] init error:', err.message);
    return json(res, 500, { error: err.message });
  }

  // 1. Fetch pending payout rows with seller Stripe info
  const { data: pending, error: fetchErr } = await supabase
    .from('payouts')
    .select(`
      id, amount, seller_id, gross_pence, net_pence,
      period_start, period_end, sales_count,
      market_sellers:seller_id (stripe_account_id, stripe_onboarding_complete, display_name)
    `)
    .eq('status', 'pending')
    .not('amount', 'is', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error('[payouts-worker] fetch error:', fetchErr.message);
    return json(res, 500, { error: fetchErr.message });
  }

  const results = { processed: 0, paid: 0, skipped: 0, failed: 0, errors: [] };

  for (const payout of pending ?? []) {
    results.processed++;

    const seller = payout.market_sellers;

    // Skip if seller has no completed Stripe Connect
    if (!seller?.stripe_onboarding_complete || !seller?.stripe_account_id) {
      console.log(`[payouts-worker] skip payout ${payout.id} — seller has no stripe account`);
      results.skipped++;
      continue;
    }

    // Amount in pence (Stripe requires integer pence)
    // net_pence preferred; fall back to amount (pounds) * 100
    const amountPence = payout.net_pence
      || Math.round(Number(payout.amount) * 100);

    if (!amountPence || amountPence <= 0) {
      console.warn(`[payouts-worker] skip payout ${payout.id} — zero/negative amount`);
      results.skipped++;
      continue;
    }

    try {
      // 2. Create Stripe Transfer to connected account
      const transfer = await stripe.transfers.create({
        amount:      amountPence,
        currency:    'gbp',
        destination: seller.stripe_account_id,
        metadata: {
          payout_id:    payout.id,
          seller_id:    payout.seller_id,
          period_start: payout.period_start || '',
          period_end:   payout.period_end   || '',
          sales_count:  String(payout.sales_count || 0),
        },
        description: `HOTMESS ticket payout${payout.period_start ? ` — ${new Date(payout.period_start).toLocaleDateString('en-GB')}` : ''}`,
      });

      // 3. Mark paid
      const { error: updateErr } = await supabase
        .from('payouts')
        .update({
          status:             'paid',
          stripe_transfer_id: transfer.id,
          paid_at:            new Date().toISOString(),
        })
        .eq('id', payout.id);

      if (updateErr) throw updateErr;

      console.log(`[payouts-worker] paid payout ${payout.id} → transfer ${transfer.id} (£${(amountPence/100).toFixed(2)})`);
      results.paid++;

    } catch (err) {
      console.error(`[payouts-worker] failed payout ${payout.id}:`, err.message);
      results.failed++;
      results.errors.push({ payout_id: payout.id, error: err.message });

      // Mark failed so it doesn't loop forever — ops can reset to pending to retry
      await supabase
        .from('payouts')
        .update({ status: 'failed' })
        .eq('id', payout.id)
        .then(() => {}) // best effort
        .catch(() => {});
    }
  }

  console.log('[payouts-worker] done:', results);
  return json(res, 200, { ok: true, ...results });
}
