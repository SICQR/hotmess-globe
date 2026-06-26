// api/tickets/create-checkout.js
// Creates a Stripe Checkout Session for a ticket purchase.
// Ticket issuance happens in the webhook on checkout.session.completed (type:'ticket').
//
// POST /api/tickets/create-checkout
// Auth: Supabase JWT required in Authorization header
// Body: { pool_id: uuid, plus_one_of?: uuid }

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getBalancePence, ledgerEntry } from './_credit.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. Authenticate caller ────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  const jwt = authHeader.slice(7);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const userId = user.id;

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  const { pool_id, plus_one_of } = req.body || {};
  if (!pool_id) {
    return res.status(400).json({ error: 'pool_id is required' });
  }

  // ── 3. Load pool ──────────────────────────────────────────────────────────
  const { data: pool, error: poolErr } = await supabase
    .from('ticket_inventory_pools')
    .select('*, beacons(id, title, ends_at, status, owner_id)')
    .eq('id', pool_id)
    .single();

  if (poolErr || !pool) {
    return res.status(404).json({ error: 'Ticket pool not found' });
  }

  const beacon = pool.beacons;

  // Pool must be open
  const now = new Date();
  if (pool.closes_at && new Date(pool.closes_at) <= now) {
    return res.status(400).json({ error: 'Ticket sales have closed for this event' });
  }
  if (pool.ticket_type === 'quick_drop' && pool.released_at && new Date(pool.released_at) > now) {
    return res.status(400).json({ error: 'This drop has not opened yet' });
  }
  if (beacon?.ends_at && new Date(beacon.ends_at) <= now) {
    return res.status(400).json({ error: 'This event has ended' });
  }

  // ── 4. Inventory check ────────────────────────────────────────────────────
  if (pool.inventory_cap !== null && pool.inventory_sold >= pool.inventory_cap) {
    return res.status(400).json({ error: 'Sold out' });
  }

  // Prevent duplicate purchase for same pool
  const { count: existingCount } = await supabase
    .from('ticket_orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('inventory_pool_id', pool_id)
    .in('ticket_state', ['issued', 'valid', 'scanned', 'reissued']);

  if (existingCount > 0) {
    return res.status(400).json({ error: 'You already have a ticket for this event' });
  }

  // ── 5. OSA age gate ───────────────────────────────────────────────────────
  // LIFECYCLE_SPEC §2.2: blocked if age_verified_at IS NULL OR age_verification_method IS NULL
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('display_name, age_verified, age_verified_at, age_verification_method, memberships(tier, status)')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    return res.status(400).json({ error: 'Profile not found' });
  }

  if (!profile.age_verified || !profile.age_verified_at || !profile.age_verification_method) {
    return res.status(403).json({
      error: 'Age verification required',
      code: 'AGE_VERIFICATION_INCOMPLETE',
      message: 'Complete age verification in your profile before purchasing tickets.'
    });
  }

  // ── 6. Tier gate (VIP) ────────────────────────────────────────────────────
  if (pool.tier_gate) {
    const tierOrder = ['mess', 'hotmess', 'connected', 'promoter', 'venue'];
    const activeMembership = profile.memberships?.find(m => m.status === 'active');
    const callerTierIndex = tierOrder.indexOf(activeMembership?.tier ?? 'mess');
    const requiredTierIndex = tierOrder.indexOf(pool.tier_gate);

    if (callerTierIndex < requiredTierIndex) {
      return res.status(403).json({
        error: 'Membership tier required',
        code: 'TIER_GATE',
        message: `This ticket requires ${pool.tier_gate} membership or above.`
      });
    }
  }

  // ── 6b. HOTMESS credit ─────────────────────────────────────────────────────
  // Apply the buyer's credit balance. Full coverage issues the ticket directly
  // (no Stripe); partial coverage reduces the card charge and the webhook debits
  // the credit on completion. The venue's payout is always on FACE value.
  const activeMembership = profile.memberships?.find(m => m.status === 'active');
  const faceP = Math.round(Number(pool.price) * 100);
  const balanceP = await getBalancePence(supabase, userId);
  const creditAppliedP = Math.max(0, Math.min(balanceP, faceP));
  const chargeP = faceP - creditAppliedP;

  if (creditAppliedP > 0 && chargeP === 0) {
    // Don't double-issue: return any live ticket the buyer already holds.
    const { data: existingTicket } = await supabase
      .from('ticket_orders')
      .select('id, qr_token')
      .eq('user_id', userId).eq('beacon_id', beacon?.id)
      .in('ticket_state', ['issued', 'valid', 'scanned', 'reissued'])
      .maybeSingle();
    if (existingTicket) {
      return res.status(200).json({ ticket_issued: true, ticket_id: existingTicket.id, qr_token: existingTicket.qr_token, already: true });
    }

    // Inventory decrement (concurrency-safe, mirrors the webhook).
    let decQ = supabase
      .from('ticket_inventory_pools')
      .update({ inventory_sold: pool.inventory_sold + 1, updated_at: new Date().toISOString() })
      .eq('id', pool.id);
    if (pool.inventory_cap !== null) decQ = decQ.lt('inventory_sold', pool.inventory_cap);
    const { data: decRows, error: decErr } = await decQ.select('id');
    if (pool.inventory_cap !== null && (!decRows || decRows.length === 0)) {
      return res.status(409).json({ error: 'Sold out', code: 'SOLD_OUT', _debug: { decErr: decErr?.message || null, hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), poolSold: pool.inventory_sold, cap: pool.inventory_cap } });
    }

    const orderId  = crypto.randomUUID();
    const qrToken  = crypto.randomBytes(16).toString('hex');
    const feeAmount = parseFloat((Number(pool.price) * (Number(pool.fee_rate) || 0)).toFixed(2));
    const { data: ticket, error: insErr } = await supabase
      .from('ticket_orders')
      .insert({
        id: orderId, user_id: userId, beacon_id: beacon?.id, inventory_pool_id: pool.id,
        provider: 'credit', external_ref: 'credit:' + orderId,
        amount: Number(pool.price), currency: 'gbp', status: 'paid',
        ticket_state: 'issued', ticket_type: pool.ticket_type, qr_token: qrToken,
        tier_at_purchase: activeMembership?.tier ?? 'mess', plus_one_of: plus_one_of || null,
        price_paid: Number(pool.price), fee_amount: feeAmount, stripe_processing_cost: 0,
        payout_status: 'pending',
        age_verification_snapshot: { age_verified_at: profile.age_verified_at, age_verification_method: profile.age_verification_method },
        metadata: { policy_version: '1.0', terms_accepted: true, terms_accepted_at: new Date().toISOString(), credit_applied_pence: creditAppliedP, card_charged_pence: 0, paid_with: 'credit' },
      })
      .select('id, qr_token')
      .single();
    if (insErr) {
      await supabase.from('ticket_inventory_pools').update({ inventory_sold: pool.inventory_sold }).eq('id', pool.id);
      return res.status(500).json({ error: 'Could not issue ticket', detail: insErr.message });
    }
    await ledgerEntry(supabase, { userId, amountPence: -creditAppliedP, reason: 'ticket_redemption', refType: 'ticket_order', refId: ticket.id, metadata: { paid_with: 'credit' } });
    await supabase.from('notification_outbox').insert({ user_id: userId, title: 'Your ticket is confirmed', body: `Tap to view your ticket for ${pool.label}.`, priority: 'AMBIENT', status: 'queued', metadata: { ticket_id: ticket.id, beacon_id: beacon?.id, type: 'ticket_issued' } }).catch(() => {});
    return res.status(200).json({ ticket_issued: true, ticket_id: ticket.id, qr_token: ticket.qr_token, credit_applied_pence: creditAppliedP });
  }

  // ── 7. Create Stripe Checkout Session ─────────────────────────────────────
  const successUrl = `${process.env.VITE_APP_URL || 'https://hotmessldn.com'}/ticket-success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${process.env.VITE_APP_URL || 'https://hotmessldn.com'}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        unit_amount: chargeP, // pence (face value minus applied HOTMESS credit)
        product_data: {
          name: `${beacon?.title ?? 'Event'} — ${pool.label}`,
          description: `HOTMESS ticket · ${pool.ticket_type.replace('_', ' ').toUpperCase()}`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      type:                    'ticket',
      pool_id:                 pool_id,
      beacon_id:               beacon?.id,
      user_id:                 userId,
      user_display_name:       profile.display_name ?? '',
      plus_one_of:             plus_one_of ?? '',
      tier_at_purchase:        activeMembership?.tier ?? 'mess',
      age_verified_at:         profile.age_verified_at,
      age_verification_method: profile.age_verification_method,
      fee_rate:                String(pool.fee_rate),
      policy_version:          '1.0',
    },
    success_url: successUrl,
    cancel_url:  cancelUrl,
  });

  return res.status(200).json({ checkout_url: session.url, session_id: session.id, credit_applied_pence: creditAppliedP, charge_pence: chargeP });
}
