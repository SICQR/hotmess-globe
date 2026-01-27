/**
 * Admin Authentication Middleware
 * 
 * Provides centralized authentication and authorization for admin API routes.
 * Validates JWT tokens and checks user role in database.
 * 
 * Usage:
 *   import { requireAdmin, requireAdminOrCron } from './_middleware/adminAuth.js';
 *   
 *   export default async function handler(req, res) {
 *     const authResult = await requireAdmin(req);
 *     if (authResult.error) {
 *       return res.status(authResult.status).json({ error: authResult.error });
 *     }
 *     const { user, supabase } = authResult;
 *     // user is now authenticated admin with { email, role, id }
 *   }
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const getEnv = (key) => process.env[key] || '';

// Fallback admin emails from environment (for graceful degradation)
const getAdminEmailsFallback = () => {
  const envEmails = getEnv('ADMIN_EMAILS');
  if (!envEmails) return [];
  return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

// ============================================================================
// Supabase Client
// ============================================================================

let _supabase = null;

const getSupabase = () => {
  if (_supabase) return _supabase;
  
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!url || !key) {
    console.error('[AdminAuth] Missing Supabase configuration');
    return null;
  }
  
  _supabase = createClient(url, key);
  return _supabase;
};

// ============================================================================
// Auth Helpers
// ============================================================================

/**
 * Extract Bearer token from Authorization header
 */
const extractToken = (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
};

/**
 * Validate user session from Supabase
 */
const validateSession = async (supabase, token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { error: 'Invalid or expired token', status: 401 };
    }
    return { user };
  } catch (err) {
    console.error('[AdminAuth] Session validation failed:', err);
    return { error: 'Authentication failed', status: 500 };
  }
};

/**
 * Check if user has admin role in database
 */
const checkAdminRole = async (supabase, userId) => {
  try {
    const { data: profile, error } = await supabase
      .from('User')
      .select('role, email, full_name')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[AdminAuth] Failed to fetch user profile:', error);
      return { error: 'Failed to verify admin status', status: 500 };
    }
    
    if (!profile) {
      return { error: 'User profile not found', status: 404 };
    }
    
    // Primary check: database role
    if (profile.role === 'admin') {
      return { 
        isAdmin: true, 
        user: { 
          id: userId, 
          email: profile.email, 
          role: profile.role,
          fullName: profile.full_name 
        } 
      };
    }
    
    // Fallback check: ADMIN_EMAILS environment variable
    // (for bootstrapping new admins or when DB role isn't set)
    const fallbackEmails = getAdminEmailsFallback();
    if (fallbackEmails.includes(profile.email?.toLowerCase())) {
      console.warn(`[AdminAuth] User ${profile.email} authenticated via ADMIN_EMAILS fallback - consider setting role='admin' in database`);
      return { 
        isAdmin: true, 
        user: { 
          id: userId, 
          email: profile.email, 
          role: 'admin', // Grant admin role via fallback
          fullName: profile.full_name 
        } 
      };
    }
    
    return { isAdmin: false };
  } catch (err) {
    console.error('[AdminAuth] Role check failed:', err);
    return { error: 'Failed to verify admin status', status: 500 };
  }
};

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Require admin authentication
 * 
 * Returns either:
 * - { error, status } if authentication fails
 * - { user, supabase } if authentication succeeds
 * 
 * @param {Request} req - HTTP request object
 * @returns {Promise<{ error?: string, status?: number, user?: object, supabase?: object }>}
 */
export async function requireAdmin(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: 'Database not configured', status: 500 };
  }
  
  // Extract token
  const token = extractToken(req);
  if (!token) {
    return { error: 'Authorization header required', status: 401 };
  }
  
  // Validate session
  const sessionResult = await validateSession(supabase, token);
  if (sessionResult.error) {
    return sessionResult;
  }
  
  // Check admin role
  const roleResult = await checkAdminRole(supabase, sessionResult.user.id);
  if (roleResult.error) {
    return roleResult;
  }
  
  if (!roleResult.isAdmin) {
    console.warn(`[AdminAuth] Non-admin access attempt by user ${sessionResult.user.email}`);
    return { error: 'Admin access required', status: 403 };
  }
  
  // Log successful admin auth
  console.log(`[AdminAuth] Admin access granted to ${roleResult.user.email}`);
  
  return { 
    user: roleResult.user, 
    supabase 
  };
}

/**
 * Require admin authentication OR valid cron secret
 * 
 * Useful for endpoints that can be triggered by both admins and cron jobs.
 * 
 * @param {Request} req - HTTP request object
 * @returns {Promise<{ error?: string, status?: number, user?: object, supabase?: object, isCron?: boolean }>}
 */
export async function requireAdminOrCron(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: 'Database not configured', status: 500 };
  }
  
  // Check for cron secret first
  const cronSecret = getEnv('CRON_SECRET');
  const providedSecret = req.headers?.['x-cron-secret'] || req.headers?.['X-Cron-Secret'];
  
  if (cronSecret && providedSecret === cronSecret) {
    console.log('[AdminAuth] Cron job access granted');
    return { 
      user: { email: 'cron@system', role: 'system' }, 
      supabase, 
      isCron: true 
    };
  }
  
  // Fall back to admin auth
  const adminResult = await requireAdmin(req);
  if (adminResult.error) {
    return adminResult;
  }
  
  return { ...adminResult, isCron: false };
}

/**
 * Simple helper to check if a user email is an admin
 * (uses fallback emails only, useful for quick checks without full auth)
 * 
 * @param {string} email - User email to check
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email) return false;
  const fallbackEmails = getAdminEmailsFallback();
  return fallbackEmails.includes(email.toLowerCase());
}

export default { requireAdmin, requireAdminOrCron, isAdminEmail };
