/**
 * Rate Limiting Middleware
 * 
 * Protects API routes from abuse with configurable rate limits.
 * Uses Supabase for persistent rate limit storage.
 */

import { createClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client to handle missing env vars gracefully
let _supabase = null;

const getSupabase = () => {
  if (_supabase) return _supabase;
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.warn('[RateLimit] Missing Supabase configuration - rate limiting disabled');
    return null;
  }
  
  _supabase = createClient(url, key);
  return _supabase;
};

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please try again later.',
  statusCode: 429,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => getClientIP(req),
};

// Route-specific limits (fine-grained per endpoint)
const ROUTE_LIMITS = {
  // Authentication - strict limits
  '/api/auth': { windowMs: 60 * 1000, maxRequests: 10, keyBy: 'ip' },
  '/api/auth/login': { windowMs: 60 * 1000, maxRequests: 5, keyBy: 'ip' },
  '/api/auth/register': { windowMs: 60 * 1000, maxRequests: 3, keyBy: 'ip' },
  '/api/auth/magic-link': { windowMs: 60 * 1000, maxRequests: 3, keyBy: 'ip' },
  
  // Expensive operations
  '/api/match-probability': { windowMs: 60 * 1000, maxRequests: 30, keyBy: 'user' },
  '/api/embeddings': { windowMs: 60 * 1000, maxRequests: 10, keyBy: 'user' },
  '/api/recommendations': { windowMs: 60 * 1000, maxRequests: 20, keyBy: 'user' },
  
  // Messaging - moderate limits
  '/api/messages': { windowMs: 60 * 1000, maxRequests: 100, keyBy: 'user' },
  '/api/push/send': { windowMs: 60 * 1000, maxRequests: 10, keyBy: 'user' },
  '/api/push/subscribe': { windowMs: 60 * 1000, maxRequests: 5, keyBy: 'user' },
  
  // Marketplace - user-based
  '/api/orders': { windowMs: 60 * 1000, maxRequests: 30, keyBy: 'user' },
  '/api/orders/release-escrow': { windowMs: 60 * 1000, maxRequests: 10, keyBy: 'user' },
  '/api/stripe/connect': { windowMs: 60 * 1000, maxRequests: 5, keyBy: 'user' },
  '/api/stripe/create-checkout': { windowMs: 60 * 1000, maxRequests: 10, keyBy: 'user' },
  
  // File uploads - strict
  '/api/upload': { windowMs: 60 * 1000, maxRequests: 20, keyBy: 'user' },
  '/api/upload/chunk': { windowMs: 60 * 1000, maxRequests: 100, keyBy: 'user' },
  
  // Analytics - generous
  '/api/analytics/events': { windowMs: 60 * 1000, maxRequests: 100, keyBy: 'ip' },
  
  // Profile operations
  '/api/profiles': { windowMs: 60 * 1000, maxRequests: 60, keyBy: 'user' },
  '/api/profile': { windowMs: 60 * 1000, maxRequests: 30, keyBy: 'user' },
  
  // SoundCloud - strict
  '/api/soundcloud/upload': { windowMs: 60 * 1000, maxRequests: 5, keyBy: 'user' },
  '/api/soundcloud/authorize': { windowMs: 60 * 1000, maxRequests: 3, keyBy: 'user' },
  
  // Admin - very strict
  '/api/admin': { windowMs: 60 * 1000, maxRequests: 30, keyBy: 'user' },
  
  // Cron endpoints - should be verified by secret, not rate limited normally
  '/api/cron': { windowMs: 60 * 1000, maxRequests: 5, keyBy: 'ip' },
  
  // Search - moderate
  '/api/search': { windowMs: 60 * 1000, maxRequests: 60, keyBy: 'user' },
  
  // Events - generous for browsing
  '/api/events': { windowMs: 60 * 1000, maxRequests: 100, keyBy: 'ip' },
};

// ============================================================================
// Helpers
// ============================================================================

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

function getRouteKey(path) {
  // Match route patterns
  for (const [pattern, config] of Object.entries(ROUTE_LIMITS)) {
    if (path.startsWith(pattern)) {
      return { pattern, config };
    }
  }
  return { pattern: 'default', config: DEFAULT_CONFIG };
}

