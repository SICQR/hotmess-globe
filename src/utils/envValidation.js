/**
 * Environment Variable Validation Utilities
 * 
 * Validates that required environment variables are properly configured
 * for authentication and other critical features.
 */

import logger from './logger';

/**
 * Validates that Supabase environment variables are configured
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSupabaseConfig() {
  const errors = [];
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || supabaseUrl === 'https://invalid.localhost') {
    errors.push('VITE_SUPABASE_URL is not configured');
  }
  
  if (!supabaseAnonKey || supabaseAnonKey.includes('your_') || supabaseAnonKey.includes('invalid')) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }
  
  // Validate URL format
  if (supabaseUrl && supabaseUrl !== 'https://invalid.localhost') {
    try {
      const url = new URL(supabaseUrl);
      if (!url.hostname.includes('supabase')) {
        logger.warn('VITE_SUPABASE_URL does not appear to be a Supabase URL', { supabaseUrl });
      }
    } catch (error) {
      errors.push('VITE_SUPABASE_URL is not a valid URL');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates authentication configuration
 * @returns {Object} { valid: boolean, warnings: string[], criticalErrors: string[] }
 */
export function validateAuthConfig() {
  const criticalErrors = [];
  const warnings = [];
  
  // Check Supabase (required)
  const supabaseValidation = validateSupabaseConfig();
  if (!supabaseValidation.valid) {
    criticalErrors.push(...supabaseValidation.errors);
  }
  
  // Check Telegram (optional but recommended)
  const telegramBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  if (!telegramBotUsername) {
    warnings.push('VITE_TELEGRAM_BOT_USERNAME is not configured - Telegram login will not work');
  }
  
  return {
    valid: criticalErrors.length === 0,
    warnings,
    criticalErrors
  };
}

/**
 * Logs validation results with appropriate severity
 * @param {Object} validation - Result from validateAuthConfig()
 */
export function logValidationResults(validation) {
  if (validation.criticalErrors.length > 0) {
    logger.error('Critical authentication configuration errors detected:', {
      errors: validation.criticalErrors
    });
  }
  
  if (validation.warnings.length > 0) {
    logger.warn('Authentication configuration warnings:', {
      warnings: validation.warnings
    });
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    logger.info('Authentication configuration validated successfully');
  }
}

/**
 * Shows user-friendly error message for configuration issues
 * @param {Object} validation - Result from validateAuthConfig()
 * @returns {string|null} Error message to display, or null if valid
 */
export function getConfigErrorMessage(validation) {
  if (!validation.valid) {
    return 'Authentication is not properly configured. Please check your environment variables.';
  }
  return null;
}

/**
 * Validates configuration on app startup and logs results
 * Call this once when the app initializes
 */
export function validateConfigOnStartup() {
  const validation = validateAuthConfig();
  logValidationResults(validation);
  return validation;
}
