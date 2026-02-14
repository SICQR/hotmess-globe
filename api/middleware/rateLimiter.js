/**
 * Backend Rate Limiter Middleware for Vercel Serverless Functions
 * 
 * Features:
 * - IP-based rate limiting
 * - User-based rate limiting (when authenticated)
 * - Progressive penalties for repeated violations
 * - Rate limit headers in responses
 * - Abuse detection and logging
 */

// In-memory store for rate limiting (use Redis in production)
// Note: In serverless, this resets between cold starts
// For production, use Vercel KV, Upstash Redis, or similar
const rateLimitStore = new Map();
const violationStore = new Map();

// Configuration
const CONFIG = {
  // Default rate limits
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  // Strict limits for sensitive endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
  // API endpoints
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Search endpoints
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
  // Upload endpoints
  upload: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Post/Create endpoints
  create: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
  // Progressive penalty multipliers
  penalties: {
    warning: 1,
    minor: 2,
    moderate: 4,
    severe: 10,
    block: Infinity,
  },
  // Violation thresholds
  violationThresholds: {
    warning: 3,
    minor: 5,
    moderate: 10,
    severe: 20,
    block: 50,
  },
};

/**
 * Get client identifier (IP or user ID)
 */
function getClientId(req) {
  // Try to get user ID from auth header
  const authHeader = req.headers.authorization;
  const userId = req.headers['x-user-id'];
  
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = forwardedFor 
    ? forwardedFor.split(',')[0].trim() 
    : req.socket?.remoteAddress || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Get rate limit tier based on endpoint
 */
function getRateLimitTier(pathname, method) {
  // Auth endpoints
  if (pathname.includes('/auth/') || pathname.includes('/login') || pathname.includes('/signup')) {
    return 'auth';
  }
  
  // Upload endpoints
  if (pathname.includes('/upload') || method === 'POST' && pathname.includes('/media')) {
    return 'upload';
  }
  
  // Search endpoints
  if (pathname.includes('/search')) {
    return 'search';
  }
  
  // Create/Post endpoints
  if (method === 'POST' && (
    pathname.includes('/beacon') ||
    pathname.includes('/message') ||
    pathname.includes('/comment') ||
    pathname.includes('/post')
  )) {
    return 'create';
  }
  
  // API endpoints
  if (pathname.startsWith('/api/')) {
    return 'api';
  }
  
  return 'default';
}

/**
 * Get current violation level for a client
 */
function getViolationLevel(clientId) {
  const violations = violationStore.get(clientId) || { count: 0, lastViolation: 0 };
  const now = Date.now();
  
  // Reset violations after 24 hours of good behavior
  if (now - violations.lastViolation > 24 * 60 * 60 * 1000) {
    violationStore.delete(clientId);
    return { level: 'none', multiplier: 1 };
  }
  
  const { count } = violations;
  
  if (count >= CONFIG.violationThresholds.block) {
    return { level: 'block', multiplier: CONFIG.penalties.block };
  }
  if (count >= CONFIG.violationThresholds.severe) {
    return { level: 'severe', multiplier: CONFIG.penalties.severe };
  }
  if (count >= CONFIG.violationThresholds.moderate) {
    return { level: 'moderate', multiplier: CONFIG.penalties.moderate };
  }
  if (count >= CONFIG.violationThresholds.minor) {
    return { level: 'minor', multiplier: CONFIG.penalties.minor };
  }
  if (count >= CONFIG.violationThresholds.warning) {
    return { level: 'warning', multiplier: CONFIG.penalties.warning };
  }
  
  return { level: 'none', multiplier: 1 };
}

/**
 * Record a violation
 */
function recordViolation(clientId) {
  const violations = violationStore.get(clientId) || { count: 0, lastViolation: 0 };
  violations.count += 1;
  violations.lastViolation = Date.now();
  violationStore.set(clientId, violations);
  
  return violations.count;
}

/**
 * Check rate limit for a request
 */
function checkRateLimit(clientId, tier) {
  const now = Date.now();
  const config = CONFIG[tier] || CONFIG.default;
  const { level, multiplier } = getViolationLevel(clientId);
  
  // Get or create rate limit record
  const key = `${clientId}:${tier}`;
  let record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    record = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }
  
  record.count += 1;
  rateLimitStore.set(key, record);
  
  // Calculate effective limit (reduced by violation multiplier)
  const effectiveLimit = Math.max(1, Math.floor(config.maxRequests / multiplier));
  
  const remaining = Math.max(0, effectiveLimit - record.count);
  const resetIn = Math.max(0, record.resetAt - now);
  
  return {
    allowed: record.count <= effectiveLimit,
    limit: effectiveLimit,
    remaining,
    resetAt: record.resetAt,
    resetIn,
    violationLevel: level,
  };
}

