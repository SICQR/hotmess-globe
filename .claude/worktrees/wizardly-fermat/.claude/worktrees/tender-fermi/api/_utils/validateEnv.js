/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup.
 * Returns clear error messages for missing configuration.
 */

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const IMPORTANT_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'EMAIL_FROM',
  'GOOGLE_MAPS_API_KEY',
];

const OPTIONAL_VARS = [
  'SOUNDCLOUD_CLIENT_ID',
  'SOUNDCLOUD_CLIENT_SECRET',
  'SHOPIFY_SHOP_DOMAIN',
  'SHOPIFY_ADMIN_ACCESS_TOKEN',
];

/**
 * Get environment variable with fallbacks
 */
export function getEnv(name, fallbacks = []) {
  // Check primary
  if (process.env[name]) {
    return process.env[name].trim();
  }
  
  // Check fallbacks (e.g., VITE_*, NEXT_PUBLIC_*)
  for (const fallback of fallbacks) {
    if (process.env[fallback]) {
      return process.env[fallback].trim();
    }
  }
  
  return null;
}

/**
 * Get Supabase URL with fallbacks
 */
export function getSupabaseUrl() {
  return getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
}

/**
 * Get Supabase Service Role Key
 */
export function getSupabaseServiceKey() {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Get Supabase Anon Key with fallbacks
 */
export function getSupabaseAnonKey() {
  return getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
}

/**
 * Validate required env vars, return error response if missing
 * @param {string[]} required - Array of required env var names
 * @returns {{ valid: boolean, missing: string[], error?: string }}
 */
export function validateRequired(required = REQUIRED_VARS) {
  const missing = [];
  
  for (const name of required) {
    if (!getEnv(name)) {
      missing.push(name);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      error: `Missing required environment variables: ${missing.join(', ')}`,
    };
  }
  
  return { valid: true, missing: [] };
}

/**
 * Validate and return 500 response if missing required vars
 * Use at start of API handlers
 */
export function requireEnvVars(res, vars) {
  const { valid, error } = validateRequired(vars);
  
  if (!valid) {
    res.status(500).json({ 
      error: 'Server configuration error',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
    return false;
  }
  
  return true;
}

export default {
  getEnv,
  getSupabaseUrl,
  getSupabaseServiceKey,
  getSupabaseAnonKey,
  validateRequired,
  requireEnvVars,
  REQUIRED_VARS,
  IMPORTANT_VARS,
  OPTIONAL_VARS,
};
