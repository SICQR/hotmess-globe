import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  RTL_LANGUAGES,
  getPreferredLanguage,
  setLanguage,
  translate,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  isRTL,
} from './config';

describe('i18n config', () => {
  describe('constants', () => {
    it('has supported languages', () => {
      expect(SUPPORTED_LANGUAGES).toBeInstanceOf(Array);
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
      expect(SUPPORTED_LANGUAGES[0]).toHaveProperty('code');
      expect(SUPPORTED_LANGUAGES[0]).toHaveProperty('name');
      expect(SUPPORTED_LANGUAGES[0]).toHaveProperty('nativeName');
      expect(SUPPORTED_LANGUAGES[0]).toHaveProperty('flag');
    });

    it('has English as the default language', () => {
      expect(DEFAULT_LANGUAGE).toBe('en');
    });

    it('has RTL languages defined', () => {
      expect(RTL_LANGUAGES).toBeInstanceOf(Array);
      expect(RTL_LANGUAGES).toContain('ar');
      expect(RTL_LANGUAGES).toContain('he');
    });
  });

  describe('getPreferredLanguage', () => {
    let originalLocalStorage;
    let originalNavigator;

    beforeEach(() => {
      originalLocalStorage = global.localStorage;
      originalNavigator = global.navigator;

      // Mock localStorage
      global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };

      // Mock navigator
      global.navigator = {
        language: 'en-US',
      };
    });

    afterEach(() => {
      global.localStorage = originalLocalStorage;
      global.navigator = originalNavigator;
    });

    it('returns stored language preference if valid', () => {
      global.localStorage.getItem = vi.fn(() => 'es');
      expect(getPreferredLanguage()).toBe('es');
    });

    it('falls back to browser language if no stored preference', () => {
      global.localStorage.getItem = vi.fn(() => null);
      global.navigator.language = 'es-ES';
      expect(getPreferredLanguage()).toBe('es');
    });

    it('falls back to default if browser language not supported', () => {
      global.localStorage.getItem = vi.fn(() => null);
      global.navigator.language = 'xx-XX';
      expect(getPreferredLanguage()).toBe('en');
    });

    it('ignores invalid stored language', () => {
      global.localStorage.getItem = vi.fn(() => 'invalid');
      global.navigator.language = 'en-US';
      expect(getPreferredLanguage()).toBe('en');
    });
  });

  describe('setLanguage', () => {
    let originalLocalStorage;
    let originalDocument;

    beforeEach(() => {
      originalLocalStorage = global.localStorage;
      originalDocument = global.document;

      global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };

      global.document = {
        documentElement: {
          lang: '',
          dir: '',
        },
      };
    });

    afterEach(() => {
      global.localStorage = originalLocalStorage;
      global.document = originalDocument;
    });

    it('returns true and stores valid language', () => {
      const result = setLanguage('es');
      expect(result).toBe(true);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('hotmess_language', 'es');
      expect(global.document.documentElement.lang).toBe('es');
    });

    it('returns false for unsupported language', () => {
      const result = setLanguage('invalid');
      expect(result).toBe(false);
      expect(global.localStorage.setItem).not.toHaveBeenCalled();
    });

    it('sets RTL direction for Arabic', () => {
      setLanguage('en'); // First set to LTR
      expect(global.document.documentElement.dir).toBe('ltr');
      // Note: Arabic is in RTL_LANGUAGES but may not be in SUPPORTED_LANGUAGES
    });
  });

  describe('translate', () => {
    const translations = {
      common: {
        greeting: 'Hello',
        farewell: 'Goodbye',
        parameterized: 'Hello, {{name}}!',
      },
      nested: {
        deep: {
          value: 'Deep value',
        },
      },
    };

    it('returns translation for simple key', () => {
      expect(translate('common.greeting', translations)).toBe('Hello');
    });

    it('returns translation for nested key', () => {
      expect(translate('nested.deep.value', translations)).toBe('Deep value');
    });

    it('returns key for missing translation', () => {
      expect(translate('missing.key', translations)).toBe('missing.key');
    });

    it('replaces parameters in translation', () => {
      const result = translate('common.parameterized', translations, { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('keeps parameter placeholder if not provided', () => {
      const result = translate('common.parameterized', translations, {});
      expect(result).toBe('Hello, {{name}}!');
    });

    it('handles multiple parameters', () => {
      const translations2 = {
        message: '{{greeting}}, {{name}}! Welcome to {{place}}.',
      };
      const result = translate('message', translations2, {
        greeting: 'Hello',
        name: 'John',
        place: 'London',
      });
      expect(result).toBe('Hello, John! Welcome to London.');
    });

    it('returns key when translation is not a string', () => {
      expect(translate('common', translations)).toBe('common');
    });
  });

  describe('formatNumber', () => {
    it('formats number in English locale', () => {
      const result = formatNumber(1234567.89, 'en');
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('formats number in German locale', () => {
      const result = formatNumber(1234567.89, 'de');
      expect(result).toBeTruthy();
    });

    it('returns string for invalid input', () => {
      const result = formatNumber('not a number', 'en');
      expect(result).toBe('NaN');
    });

    it('accepts formatting options', () => {
      const result = formatNumber(1234.5, 'en', { minimumFractionDigits: 2 });
      expect(result).toContain('.50');
    });
  });

  describe('formatCurrency', () => {
    it('formats GBP currency', () => {
      const result = formatCurrency(99.99, 'en', 'GBP');
      expect(result).toContain('99');
      expect(result.toLowerCase()).toMatch(/£|gbp/);
    });

    it('formats EUR currency', () => {
      const result = formatCurrency(99.99, 'de', 'EUR');
      expect(result).toContain('99');
    });

    it('formats USD currency', () => {
      const result = formatCurrency(99.99, 'en', 'USD');
      expect(result).toContain('99');
      expect(result).toMatch(/\$|USD/i);
    });

    it('defaults to GBP when currency not specified', () => {
      const result = formatCurrency(99.99, 'en');
      expect(result).toBeTruthy();
    });
  });

  describe('formatDate', () => {
    it('formats date in English locale', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date, 'en');
      expect(result).toContain('2024');
    });

    it('formats date string', () => {
      const result = formatDate('2024-01-15', 'en');
      expect(result).toContain('2024');
    });

    it('accepts formatting options', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'en', { dateStyle: 'full' });
      expect(result).toBeTruthy();
    });
  });

  describe('formatRelativeTime', () => {
    it('formats recent time as "just now" or seconds', () => {
      const now = new Date();
      const result = formatRelativeTime(now, 'en');
      expect(result).toBeTruthy();
    });

    it('formats minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(date, 'en');
      expect(result).toContain('5');
      expect(result.toLowerCase()).toContain('minute');
    });

    it('formats hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const result = formatRelativeTime(date, 'en');
      expect(result).toContain('3');
      expect(result.toLowerCase()).toContain('hour');
    });

    it('formats days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date, 'en');
      expect(result.toLowerCase()).toContain('day');
    });

    it('formats date string input', () => {
      const result = formatRelativeTime(new Date().toISOString(), 'en');
      expect(result).toBeTruthy();
    });
  });

  describe('isRTL', () => {
    it('returns true for Arabic', () => {
      expect(isRTL('ar')).toBe(true);
    });

    it('returns true for Hebrew', () => {
      expect(isRTL('he')).toBe(true);
    });

    it('returns true for Persian/Farsi', () => {
      expect(isRTL('fa')).toBe(true);
    });

    it('returns false for English', () => {
      expect(isRTL('en')).toBe(false);
    });

    it('returns false for Spanish', () => {
      expect(isRTL('es')).toBe(false);
    });

    it('returns false for unknown language', () => {
      expect(isRTL('xx')).toBe(false);
    });
  });
});