/**
 * Rate limit headers
 */
function getRateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'X-RateLimit-Reset-After': String(Math.ceil(result.resetIn / 1000)),
  };
}

/**
 * Main rate limiter middleware
 * Usage: wrap your API handler with this function
 * 
 * Example:
 * import { withRateLimit } from '../middleware/rateLimiter';
 * export default withRateLimit(handler);
 */
export function withRateLimit(handler, options = {}) {
  return async (req, res) => {
    const clientId = getClientId(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tier = options.tier || getRateLimitTier(url.pathname, req.method);
    
    // Check rate limit
    const result = checkRateLimit(clientId, tier);
    
    // Set rate limit headers
    const headers = getRateLimitHeaders(result);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // If blocked, return 429
    if (!result.allowed) {
      recordViolation(clientId);
      
      // Log abuse attempt
      // console.warn('[RateLimit] Request blocked:', {
      //   clientId,
      //   tier,
      //   violationLevel: result.violationLevel,
      //   endpoint: url.pathname,
      //   method: req.method,
      //   timestamp: new Date().toISOString(),
      // });
      
      res.setHeader('Retry-After', String(Math.ceil(result.resetIn / 1000)));
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(result.resetIn / 1000),
        violationLevel: result.violationLevel,
      });
    }
    
    // Proceed to handler
    return handler(req, res);
  };
}

/**
 * Express-style middleware (for use with frameworks that support it)
 */
export function rateLimitMiddleware(options = {}) {
  return (req, res, next) => {
    const clientId = getClientId(req);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tier = options.tier || getRateLimitTier(url.pathname, req.method);
    
    const result = checkRateLimit(clientId, tier);
    
    // Set headers
    const headers = getRateLimitHeaders(result);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (!result.allowed) {
      recordViolation(clientId);
      res.setHeader('Retry-After', String(Math.ceil(result.resetIn / 1000)));
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(result.resetIn / 1000),
      });
    }
    
    next();
  };
}

/**
 * Check if a client is currently blocked
 */
export function isBlocked(clientId) {
  const { level } = getViolationLevel(clientId);
  return level === 'block';
}

/**
 * Get abuse stats for monitoring
 */
export function getAbuseStats() {
  const stats = {
    totalTrackedClients: rateLimitStore.size,
    clientsWithViolations: violationStore.size,
    blockedClients: 0,
    violationsByLevel: {
      warning: 0,
      minor: 0,
      moderate: 0,
      severe: 0,
      block: 0,
    },
  };
  
  for (const [clientId] of violationStore) {
    const { level } = getViolationLevel(clientId);
    if (level !== 'none') {
      stats.violationsByLevel[level]++;
    }
    if (level === 'block') {
      stats.blockedClients++;
    }
  }
  
  return stats;
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanup() {
  const now = Date.now();
  
  // Clean up rate limit records
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
  
  // Clean up old violations (after 24 hours)
  for (const [clientId, violations] of violationStore) {
    if (now - violations.lastViolation > 24 * 60 * 60 * 1000) {
      violationStore.delete(clientId);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 5 * 60 * 1000);
}

export default {
  withRateLimit,
  rateLimitMiddleware,
  checkRateLimit,
  isBlocked,
  getAbuseStats,
  cleanup,
  CONFIG,
};
