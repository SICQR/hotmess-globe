/**
 * Centralized Admin Authentication Middleware
 * 
 * Provides role-based authentication for admin routes using JWT tokens
 * and database role verification.
 * 
 * Usage:
 *   import { requireAdmin } from '../_middleware/adminAuth.js';
 *   
 *   const adminCheck = await requireAdmin(req, res, { anonClient, serviceClient });
 *   if (adminCheck.error) {
 *     return json(res, adminCheck.status, { error: adminCheck.error });
 *   }
 *   // Access admin user: adminCheck.user
 */

import { getBearerToken, getEnv, json } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

/**
 * Verify that the request comes from an authenticated admin user.
 * 
 * Authentication flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Validate JWT token with Supabase
 * 3. Check user's role in database (User table)
 * 4. Optionally check ADMIN_EMAILS env var as fallback during transition
 * 
 * @param {Object} req - HTTP request object
 * @param {Object} clients - Supabase clients { anonClient, serviceClient }
 * @param {Object} options - Optional configuration
 * @param {boolean} options.allowEmailFallback - Allow ADMIN_EMAILS env fallback (default: true for transition period)
 * @param {boolean} options.logFailures - Log auth failures for debugging (default: true)
 * @returns {Promise<{user: Object|null, error: string|null, status: number}>}
 */
export async function requireAdmin(req, { anonClient, serviceClient }, options = {}) {
  const { 
    allowEmailFallback = true,
    logFailures = true 
  } = options;

  // Step 1: Extract Bearer token
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    if (logFailures) {
      logAuthFailure('missing_token', null, req);
    }
    return { user: null, error: 'Unauthorized - Missing bearer token', status: 401 };
  }

  // Step 2: Validate JWT token
  const { user: authUser, error: authError } = await getAuthedUser({ anonClient, accessToken });
  if (authError || !authUser?.email) {
    if (logFailures) {
      logAuthFailure('invalid_token', authUser?.email || null, req);
    }
    return { user: null, error: 'Unauthorized - Invalid auth token', status: 401 };
  }

  // Step 3: Check role in database (primary method)
  if (serviceClient) {
    const { data: profile, error: profileError } = await serviceClient
      .from('User')
      .select('email, role, full_name')
      .eq('email', authUser.email)
      .maybeSingle();

    if (profileError) {
      if (logFailures) {
        logAuthFailure('profile_fetch_error', authUser.email, req, profileError.message);
      }
      return { user: null, error: 'Failed to verify admin status', status: 500 };
    }

    // Check database role
    if (profile?.role === 'admin') {
      return { 
        user: { 
          id: authUser.id,
          email: profile.email, 
          role: profile.role,
          full_name: profile.full_name 
        }, 
        error: null, 
        status: 200 
      };
    }
  }

  // Step 4: Fallback to ADMIN_EMAILS env var (transition period)
  if (allowEmailFallback) {
    const adminEmails = getAdminEmailsFromEnv();
    const userEmailLower = String(authUser.email).toLowerCase().trim();
    
    if (adminEmails.includes(userEmailLower)) {
      // Log that we used email fallback (useful for migration tracking)
      if (logFailures) {
        console.info(`[AdminAuth] User ${authUser.email} granted admin via ADMIN_EMAILS fallback`);
      }
      return { 
        user: { 
          id: authUser.id,
          email: authUser.email, 
          role: 'admin',
          full_name: null,
          via_fallback: true 
        }, 
        error: null, 
        status: 200 
      };
    }
  }

  // Not an admin
  if (logFailures) {
    logAuthFailure('not_admin', authUser.email, req);
  }
  return { user: null, error: 'Forbidden - Admin access required', status: 403 };
}

/**
 * Simplified admin check that initializes Supabase clients automatically.
 * Use this when you don't need custom client configuration.
 * 
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object (for returning early on errors)
 * @returns {Promise<{user: Object|null, proceed: boolean}>}
 */
export async function checkAdmin(req, res) {
  const { error, anonClient, serviceClient } = getSupabaseServerClients();
  
  if (error) {
    json(res, 500, { error: 'Server configuration error' });
    return { user: null, proceed: false };
  }

  const adminCheck = await requireAdmin(req, { anonClient, serviceClient });
  
  if (adminCheck.error) {
    json(res, adminCheck.status, { error: adminCheck.error });
    return { user: null, proceed: false };
  }

  return { user: adminCheck.user, proceed: true };
}

/**
 * Express/Connect-style middleware wrapper for admin routes.
 * Returns a function that can be used as middleware.
 * 
 * Usage:
 *   import { adminMiddleware } from '../_middleware/adminAuth.js';
 *   
 *   export default async function handler(req, res) {
 *     const admin = await adminMiddleware(req, res);
 *     if (!admin) return; // Response already sent
 *     
 *     // Proceed with admin logic
 *   }
 */
export async function adminMiddleware(req, res) {
  const { user, proceed } = await checkAdmin(req, res);
  if (!proceed) return null;
  return user;
}

/**
 * Get admin emails from environment variable.
 * Supports comma-separated list of emails.
 * 
 * @returns {string[]} Array of lowercased admin email addresses
 */
function getAdminEmailsFromEnv() {
  const raw = getEnv('ADMIN_EMAILS', ['VITE_ADMIN_EMAILS']);
  if (!raw) return [];
  
  return String(raw)
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Log authentication failure for debugging.
 * Uses structured format for easy parsing in production logs.
 * 
 * @param {string} reason - Failure reason code
 * @param {string|null} email - User email if available
 * @param {Object} req - HTTP request object
 * @param {string|null} details - Additional details
 */
function logAuthFailure(reason, email, req, details = null) {
  const ip = getRequestIp(req);
  const timestamp = new Date().toISOString();
  
  const logEntry = {
    timestamp,
    type: 'admin_auth_failure',
    reason,
    email: email || 'unknown',
    ip: ip || 'unknown',
    path: req?.url || 'unknown',
    method: req?.method || 'unknown',
    ...(details && { details })
  };
  
  // In production, errors go to monitoring/logging service
  // In development, we log to console
  console.warn(`[AdminAuth] Auth failure:`, JSON.stringify(logEntry));
}

/**
 * Get request IP address from headers.
 * @param {Object} req - HTTP request object
 * @returns {string|null}
 */
function getRequestIp(req) {
  const header = req?.headers?.['x-forwarded-for'] || req?.headers?.['X-Forwarded-For'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw && String(raw).trim()) return String(raw).split(',')[0].trim();
  
  const cf = req?.headers?.['cf-connecting-ip'] || req?.headers?.['CF-Connecting-IP'];
  const cfRaw = Array.isArray(cf) ? cf[0] : cf;
  if (cfRaw && String(cfRaw).trim()) return String(cfRaw).trim();
  
  return null;
}

export default { requireAdmin, checkAdmin, adminMiddleware };
