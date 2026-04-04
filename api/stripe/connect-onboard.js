/**
 * Stripe Connect Onboarding
 * POST /api/stripe/connect-onboard
 *
 * Creates a Stripe Connect account for the seller and returns
 * an Account Link URL for the seller to complete onboarding.
 */

import Stripe from 'stripe';
import { getSupabaseServerClients } from '../routing/_utils.js';
import { getBearerToken, json } from '../shopify/_utils.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!stripe) {
    return json(res, 500, { error: 'Stripe not configured' });
  }

  const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
  if (supaErr) return json(res, 500, { error: supaErr });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'Missing auth token' });

  const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
  if (authErr || !user) return json(res, 401, { error: 'Invalid token' });

  try {
    // Check if seller already has a Stripe account
    const { data: seller } = await serviceClient
      .from('market_sellers')
      .select('stripe_account_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let accountId = seller?.stripe_account_id;

    // Create Stripe Connect account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { hotmess_user_id: user.id },
      });

      accountId = account.id;

      // Save to market_sellers
      await serviceClient
        .from('market_sellers')
        .upsert({
          owner_id: user.id,
          stripe_account_id: accountId,
          email: user.email,
          status: 'onboarding',
        }, { onConflict: 'owner_id' });
    }

    // Create Account Link for onboarding
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://hotmessldn.com';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/market?stripe_refresh=1`,
      return_url: `${origin}/market?stripe_connected=1`,
      type: 'account_onboarding',
    });

    return json(res, 200, { url: accountLink.url, accountId });
  } catch (err) {
    console.error('[Stripe Connect] onboard error:', err?.message);
    return json(res, 500, { error: err?.message || 'Failed to start onboarding' });
  }
}
