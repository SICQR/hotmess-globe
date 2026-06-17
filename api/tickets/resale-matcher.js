/**
 * GET /api/tickets/resale-matcher
 *
 * Cron: 0 * * * *  (every hour)
 *
 * Safety-net sweeper for resale sessions the webhook may have missed.
 *
 * Algorithm:
 *   1. Find checkout.session.completed events in stripe_events_log
 *      WHERE metadata.type = 'resale' AND processed = false (or not present)
 *   2. For each unprocessed session: call match_resale_ticket RPC
 *   3. If match succeeds, mark event processed
 *   4. Skip sessions older than 7 days (stale)
 *
 * Auth: CRON_SECRET header required.
 *
 * This handler is intentionally the BACKUP path — primary path is the
 * Stripe webhook (checkout.session.completed → handleResaleCheckout).
 * Idempotent: match_resale_ticket returns not_resellable on replay.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(body);
};

const STALE_DAYS = 7;
const BATCH_SIZE = 50;

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (!['GET', 'POST'].includes(method)) {
    res.setHeader('Allow', 'GET,POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  // CRON_SECRET auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = req.headers['authorization']?.replace('Bearer ', '')
      || req.headers['x-cron-secret'];
    if (provided !== cronSecret) return json(res, 401, { error: 'Unauthorized' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const sbUrl     = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const sbKey     = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !sbUrl || !sbKey) {
    return json(res, 500, { error: 'Missing credentials' });
  }

  const stripe   = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' });
  const supabase = createClient(sbUrl, sbKey);

  const results = { swept: 0, matched: 0, skipped: 0, failed: 0, errors: [] };

  // ── Strategy 1: query stripe_events_log if it captures resale sessions ─────
  const staleAfter = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: loggedEvents } = await supabase
    .from('stripe_events_log')
    .select('id, stripe_event_id, raw_payload, created_at')
    .eq('event_type', 'checkout.session.completed')
    .is('processed_at', null)
    .gte('created_at', staleAfter)
    .limit(BATCH_SIZE);

  for (const ev of loggedEvents ?? []) {
    const session = ev.raw_payload?.data?.object ?? ev.raw_payload;
    const meta    = session?.metadata ?? {};
    if (meta.type !== 'resale') continue;

    results.swept++;
    const { seller_ticket_id, buyer_id } = meta;
    const payment_ref = session.payment_intent;

    if (!seller_ticket_id || !buyer_id || !payment_ref) {
      results.skipped++;
      continue;
    }

    try {
      const { data, error } = await supabase.rpc('match_resale_ticket', {
        p_seller_ticket_id: seller_ticket_id,
        p_buyer_id:         buyer_id,
        p_payment_ref:      payment_ref,
      });

      if (error) throw error;

      if (data?.success) {
        results.matched++;
        console.log(`[resale-matcher] matched via log: ${seller_ticket_id} → ${buyer_id}`);
      } else {
        // not_resellable = already matched (idempotent) or void
        results.skipped++;
        console.log(`[resale-matcher] skip (${data?.reason}): ${seller_ticket_id}`);
      }

      // Mark processed regardless so we don't retry indefinitely
      await supabase
        .from('stripe_events_log')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', ev.id)
        .catch(() => {});

    } catch (err) {
      results.failed++;
      results.errors.push({ event_id: ev.id, error: err.message });
      console.error(`[resale-matcher] failed ev ${ev.id}:`, err.message);
    }
  }

  // ── Strategy 2: sweep Stripe API for recent resale sessions ────────────────
  // Only runs if no events found in log (backup-of-backup)
  if (results.swept === 0) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        limit: 20,
        expand: ['data.payment_intent'],
      });

      for (const session of sessions.data) {
        const meta = session.metadata ?? {};
        if (meta.type !== 'resale') continue;
        if (session.status !== 'complete') continue;

        // Check if already matched (ticket would be resold_void)
        const { data: sellerTick } = await supabase
          .from('ticket_orders')
          .select('ticket_state')
          .eq('id', meta.seller_ticket_id)
          .maybeSingle();

        if (!sellerTick || sellerTick.ticket_state === 'resold_void') continue; // already done

        results.swept++;
        const payment_ref = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

        if (!payment_ref || !meta.seller_ticket_id || !meta.buyer_id) {
          results.skipped++;
          continue;
        }

        try {
          const { data, error } = await supabase.rpc('match_resale_ticket', {
            p_seller_ticket_id: meta.seller_ticket_id,
            p_buyer_id:         meta.buyer_id,
            p_payment_ref:      payment_ref,
          });
          if (error) throw error;
          if (data?.success) { results.matched++; console.log('[resale-matcher] stripe-sweep match:', meta.seller_ticket_id); }
          else results.skipped++;
        } catch (err) {
          results.failed++;
          results.errors.push({ session_id: session.id, error: err.message });
        }
      }
    } catch (stripeErr) {
      console.error('[resale-matcher] Stripe sweep error:', stripeErr.message);
    }
  }

  console.log('[resale-matcher] done:', results);
  return json(res, 200, { ok: true, ...results });
}
