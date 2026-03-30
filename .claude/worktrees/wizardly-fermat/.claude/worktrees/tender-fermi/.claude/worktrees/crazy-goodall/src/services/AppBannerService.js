/**
 * AppBannerService — fetch banners by placement from app_banners table
 *
 * Banners are cached per-placement for the session.
 * Each banner has: placement, headline, subline, cta_text, cta_url,
 * bg_color, accent_color, image_url, badge_text, show_to, persona_filter,
 * track_catalog, track_lyric_quote, priority, starts_at, ends_at.
 */

import supabase from '@/components/utils/supabaseClient';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

/**
 * Fetch active banners for a given placement.
 * Returns array sorted by priority DESC.
 */
export async function fetchBanners(placement, { personaType = null, force = false } = {}) {
  const cacheKey = `${placement}:${personaType || 'all'}`;
  const cached = cache.get(cacheKey);
  if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  let query = supabase
    .from('app_banners')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  // Exact placement match or prefix match for music_card_* style
  if (placement.includes('*')) {
    query = query.like('placement', placement.replace('*', '%'));
  } else {
    query = query.eq('placement', placement);
  }

  // Time window filter
  const now = new Date().toISOString();
  query = query.or(`starts_at.is.null,starts_at.lte.${now}`);
  query = query.or(`ends_at.is.null,ends_at.gte.${now}`);

  const { data, error } = await query;
  if (error) {
    console.error('[AppBannerService] fetch error:', error);
    return [];
  }

  // Client-side persona filter
  let filtered = data || [];
  if (personaType) {
    filtered = filtered.filter(
      (b) => !b.persona_filter || b.persona_filter === 'all' || b.persona_filter === personaType
    );
  }

  cache.set(cacheKey, { data: filtered, ts: Date.now() });
  return filtered;
}

/**
 * Fetch a single banner for a placement (highest priority).
 */
export async function fetchBanner(placement, opts = {}) {
  const banners = await fetchBanners(placement, opts);
  return banners[0] || null;
}

/**
 * Fetch all banners matching a prefix (e.g. 'music_card_*').
 */
export async function fetchBannersByPrefix(prefix, opts = {}) {
  return fetchBanners(prefix.endsWith('*') ? prefix : `${prefix}*`, opts);
}

/**
 * Fetch ticker banners specifically.
 */
export async function fetchTickerBanners() {
  return fetchBanners('global_ticker');
}

/**
 * Clear banner cache (e.g. on persona switch).
 */
export function clearBannerCache() {
  cache.clear();
}

export default {
  fetchBanners,
  fetchBanner,
  fetchBannersByPrefix,
  fetchTickerBanners,
  clearBannerCache,
};
