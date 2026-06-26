// api/tickets/webhook-handler.js
// Called from api/stripe/webhook.js when event.metadata.type === 'ticket'
//
// Handles checkout.session.completed for ticket purchases:
//   - Validates OSA snapshot is present in metadata
//   - Decrements inventory_sold on the pool (with optimistic concurrency check)
//   - Generates random 32-char hex QR token
//   - Inserts ticket_orders row with ticket_state = 'issued'
//   - Queues AMBIENT notification to buyer confirming issuance
//
// IDEMPOTENT: stripe_session_id stored on the ticket row; second call is a no-op.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { ledgerEntry, sellerNetPence } from './_credit.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function handleTicketCheckout(session) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const meta = session.metadata ?? {};

  const {
    pool_id,
    beacon_id,
    user_id,
    plus_one_of,
    tier_at_purchase,
    age_verified_at,
    age_verification_method,
    fee_rate,
    credit_applied_pence,
  } = meta;

  if (!pool_id || !user_id || !beacon_id) {
    console.error('[ticket-webhook] Missing required metadata fields', meta);
    return;
  }

  // ── Idempotency ────────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('ticket_orders')
    .select('id')
    .eq('external_ref', session.id)
    .maybeSingle();

  if (existing?.id) {
    console.log('[ticket-webhook] Already processed session', session.id, '— skipping');
    return;
  }

  // ── Load pool ──────────────────────────────────────────────────────────────
  const { data: pool, error: poolErr } = await supabase
    .from('ticket_inventory_pools')
    .select('*')
    .eq('id', pool_id)
    .single();

  if (poolErr || !pool) {
    console.error('[ticket-webhook] Pool not found:', pool_id, poolErr?.message);
    return;
  }

  // ── Inventory decrement (concurrency-safe) ─────────────────────────────────
  // Only decrement if cap allows. Uses a conditional update; if rows_affected = 0
  // someone else claimed the last slot between checkout creation and now — refund needed.
  const { data: decRows } = await supabase
    .from('ticket_inventory_pools')
    .update({ inventory_sold: pool.inventory_sold + 1, updated_at: new Date().toISOString() })
    .eq('id', pool_id)
    .or(
      pool.inventory_cap === null
        ? 'id.neq.00000000-0000-0000-0000-000000000000' // always true for null cap
        : `inventory_sold.lt.${pool.inventory_cap}`
    )
    .select('id');

  if (pool.inventory_cap !== null && (!decRows || decRows.length === 0)) {
    console.error('[ticket-webhook] Inventory race: pool', pool_id, 'sold out during checkout. Needs refund for session', session.id);
    // TODO Phase 2: trigger automatic Stripe refund here
    return;
  }

  // ── Generate QR token ──────────────────────────────────────────────────────
  // 32-char random hex. Unique constraint on ticket_orders.qr_token enforces no collisions.
  const qrToken = crypto.randomBytes(16).toString('hex');

  // ── Compute fees ───────────────────────────────────────────────────────────
  // Face value (what the ticket is worth) drives amount, fee and the venue
  // payout — NOT the card charge, which may be reduced by HOTMESS credit.
  const cardChargedGbp  = (session.amount_total ?? 0) / 100;
  const amountGbp       = Number(pool.price);
  const feeRateNum      = parseFloat(fee_rate ?? '0');
  const feeAmount       = parseFloat((amountGbp * feeRateNum).toFixed(2));
  // Stripe processing applies only to what was actually charged on the card.
  const stripeProcessing = cardChargedGbp > 0 ? parseFloat((cardChargedGbp * 0.014 + 0.20).toFixed(2)) : 0;

  // ── OSA snapshot ──────────────────────────────────────────────────────────
  const ageVerificationSnapshot = (age_verified_at && age_verification_method)
    ? { age_verified_at, age_verification_method }
    : null;

  if (!ageVerificationSnapshot) {
    console.error('[ticket-webhook] OSA: age verification snapshot missing for user', user_id, '— ticket will not be issued');
    // TODO Phase 2: trigger automatic Stripe refund
    return;
  }

  // ── Insert ticket_orders ───────────────────────────────────────────────────
  const { data: ticket, error: insertErr } = await supabase
    .from('ticket_orders')
    .insert({
      user_id,
      beacon_id,
      inventory_pool_id:         pool_id,
      provider:                  'stripe',
      external_ref:              session.id,
      amount:                    amountGbp,          // gross
      currency:                  'gbp',
      status:                    'paid',             // Stripe payment status
      ticket_state:              'issued',           // lifecycle state
      ticket_type:               pool.ticket_type,
      qr_token:                  qrToken,
      tier_at_purchase:          tier_at_purchase ?? 'mess',
      plus_one_of:               plus_one_of || null,
      price_paid:                amountGbp,
      fee_amount:                feeAmount,
      stripe_processing_cost:    stripeProcessing,
      payout_status:             'pending',
      age_verification_snapshot: ageVerificationSnapshot,
      metadata: {
        stripe_session_id: session.id,
        payment_intent:    session.payment_intent,
        // Consent record: completing checkout accepts the Ticket, Resale and
        // Refund terms in force at purchase (HOTMESS Ticketing Policy Suite).
        policy_version:    meta.policy_version ?? '1.0',
        terms_accepted:    true,
        terms_accepted_at: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[ticket-webhook] Insert failed:', insertErr.message, 'session:', session.id);
    return;
  }

  console.log('[ticket-webhook] Ticket issued:', ticket.id, 'for user:', user_id, 'pool:', pool_id);

  // Redeem any HOTMESS credit applied at checkout (idempotent on the order).
  const creditApplied = parseInt(credit_applied_pence ?? '0', 10) || 0;
  if (creditApplied > 0) {
    await ledgerEntry(supabase, {
      userId: user_id, amountPence: -creditApplied, reason: 'ticket_redemption',
      refType: 'ticket_order', refId: ticket.id,
      metadata: { session_id: session.id, beacon_id },
    });
  }

  // ── AMBIENT notification to buyer ──────────────────────────────────────────
  await supabase.from('notification_outbox').insert({
    user_id,
    title:    'Your ticket is confirmed',
    body:     `Tap to view your ticket for ${pool.label}.`,
    priority: 'AMBIENT',
    status:   'queued',
    metadata: {
      ticket_id: ticket.id,
      beacon_id,
      type: 'ticket_issued',
    },
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// RESALE CHECKOUT — Phase 3 S4
// Called from api/stripe/webhook.js when session.metadata.type === 'resale'
// ─────────────────────────────────────────────────────────────────────────────
export async function handleResaleCheckout(session) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const meta = session.metadata ?? {};

  const { seller_ticket_id, buyer_id } = meta;
  const payment_ref = session.payment_intent;

  if (!seller_ticket_id || !buyer_id || !payment_ref) {
    console.error('[resale-webhook] Missing required metadata', meta);
    return;
  }

  // Idempotency: check if already matched
  const { data: sellerTick } = await supabase
    .from('ticket_orders')
    .select('ticket_state, user_id, inventory_pool_id, resale_price, ticket_inventory_pools:inventory_pool_id (fee_rate)')
    .eq('id', seller_ticket_id)
    .maybeSingle();

  if (sellerTick?.ticket_state === 'resold_void') {
    console.log('[resale-webhook] Already matched, skipping', seller_ticket_id);
    return;
  }

  // Call match_resale_ticket RPC (payment-first guarantee: payment confirmed above)
  const { data, error } = await supabase.rpc('match_resale_ticket', {
    p_seller_ticket_id: seller_ticket_id,
    p_buyer_id:         buyer_id,
    p_payment_ref:      payment_ref,
  });

  if (error) {
    console.error('[resale-webhook] match_resale_ticket error:', error.message, { seller_ticket_id, buyer_id });
    return;
  }

  if (!data?.success) {
    console.warn('[resale-webhook] match returned not success:', data?.reason, { seller_ticket_id });
    return;
  }

  console.log('[resale-webhook] Resale matched:', data.new_qr_token, 'buyer:', buyer_id);

  // Credit the original seller their net proceeds as HOTMESS credit (idempotent).
  const resaleGrossP = session.amount_total ?? 0;
  const sellerUserId = sellerTick?.user_id || meta.seller_user_id;
  const resaleFeeRate = sellerTick?.ticket_inventory_pools?.fee_rate ?? 0;
  if (sellerUserId && resaleGrossP > 0) {
    const netP = sellerNetPence(resaleGrossP, resaleFeeRate);
    if (netP > 0) {
      await ledgerEntry(supabase, {
        userId: sellerUserId, amountPence: netP, reason: 'resale_proceeds',
        refType: 'ticket_order', refId: seller_ticket_id,
        metadata: { session_id: session.id, gross_pence: resaleGrossP },
      });
    }
  }

  // Notify buyer of new QR
  await supabase.from('notification_outbox').insert({
    user_id:  buyer_id,
    title:    'Your resale ticket is ready',
    body:     'Tap to view your ticket QR code.',
    priority: 'SIGNAL',
    status:   'queued',
    metadata: {
      new_qr_token: data.new_qr_token,
      beacon_id:    meta.beacon_id,
      type:         'resale_matched',
    },
  }).catch(() => {});

  // Notify seller that their ticket sold
  await supabase.from('notification_outbox').insert({
    user_id:  sellerTick?.user_id || meta.seller_user_id,
    title:    'Your ticket has been resold',
    body:     'Payout queued — check your earnings.',
    priority: 'AMBIENT',
    status:   'queued',
    metadata: {
      voided_ticket: seller_ticket_id,
      type:          'resale_sold',
    },
  }).catch(() => {});
}
