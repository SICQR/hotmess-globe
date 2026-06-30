/**
 * POST /api/operator/issue-comp
 * Issue a free ticket (guestlist / comp / VIP) to a member — every venue needs
 * a guestlist. No payment, no payout, no paid-pool inventory consumed.
 * Body: { beacon_id, email, ticket_type? }   ticket_type ∈ guest_comp|guestlist|vip
 * Confirmation level: LOW
 *
 * Owner-authorised. Resolves the recipient by email, issues a price-0 ticket
 * with a fresh QR (payout_status 'held'), dedupes against an existing live
 * ticket, and notifies the guest.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { verifyOperatorOrOwner, supabaseAdmin } from './_verify.js';

const COMP_TYPES = new Set(['guest_comp', 'guestlist', 'vip']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { beacon_id, email, ticket_type = 'guest_comp' } = req.body || {};
  if (!beacon_id || !email) return res.status(400).json({ error: 'beacon_id and email required' });
  const tt = COMP_TYPES.has(ticket_type) ? ticket_type : 'guest_comp';

  const ctx = await verifyOperatorOrOwner(req, res, null);
  if (!ctx) return;

  const { data: beacon } = await supabaseAdmin
    .from('beacons').select('id, owner_id, title').eq('id', beacon_id).maybeSingle();
  if (!beacon) return res.status(404).json({ error: 'Event not found' });
  if (!ctx.isAdmin && beacon.owner_id !== ctx.user.id) return res.status(403).json({ error: 'Not your event' });

  // Resolve recipient by email.
  const { data: recipient } = await supabaseAdmin
    .from('profiles')
    .select('id, age_verified, age_verified_at, age_verification_method')
    .eq('email', String(email).trim().toLowerCase())
    .maybeSingle();
  if (!recipient?.id) return res.status(404).json({ error: 'No HOTMESS account found for that email' });

  // Dedupe: return any live ticket they already hold for this event.
  const { data: existing } = await supabaseAdmin
    .from('ticket_orders')
    .select('id, qr_token')
    .eq('user_id', recipient.id).eq('beacon_id', beacon_id)
    .in('ticket_state', ['issued', 'valid', 'scanned', 'reissued'])
    .maybeSingle();
  if (existing) {
    return res.status(200).json({ issued: true, already: true, ticket_id: existing.id, qr_token: existing.qr_token });
  }

  const orderId = randomUUID();
  const qrToken = randomBytes(16).toString('hex');
  const ageSnapshot = (recipient.age_verified_at && recipient.age_verification_method)
    ? { age_verified_at: recipient.age_verified_at, age_verification_method: recipient.age_verification_method }
    : null;

  const { data: ticket, error } = await supabaseAdmin
    .from('ticket_orders')
    .insert({
      id: orderId, user_id: recipient.id, beacon_id, inventory_pool_id: null,
      provider: 'comp', external_ref: 'comp:' + orderId,
      amount: 0, currency: 'gbp', status: 'comp', ticket_state: 'issued',
      ticket_type: tt, qr_token: qrToken, price_paid: 0, fee_amount: 0,
      stripe_processing_cost: 0, payout_status: 'held',
      age_verification_snapshot: ageSnapshot,
      metadata: { issued_by_operator: ctx.user.id, kind: 'comp', age_unverified: !ageSnapshot },
    })
    .select('id, qr_token')
    .single();
  if (error) return res.status(500).json({ error: 'Could not issue ticket', detail: error.message });

  await supabaseAdmin.from('notification_outbox').insert({
    user_id: recipient.id, title: 'You’re on the list',
    body: `You’ve been added to ${beacon.title || 'an event'}. Tap to view your ticket.`,
    priority: 'SIGNAL', status: 'queued',
    metadata: { beacon_id, ticket_id: ticket.id, type: 'comp_issued' },
  });
  await supabaseAdmin.from('operator_audit_log').insert({
    user_id: ctx.user.id, venue_id: null, action_type: 'issue_comp', scope: 'event',
    payload: { beacon_id, recipient: recipient.id, ticket_type: tt }, outcome: 'success',
  });

  return res.status(200).json({ issued: true, ticket_id: ticket.id, qr_token: ticket.qr_token, ticket_type: tt });
}
