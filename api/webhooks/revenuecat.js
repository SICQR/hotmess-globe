import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/webhooks/revenuecat
 *
 * Receives RevenueCat webhook events and syncs subscription state into
 * the `memberships` table (same table used by Stripe webhook).
 *
 * Required env vars:
 *   REVENUECAT_WEBHOOK_SECRET   — shared secret set in RevenueCat dashboard
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * RevenueCat webhook docs:
 *   https://www.revenuecat.com/docs/integrations/webhooks
 */

const REVENUECAT_ENTITLEMENT_TO_TIER = {
  hotmess:   'hotmess',
  connected: 'connected',
  promoter:  'promoter',
  venue:     'venue',
};

// Boost product IDs that are consumables (not subscriptions)
const BOOST_PRODUCT_IDS = new Set([
  'com.hotmess.boost.globe_glow',
  'com.hotmess.boost.profile_bump',
  'com.hotmess.boost.vibe_blast',
  'com.hotmess.boost.incognito_week',
  'com.hotmess.boost.extra_beacon_drop',
  'com.hotmess.boost.highlighted_message',
]);

const BOOST_KEY_MAP = {
  'com.hotmess.boost.globe_glow':          'globe_glow',
  'com.hotmess.boost.profile_bump':        'profile_bump',
  'com.hotmess.boost.vibe_blast':          'vibe_blast',
  'com.hotmess.boost.incognito_week':      'incognito_week',
  'com.hotmess.boost.extra_beacon_drop':   'extra_beacon_drop',
  'com.hotmess.boost.highlighted_message': 'highlighted_message',
};

function verifySignature(body, authHeader, secret) {
  if (!secret) return true; // skip verification if secret not configured (dev mode)
  try {
    const expected = 'Bearer ' + crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return authHeader === expected;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Collect raw body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');

  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const authHeader = req.headers['authorization'] || '';
  if (!verifySignature(rawBody, authHeader, secret)) {
    console.warn('[revenuecat] Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { event: { type, app_user_id, product_id, expiration_at_ms, entitlement_ids } = {} } = event;

  if (!app_user_id) {
    return res.status(400).json({ error: 'Missing app_user_id' });
  }

  // Resolve Supabase user ID from RevenueCat app_user_id (we set this to Supabase UUID)
  const userId = app_user_id;

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION': {
        if (BOOST_PRODUCT_IDS.has(product_id)) {
          // Consumable boost purchased — activate via existing boost system
          const boostKey = BOOST_KEY_MAP[product_id];
          if (boostKey) {
            await supabase.rpc('activate_user_boost', {
              p_user_id: userId,
              p_boost_key: boostKey,
              p_payment_intent_id: `rc_${type.toLowerCase()}_${Date.now()}`,
            });
          }
          break;
        }

        // Membership subscription
        const tier = (entitlement_ids || [])
          .map(id => REVENUECAT_ENTITLEMENT_TO_TIER[id])
          .filter(Boolean)[0];

        if (!tier) {
          console.warn('[revenuecat] Could not resolve tier from entitlements:', entitlement_ids);
          break;
        }

        const expiresAt = expiration_at_ms
          ? new Date(expiration_at_ms).toISOString()
          : null;

        const { error } = await supabase
          .from('memberships')
          .upsert(
            {
              user_id: userId,
              tier,
              status: 'active',
              payment_provider: 'revenuecat',
              ends_at: expiresAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('[revenuecat] Failed to upsert membership:', error.message);
          return res.status(500).json({ error: 'DB update failed' });
        }
        break;
      }

      case 'CANCELLATION': {
        // Mark as cancelling but keep access until period end
        const expiresAt = expiration_at_ms
          ? new Date(expiration_at_ms).toISOString()
          : null;

        await supabase
          .from('memberships')
          .update({
            status: 'cancelling',
            ends_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('payment_provider', 'revenuecat');
        break;
      }

      case 'EXPIRATION': {
        // Subscription expired — revert to free tier
        await supabase
          .from('memberships')
          .update({
            tier: 'mess',
            status: 'expired',
            ends_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('payment_provider', 'revenuecat');
        break;
      }

      case 'BILLING_ISSUE': {
        await supabase
          .from('memberships')
          .update({
            status: 'billing_issue',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('payment_provider', 'revenuecat');
        break;
      }

      default:
        // Unhandled event type — log and acknowledge
        console.log('[revenuecat] Unhandled event type:', type);
    }

    // Log to analytics
    await supabase.from('analytics_events').insert({
      user_id: userId,
      event_type: 'iap_webhook',
      event_data: { type, product_id, tier: (entitlement_ids || []).join(',') },
    }).then(() => {});  // fire-and-forget

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[revenuecat] Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
