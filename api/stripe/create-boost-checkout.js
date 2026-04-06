import Stripe from 'stripe';
import { getBearerToken, getAuthedUser, getSupabaseServerClients, readJsonBody } from '../routing/_utils.js';

const PRICE_ENV_MAP = {
  globe_glow: 'STRIPE_BOOST_GLOBE_GLOW_PRICE_ID',
  profile_bump: 'STRIPE_BOOST_PROFILE_BUMP_PRICE_ID',
  vibe_blast: 'STRIPE_BOOST_VIBE_BLAST_PRICE_ID',
  incognito_week: 'STRIPE_BOOST_INCOGNITO_PRICE_ID',
  extra_beacon_drop: 'STRIPE_BOOST_EXTRA_BEACON_PRICE_ID',
  highlighted_message: 'STRIPE_BOOST_HIGHLIGHTED_MSG_PRICE_ID',
};

const PRICE_MAP = Object.fromEntries(
  Object.entries(PRICE_ENV_MAP).map(([k, envKey]) => [k, process.env[envKey]])
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmessldn.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { anonClient } = getSupabaseServerClients();
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { user, error } = await getAuthedUser({ anonClient, accessToken: token });
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Stripe not configured: STRIPE_SECRET_KEY is unset' });
  }

  const missingPriceIds = Object.entries(PRICE_ENV_MAP)
    .filter(([k]) => !PRICE_MAP[k])
    .map(([, envKey]) => envKey);
  if (missingPriceIds.length > 0) {
    return res.status(503).json({
      error: `Stripe boost price IDs not configured: ${missingPriceIds.join(', ')}`
    });
  }

  const { boostKey } = (await readJsonBody(req)) || {};
  const priceId = PRICE_MAP[boostKey];
  if (!priceId) {
    return res.status(400).json({
      error: `Unknown boost: ${boostKey}. Valid keys: ${Object.keys(PRICE_MAP).join(', ')}`
    });
  }

  let stripe;
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (err) {
    return res.status(503).json({ error: `Stripe initialization failed: ${err.message}` });
  }

  const origin = req.headers.origin || 'https://hotmessldn.com';
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { user_id: user.id, boost_key: boostKey },
    success_url: `${origin}/?boost_success=${boostKey}`,
    cancel_url: `${origin}/?boost_cancel=1`,
  });

  return res.status(200).json({ url: session.url });
}
