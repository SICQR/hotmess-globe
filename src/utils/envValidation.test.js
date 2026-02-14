/**
 * Tests for environment validation utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock logger before importing envValidation
vi.mock('@/utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

// We'll need to use dynamic imports and vi.stubEnv
describe('Environment Validation', () => {
  let validateSupabaseConfig;
  let validateAuthConfig;
  let getConfigErrorMessage;
  let validateConfigOnStartup;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Re-import the module to get fresh functions
    const module = await import('./envValidation.js');
    validateSupabaseConfig = module.validateSupabaseConfig;
    validateAuthConfig = module.validateAuthConfig;
    getConfigErrorMessage = module.getConfigErrorMessage;
    validateConfigOnStartup = module.validateConfigOnStartup;
  });

  describe('validateSupabaseConfig', () => {
    it('should fail when VITE_SUPABASE_URL is not set', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      
      const result = validateSupabaseConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('VITE_SUPABASE_URL'))).toBe(true);
      
      vi.unstubAllEnvs();
    });

    it('should fail when VITE_SUPABASE_URL is invalid.localhost', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://invalid.localhost');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'valid-key');
      
      const result = validateSupabaseConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('VITE_SUPABASE_URL'))).toBe(true);
      
      vi.unstubAllEnvs();
    });

    it('should fail when VITE_SUPABASE_ANON_KEY is not set', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      
      const result = validateSupabaseConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('VITE_SUPABASE_ANON_KEY'))).toBe(true);
      
      vi.unstubAllEnvs();
    });

    it('should fail when VITE_SUPABASE_ANON_KEY contains placeholder text', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'your_anon_key');
      
      const result = validateSupabaseConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('VITE_SUPABASE_ANON_KEY'))).toBe(true);
      
      vi.unstubAllEnvs();
    });

    it('should pass with valid configuration', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'valid-anon-key-12345');
      
      const result = validateSupabaseConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      vi.unstubAllEnvs();
    });
  });

  describe('validateAuthConfig', () => {
    it('should include critical errors from Supabase validation', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      
      const result = validateAuthConfig();
      
      expect(result.valid).toBe(false);
      expect(result.criticalErrors.length).toBeGreaterThan(0);
      
      vi.unstubAllEnvs();
    });

    it('should warn when Telegram bot username is not configured', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'valid-key');
      vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', '');
      
      const result = validateAuthConfig();
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('VITE_TELEGRAM_BOT_USERNAME'))).toBe(true);
      
      vi.unstubAllEnvs();
    });

    it('should pass with complete configuration', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'valid-key');
      vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'test_bot');
      
      const result = validateAuthConfig();
      
      expect(result.valid).toBe(true);
      expect(result.criticalErrors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      
      vi.unstubAllEnvs();
    });
  });

  describe('getConfigErrorMessage', () => {
    it('should return error message when config is invalid', () => {
      const validation = {
        valid: false,
        criticalErrors: ['Test error'],
        warnings: []
      };
      
      const message = getConfigErrorMessage(validation);
      expect(message).toBe('Authentication is not properly configured. Please check your environment variables.');
    });

    it('should return null when config is valid', () => {
      const validation = {
        valid: true,
        criticalErrors: [],
        warnings: []
      };
      
      const message = getConfigErrorMessage(validation);
      expect(message).toBe(null);
    });
  });

  describe('validateConfigOnStartup', () => {
    it('should validate and return results', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'valid-key');
      
      const result = validateConfigOnStartup();
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('criticalErrors');
      
      vi.unstubAllEnvs();
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
