/**
 * useP2PListingBeacon - Wire P2P listings to Globe beacons
 * 
 * When a seller creates a P2P product, insert a Gold beacon.
 * When they delete it, remove the beacon.
 */

import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

const BEACON_COLOR = {
  social: '#39FF14',      // Lime — Right Now
  event: '#00D9FF',       // Cyan — events
  marketplace: '#FFD700', // Gold — P2P listings
  radio: '#B026FF',       // Purple — radio
};

/**
 * Insert a Gold beacon for a P2P listing
 * @param {Object} product - The created product
 * @param {string} promoterId - User's auth_user_id or id
 * @returns {Promise<Object|null>} Created beacon or null
 */
export async function insertBeaconForP2PListing(product, promoterId) {
  if (!product || !promoterId) {
    logger.warn('[useP2PListingBeacon] Missing product or promoterId');
    return null;
  }

  try {
    // Default to London coords if no location on product
    const lat = product.lat ?? product.location?.lat ?? 51.5074;
    const lng = product.lng ?? product.location?.lng ?? -0.1278;

    const beaconData = {
      promoter_id: promoterId,
      kind: 'marketplace',
      title: product.title || product.name || 'P2P Listing',
      city: product.city || 'London',
      lat,
      lng,
      metadata: {
        product_id: product.id,
        price: product.price,
        color: BEACON_COLOR.marketplace,
      },
      // Beacons expire after 30 days by default for listings
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data, error } = await supabase
      .from('Beacon')
      .insert(beaconData)
      .select()
      .single();

    if (error) {
      logger.error('[useP2PListingBeacon] Insert error:', error);
      return null;
    }

    logger.info('[useP2PListingBeacon] Created Gold beacon for product:', product.id);
    return data;
  } catch (err) {
    logger.error('[useP2PListingBeacon] Exception:', err);
    return null;
  }
}

/**
 * Delete beacon(s) associated with a P2P listing
 * @param {string} productId - The deleted product's ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteBeaconForP2PListing(productId) {
  if (!productId) {
    logger.warn('[useP2PListingBeacon] Missing productId for deletion');
    return false;
  }

  try {
    // Delete beacons where metadata contains this product_id
    const { error } = await supabase
      .from('Beacon')
      .delete()
      .eq('kind', 'marketplace')
      .contains('metadata', { product_id: productId });

    if (error) {
      logger.error('[useP2PListingBeacon] Delete error:', error);
      return false;
    }

    logger.info('[useP2PListingBeacon] Deleted beacon for product:', productId);
    return true;
  } catch (err) {
    logger.error('[useP2PListingBeacon] Delete exception:', err);
    return false;
  }
}

/**
 * Dispatch WORLD_PULSE event for Globe ripple effect
 * @param {string} type - Event type (e.g., 'GOLD_DROP', 'BEACON_REMOVED')
 * @param {string} color - Hex color for ripple
 */
export function dispatchWorldPulse(type, color = BEACON_COLOR.marketplace) {
  window.dispatchEvent(
    new CustomEvent('WORLD_PULSE', {
      detail: { type, color, timestamp: Date.now() },
    })
  );
}

export { BEACON_COLOR };
