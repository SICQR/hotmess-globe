import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTranslation } from './useTranslation';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.language
Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  configurable: true,
});

// Mock the i18n config module
vi.mock('@/i18n/config', () => ({
  getPreferredLanguage: vi.fn(() => 'en'),
  setLanguage: vi.fn(() => true),
  loadTranslations: vi.fn(() =>
    Promise.resolve({
      common: {
        save: 'Save',
        cancel: 'Cancel',
        loading: 'Loading...',
      },
      profile: {
        joined: 'Joined {{date}}',
      },
    })
  ),
  translate: vi.fn((key, translations, params) => {
    // Simple implementation for testing
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
  formatNumber: vi.fn((num, lang, options) => new Intl.NumberFormat(lang, options).format(num)),
  formatCurrency: vi.fn((amount, lang, currency) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount)
  ),
  formatDate: vi.fn((date, lang, options) => new Intl.DateTimeFormat(lang, options).format(new Date(date))),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  ],
  DEFAULT_LANGUAGE: 'en',
}));

describe('useTranslation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return default language', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.lang).toBe('en');
  });

  it('should load translations', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.translations).toHaveProperty('common');
    expect(result.current.translations.common.save).toBe('Save');
  });

  it('should provide translate function', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const translated = result.current.t('common.save');
    expect(translated).toBe('Save');
  });

  it('should support translation with parameters', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const translated = result.current.t('profile.joined', { date: '2024' });
    expect(translated).toBe('Joined 2024');
  });

  it('should return key for missing translations', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const translated = result.current.t('missing.key');
    expect(translated).toBe('missing.key');
  });

  it('should provide setLang function', async () => {
    const { result } = renderHook(() => useTranslation());

    expect(typeof result.current.setLang).toBe('function');
  });

  it('should provide supported languages', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.supportedLanguages).toHaveLength(3);
    expect(result.current.supportedLanguages[0].code).toBe('en');
  });

  it('should provide current language info', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.currentLanguage).toEqual({
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
    });
  });

  it('should provide format helpers', () => {
    const { result } = renderHook(() => useTranslation());

    expect(typeof result.current.formatNumber).toBe('function');
    expect(typeof result.current.formatCurrency).toBe('function');
    expect(typeof result.current.formatDate).toBe('function');
    expect(typeof result.current.formatRelativeTime).toBe('function');
  });

  it('should format numbers correctly', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatNumber(1234.56);
    expect(formatted).toMatch(/1[,.]234[,.]56/);
  });

  it('should format currency correctly', async () => {
    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const formatted = result.current.formatCurrency(99.99, 'GBP');
    expect(formatted).toContain('99');
  });
});

describe('useTranslation language change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should change language when setLang is called', async () => {
    const { setLanguage } = await import('@/i18n/config');
    setLanguage.mockReturnValue(true);

    const { result } = renderHook(() => useTranslation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setLang('es');
    });

    expect(setLanguage).toHaveBeenCalledWith('es');
  });
});