/**
 * Generate rate limit key based on configuration
 * @param {object} req - Request object
 * @param {object} config - Rate limit configuration
 * @returns {string} Rate limit key
 */
function getRateLimitKey(req, config) {
  const keyBy = config.keyBy || 'ip';
  
  switch (keyBy) {
    case 'user': {
      // Try to get user from auth header
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        // Extract user ID from JWT or use the token as key
        const token = authHeader.replace('Bearer ', '');
        // Use first 16 chars of token as identifier (safe for rate limiting)
        return `user:${token.substring(0, 16)}`;
      }
      // Fall back to IP if no auth
      return `ip:${getClientIP(req)}`;
    }
    
    case 'ip':
    default:
      return `ip:${getClientIP(req)}`;
  }
}

// ============================================================================
// In-Memory Cache (Fallback)
// ============================================================================

const memoryCache = new Map();
const MEMORY_CLEANUP_INTERVAL = 60 * 1000;

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryCache.entries()) {
    if (data.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, MEMORY_CLEANUP_INTERVAL);

// ============================================================================
// Rate Limit Functions
// ============================================================================

/**
 * Check and increment rate limit
 */
async function checkRateLimit(key, config) {
  const { windowMs, maxRequests } = config;
  const now = Date.now();
  const windowStart = now - windowMs;

  const supabase = getSupabase();
  
  // If Supabase is not configured, fall back to memory cache
  if (!supabase) {
    return checkMemoryRateLimit(key, config);
  }

  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    let count = 1;
    let windowStartTime = now;

    if (data) {
      const dbWindowStart = new Date(data.window_start).getTime();
      
      if (dbWindowStart > windowStart) {
        // Still in current window
        count = data.count + 1;
        windowStartTime = dbWindowStart;
      }
      // else: window expired, reset
    }

    // Update or insert
    await supabase
      .from('rate_limits')
      .upsert({
        key,
        count,
        window_start: new Date(windowStartTime).toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: windowStartTime + windowMs,
      count,
    };
  } catch (error) {
    // Fall back to memory cache
    console.warn('Rate limit DB error, using memory cache:', error.message);
    return checkMemoryRateLimit(key, config);
  }
}

function checkMemoryRateLimit(key, config) {
  const { windowMs, maxRequests } = config;
  const now = Date.now();
  const windowStart = now - windowMs;

  const cached = memoryCache.get(key);
  
  if (cached && cached.windowStart > windowStart) {
    // In current window
    cached.count += 1;
    memoryCache.set(key, cached);
    
    return {
      allowed: cached.count <= maxRequests,
      remaining: Math.max(0, maxRequests - cached.count),
      resetAt: cached.windowStart + windowMs,
      count: cached.count,
    };
  }

  // New window
  const newData = {
    count: 1,
    windowStart: now,
    expiresAt: now + windowMs * 2,
  };
  memoryCache.set(key, newData);

  return {
    allowed: true,
    remaining: maxRequests - 1,
    resetAt: now + windowMs,
    count: 1,
  };
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Rate limit middleware wrapper
 */
export function rateLimit(customConfig = {}) {
  return async (req, res, next) => {
    const path = req.url.split('?')[0];
    const { pattern, config } = getRouteKey(path);
    const finalConfig = { ...DEFAULT_CONFIG, ...config, ...customConfig };

    // Use the new key generation based on keyBy config
    const baseKey = getRateLimitKey(req, finalConfig);
    const key = `${baseKey}:${pattern}`;
    const result = await checkRateLimit(key, finalConfig);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
      return res.status(finalConfig.statusCode).json({
        error: finalConfig.message,
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
    }

    if (next) {
      return next();
    }
  };
}

/**
 * Apply rate limiting to a handler
 */
export function withRateLimit(handler, customConfig = {}) {
  return async (req, res) => {
    const rateLimitMiddleware = rateLimit(customConfig);
    
    let blocked = false;
    await rateLimitMiddleware(req, res, () => {
      blocked = false;
    });

    if (res.statusCode === 429) {
      return; // Already responded with rate limit error
    }

    return handler(req, res);
  };
}

/**
 * Check rate limit without blocking (for gradual degradation)
 */
export async function getRateLimitStatus(key, config = DEFAULT_CONFIG) {
  return checkRateLimit(key, config);
}

export default rateLimit;
