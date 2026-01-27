/**
 * Cache module exports
 * Provides unified caching interface with Redis + memory fallback
 */

export {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheIncr,
  getCacheStats,
  withCache,
  cacheKeys,
  cacheTTL,
  isRedisConfigured,
} from './redis.js';

/**
 * Example usage:
 * 
 * // Simple get/set
 * import { cacheGet, cacheSet, cacheTTL } from './_cache';
 * 
 * const data = await cacheGet('mykey');
 * if (!data) {
 *   const freshData = await fetchExpensiveData();
 *   await cacheSet('mykey', freshData, cacheTTL.medium);
 * }
 * 
 * // Wrap handler with caching
 * import { withCache } from './_cache';
 * 
 * export default withCache('profiles', 300)(async function handler(req, res) {
 *   // This response will be cached for 5 minutes
 *   res.json({ data: await getProfiles() });
 * });
 * 
 * // Rate limiting with cache
 * import { cacheIncr, cacheKeys, cacheTTL } from './_cache';
 * 
 * const key = cacheKeys.rateLimit(`user:${userId}:minute`);
 * const count = await cacheIncr(key, 60);
 * if (count > 100) {
 *   return res.status(429).json({ error: 'Rate limited' });
 * }
 */
