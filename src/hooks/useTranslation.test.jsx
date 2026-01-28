import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTranslation } from './useTranslation';

// Mock the i18n config module
vi.mock('@/i18n/config', () => ({
  getPreferredLanguage: vi.fn(() => 'en'),
  setLanguage: vi.fn((lang) => {
    const supported = ['en', 'es', 'fr', 'de', 'pt', 'it'];
    return supported.includes(lang);
  }),
  loadTranslations: vi.fn(async (lang) => {
    const translations = {
      en: {
        common: {
          loading: 'Loading...',
          error: 'Something went wrong',
          save: 'Save',
        },
        greeting: 'Hello, {{name}}!',
      },
      es: {
        common: {
          loading: 'Cargando...',
          error: 'Algo salió mal',
          save: 'Guardar',
        },
        greeting: '¡Hola, {{name}}!',
      },
    };
    return translations[lang] || translations.en;
  }),
  translate: vi.fn((key, translations, params = {}) => {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }),
  formatNumber: vi.fn((number, lang) => {
    return new Intl.NumberFormat(lang).format(number);
  }),
  formatCurrency: vi.fn((amount, lang, currency = 'GBP') => {
    return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount);
  }),
  formatDate: vi.fn((date, lang) => {
    return new Intl.DateTimeFormat(lang).format(new Date(date));
  }),
  formatRelativeTime: vi.fn((date, lang) => {
    return 'just now';
  }),
  isRTL: vi.fn((lang) => ['ar', 'he'].includes(lang)),
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  ],
}));

describe('useTranslation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('initializes with default language', async () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.lang).toBe('en');
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('translates simple keys', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.t('common.loading')).toBe('Loading...');
    expect(result.current.t('common.save')).toBe('Save');
  });

  it('translates keys with parameters', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const translated = result.current.t('greeting', { name: 'John' });
    expect(translated).toBe('Hello, John!');
  });

  it('returns key for missing translations', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.t('non.existent.key')).toBe('non.existent.key');
  });

  it('changes language', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setLang('es');
    });

    expect(result.current.lang).toBe('es');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.t('common.loading')).toBe('Cargando...');
    expect(result.current.t('greeting', { name: 'Juan' })).toBe('¡Hola, Juan!');
  });

  it('provides formatNumber function', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatNumber(1234567.89);
    expect(formatted).toBeTruthy();
  });

  it('provides formatCurrency function', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatCurrency(99.99, 'GBP');
    expect(formatted).toBeTruthy();
  });

  it('provides formatDate function', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatDate(new Date('2024-01-15'));
    expect(formatted).toBeTruthy();
  });

  it('provides formatRelativeTime function', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatRelativeTime(new Date());
    expect(formatted).toBe('just now');
  });

  it('returns isRTL for RTL languages', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isRTL).toBe(false); // English is LTR
  });

  it('provides supportedLanguages', async () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.supportedLanguages).toHaveLength(6);
    expect(result.current.supportedLanguages[0]).toEqual({
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
    });
  });

  it('does not change language for unsupported language', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setLang('xx'); // Unsupported
    });

    // Should remain unchanged
    expect(result.current.lang).toBe('en');
  });
});
