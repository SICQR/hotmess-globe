/**
 * Redis caching layer for API responses
 * Uses Upstash Redis for Vercel Edge compatibility
 * Falls back to in-memory cache if Redis is not configured
 */

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;

// In-memory fallback cache
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

// Memory cache size limit (entries)
const MAX_MEMORY_CACHE_SIZE = 1000;

/**
 * Check if Redis is configured
 */
export const isRedisConfigured = () => {
  return !!(REDIS_REST_URL && REDIS_REST_TOKEN);
};

/**
 * Execute Redis command via REST API
 */
const redisCommand = async (command, ...args) => {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const response = await fetch(REDIS_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command, ...args]),
    });

    if (!response.ok) {
      console.error('Redis command failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('Redis error:', error.message);
    return null;
  }
};

/**
 * Clean up expired memory cache entries
 */
const cleanupMemoryCache = () => {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheExpiry) {
    if (expiry < now) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
    }
  }

  // Evict oldest entries if over limit
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const entriesToRemove = memoryCache.size - MAX_MEMORY_CACHE_SIZE;
    const keys = [...memoryCache.keys()];
    for (let i = 0; i < entriesToRemove; i++) {
      memoryCache.delete(keys[i]);
      memoryCacheExpiry.delete(keys[i]);
    }
  }
};

/**
 * Get value from cache
 */
export const cacheGet = async (key) => {
  // Try Redis first
  if (isRedisConfigured()) {
    const value = await redisCommand('GET', key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return null;
  }

  // Fallback to memory cache
  cleanupMemoryCache();
  const expiry = memoryCacheExpiry.get(key);
  if (expiry && expiry < Date.now()) {
    memoryCache.delete(key);
    memoryCacheExpiry.delete(key);
    return null;
  }
  return memoryCache.get(key) || null;
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttlSeconds - Time to live in seconds
 */
export const cacheSet = async (key, value, ttlSeconds = 300) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  // Try Redis first
  if (isRedisConfigured()) {
    await redisCommand('SETEX', key, ttlSeconds, serialized);
    return;
  }

  // Fallback to memory cache
  cleanupMemoryCache();
  memoryCache.set(key, value);
  memoryCacheExpiry.set(key, Date.now() + ttlSeconds * 1000);
};

/**
 * Delete value from cache
 */
export const cacheDelete = async (key) => {
  if (isRedisConfigured()) {
    await redisCommand('DEL', key);
  }
  memoryCache.delete(key);
  memoryCacheExpiry.delete(key);
};

/**
 * Delete multiple keys matching a pattern
 */
export const cacheDeletePattern = async (pattern) => {
  if (isRedisConfigured()) {
    const keys = await redisCommand('KEYS', pattern);
    if (keys && keys.length > 0) {
      await redisCommand('DEL', ...keys);
    }
  }

  // Memory cache pattern matching
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
    }
  }
};

/**
 * Increment a counter
 */
export const cacheIncr = async (key, ttlSeconds = 3600) => {
  if (isRedisConfigured()) {
    const result = await redisCommand('INCR', key);
    if (result === 1) {
      await redisCommand('EXPIRE', key, ttlSeconds);
    }
    return result;
  }

  // Memory fallback
  const current = memoryCache.get(key) || 0;
  const newValue = current + 1;
  memoryCache.set(key, newValue);
  if (!memoryCacheExpiry.has(key)) {
    memoryCacheExpiry.set(key, Date.now() + ttlSeconds * 1000);
  }
  return newValue;
};

/**
 * Get cache stats
 */
export const getCacheStats = async () => {
  const stats = {
    type: isRedisConfigured() ? 'redis' : 'memory',
    memoryCacheSize: memoryCache.size,
  };

  if (isRedisConfigured()) {
    const info = await redisCommand('INFO');
    if (info) {
      stats.redisInfo = info;
    }
  }

  return stats;
};

/**
 * Higher-order function to cache API responses
 */
export const withCache = (keyPrefix, ttlSeconds = 300) => {
  return (handler) => async (req, res) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req, res);
    }

    // Build cache key from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryString = url.searchParams.toString();
    const cacheKey = `${keyPrefix}:${url.pathname}${queryString ? ':' + queryString : ''}`;

    // Check cache
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(typeof cached === 'string' ? cached : JSON.stringify(cached));
      return;
    }

    // Capture response
    const originalEnd = res.end.bind(res);
    let responseBody = '';

    res.end = (body) => {
      responseBody = body;
      return originalEnd(body);
    };

    // Execute handler
    await handler(req, res);

    // Cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300 && responseBody) {
      res.setHeader('X-Cache', 'MISS');
      try {
        const parsed = JSON.parse(responseBody);
        await cacheSet(cacheKey, parsed, ttlSeconds);
      } catch {
        // Not JSON, skip caching
      }
    }
  };
};

/**
 * Cache key generators for common patterns
 */
export const cacheKeys = {
  profile: (userId) => `profile:${userId}`,
  profiles: (page, limit, filters) => 
    `profiles:${page}:${limit}:${JSON.stringify(filters)}`,
  matchProbability: (userId, targetId) => 
    `match:${userId}:${targetId}`,
  userSession: (userId) => `session:${userId}`,
  rateLimit: (key) => `ratelimit:${key}`,
  feature: (featureName) => `feature:${featureName}`,
};

/**
 * Cache TTL presets (in seconds)
 */
export const cacheTTL = {
  short: 60,         // 1 minute
  medium: 300,       // 5 minutes
  long: 900,         // 15 minutes
  hour: 3600,        // 1 hour
  day: 86400,        // 24 hours
  week: 604800,      // 7 days
};
