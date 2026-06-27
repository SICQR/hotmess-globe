/**
 * POST /api/operator/cancel-event
 * Cancel an event and refund every live ticket — the mechanism behind the
 * published promise of a full refund when an event is cancelled.
 * Body: { beacon_id }
 * Confirmation level: HIGH (irreversible, moves money back to buyers)
 *
 * Refund-only (never charges). For each issued/valid/reissued ticket:
 *   - card portion  -> Stripe refund (idempotency key per order)
 *   - credit portion-> credited back to the buyer's HOTMESS ledger
 * then the ticket is voided (refunded_void), excluded from venue settlement,
 * the pools are closed, and the beacon is expired + flagged cancelled.
 * Idempotent: already-refunded tickets are filtered out, and Stripe's
 * idempotency key prevents a double card refund on re-run.
 */
import Stripe from 'stripe';
import { verifyOperatorOrOwner, supabaseAdmin } from './_verify.js';
import { ledgerEntry } from '../tickets/_credit.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { beacon_id } = req.body || {};
  if (!beacon_id) return res.status(400).json({ error: 'beacon_id required' });

  const ctx = await verifyOperatorOrOwner(req, res, null);
  if (!ctx) return;

  const { data: beacon } = await supabaseAdmin
    .from('beacons')
    .select('id, owner_id, title, status, metadata')
    .eq('id', beacon_id)
    .maybeSingle();
  if (!beacon) return res.status(404).json({ error: 'Event not found' });
  if (!ctx.isAdmin && beacon.owner_id !== ctx.user.id) return res.status(403).json({ error: 'Not your event' });

  const { data: tickets } = await supabaseAdmin
    .from('ticket_orders')
    .select('id, user_id, price_paid, metadata')
    .eq('beacon_id', beacon_id)
    .in('ticket_state', ['issued', 'valid', 'reissued']);

  const now = new Date().toISOString();
  let count = 0, cardRefunded = 0, creditRefunded = 0, errors = 0;

  for (const t of (tickets || [])) {
    const meta = t.metadata || {};
    const cardP = Number.isFinite(+meta.card_charged_pence) ? +meta.card_charged_pence : Math.round(Number(t.price_paid || 0) * 100);
    const creditP = +meta.credit_applied_pence || 0;
    const pi = meta.payment_intent;
    try {
      if (stripe && pi && cardP > 0) {
        await stripe.refunds.create({ payment_intent: pi, amount: cardP }, { idempotencyKey: `refund_${t.id}` });
        cardRefunded += cardP;
      }
      if (creditP > 0) {
        await ledgerEntry(supabaseAdmin, {
          userId: t.user_id, amountPence: creditP, reason: 'refund',
          refType: 'ticket_order', refId: t.id,
          metadata: { reason: 'event_cancelled', beacon_id },
        });
        creditRefunded += creditP;
      }
      // payout_status is constrained to pending/initiated/settled/held — 'held'
      // keeps a refunded ticket out of venue settlement (the refund itself is
      // recorded by ticket_state='refunded_void' + refunded_at).
      const { error: updErr } = await supabaseAdmin
        .from('ticket_orders')
        .update({ ticket_state: 'refunded_void', refunded_at: now, payout_status: 'held', qr_token_voided: true, updated_at: now })
        .eq('id', t.id);
      if (updErr) { errors++; console.error('[cancel-event] ticket void failed', t.id, updErr.message); continue; }
      await supabaseAdmin.from('notification_outbox').insert({
        user_id: t.user_id, title: 'Event cancelled — refund issued',
        body: `${beacon.title || 'The event'} was cancelled. Your full refund is on its way.`,
        priority: 'SIGNAL', status: 'queued',
        metadata: { beacon_id, type: 'event_cancelled' },
      });
      count++;
    } catch (e) {
      errors++;
      console.error('[cancel-event] refund failed for', t.id, e?.message);
    }
  }

  await supabaseAdmin
    .from('beacons')
    .update({ status: 'expired', ends_at: now, updated_at: now, metadata: { ...(beacon.metadata || {}), cancelled: true, cancelled_at: now } })
    .eq('id', beacon_id);
  await supabaseAdmin
    .from('ticket_inventory_pools')
    .update({ is_active: false, updated_at: now })
    .eq('beacon_id', beacon_id);

  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id: null, action_type: 'cancel_event', scope: 'event',
    payload: { beacon_id, refunded: count, card_pence: cardRefunded, credit_pence: creditRefunded, errors },
    outcome: errors > 0 ? 'partial' : 'success',
  });

  return res.status(200).json({ cancelled: true, refunded_count: count, card_refunded_pence: cardRefunded, credit_refunded_pence: creditRefunded, errors });
}
