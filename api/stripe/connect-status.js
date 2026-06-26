/**
 * GET/POST /api/stripe/connect-status
 *
 * Source-of-truth sync for a venue's Stripe Connect payout readiness.
 *
 * connect-onboard creates an Express account and sets status='onboarding', but
 * nothing flips market_sellers.stripe_onboarding_complete — so the payouts
 * worker (which requires it) would never pay a venue even after they finish
 * onboarding. This endpoint retrieves the live account from Stripe and, if it
 * is payouts-ready, marks the seller complete. It's called by the cockpit on
 * load and when the operator returns from Stripe — independent of whether the
 * account.updated webhook is configured.
 *
 * Auth: Supabase JWT.
 */
import Stripe from 'stripe';
import { getSupabaseServerClients, getBearerToken, json } from '../routing/_utils.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export default async function handler(req, res) {
  if (!stripe) return json(res, 500, { error: 'Stripe not configured' });

  const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaErr || !serviceClient) return json(res, 500, { error: supaErr || 'Service role key missing' });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'Missing auth token' });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
  if (authErr || !user) return json(res, 401, { error: 'Invalid token' });

  const { data: seller } = await serviceClient
    .from('market_sellers')
    .select('id, stripe_account_id, stripe_onboarding_complete')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!seller?.stripe_account_id) {
    return json(res, 200, { connected: false, has_account: false });
  }

  let account;
  try {
    account = await stripe.accounts.retrieve(seller.stripe_account_id);
  } catch (e) {
    return json(res, 200, { connected: !!seller.stripe_onboarding_complete, has_account: true, error: e?.message });
  }

  const ready = !!(account.payouts_enabled && account.charges_enabled && account.details_submitted);
  if (ready && !seller.stripe_onboarding_complete) {
    await serviceClient
      .from('market_sellers')
      .update({ stripe_onboarding_complete: true, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', seller.id);
  }

  return json(res, 200, {
    connected: ready,
    has_account: true,
    payouts_enabled: !!account.payouts_enabled,
    charges_enabled: !!account.charges_enabled,
    details_submitted: !!account.details_submitted,
  });
}
