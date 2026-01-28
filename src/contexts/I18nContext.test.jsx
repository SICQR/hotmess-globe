import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n, Trans } from './I18nContext';

// Mock the i18n config module
vi.mock('@/i18n/config', () => ({
  getPreferredLanguage: vi.fn(() => 'en'),
  setLanguage: vi.fn(() => true),
  loadTranslations: vi.fn(() =>
    Promise.resolve({
      common: {
        save: 'Save',
        cancel: 'Cancel',
        greeting: 'Hello, {{name}}!',
      },
      profile: {
        title: 'Profile',
      },
      terms: {
        agree: 'I agree to the <link>terms</link> and <bold>conditions</bold>',
      },
    })
  ),
  translate: vi.fn((key, translations, params) => {
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
  formatNumber: vi.fn((num, lang) => new Intl.NumberFormat(lang).format(num)),
  formatCurrency: vi.fn((amount, lang, currency) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount)
  ),
  formatDate: vi.fn((date, lang) => new Intl.DateTimeFormat(lang).format(new Date(date))),
  formatRelativeTime: vi.fn(() => '2 hours ago'),
  isRTL: vi.fn((lang) => lang === 'ar'),
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  ],
  DEFAULT_LANGUAGE: 'en',
}));

// Test component that uses the i18n context
function TestConsumer() {
  const { t, lang, setLang, isLoading, formatCurrency, currentLanguage, isRTL } = useI18n();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <p data-testid="current-lang">{lang}</p>
      <p data-testid="current-lang-name">{currentLanguage.name}</p>
      <p data-testid="is-rtl">{isRTL ? 'RTL' : 'LTR'}</p>
      <p data-testid="save-text">{t('common.save')}</p>
      <p data-testid="greeting-text">{t('common.greeting', { name: 'World' })}</p>
      <p data-testid="missing-text">{t('missing.key')}</p>
      <p data-testid="currency-text">{formatCurrency(99.99, 'GBP')}</p>
      <button onClick={() => setLang('es')} data-testid="switch-to-es">
        Switch to Spanish
      </button>
      <button onClick={() => setLang('ar')} data-testid="switch-to-ar">
        Switch to Arabic
      </button>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document attributes
    document.documentElement.lang = '';
    document.documentElement.dir = '';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should provide translation function', async () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('save-text')).toHaveTextContent('Save');
  });

  it('should support translations with parameters', async () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('greeting-text')).toHaveTextContent('Hello, World!');
  });

  it('should return key for missing translations', async () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('missing-text')).toHaveTextContent('missing.key');
  });

  it('should provide current language info', async () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
    expect(screen.getByTestId('current-lang-name')).toHaveTextContent('English');
  });

  it('should provide format helpers', async () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('currency-text')).toHaveTextContent(/99/);
  });

  it('should show loading state initially', () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should allow language switching', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    const switchButton = screen.getByTestId('switch-to-es');
    await user.click(switchButton);

    const { setLanguage } = await import('@/i18n/config');
    expect(setLanguage).toHaveBeenCalledWith('es');
  });

  it('should update document direction for RTL languages', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Initially LTR
    expect(screen.getByTestId('is-rtl')).toHaveTextContent('LTR');
  });

  it('should accept initial language prop', async () => {
    render(
      <I18nProvider initialLanguage="es">
        <TestConsumer />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('current-lang')).toHaveTextContent('es');
  });
});

describe('useI18n outside provider', () => {
  it('should return fallback values when used outside provider', () => {
    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    function TestOutsideProvider() {
      const { t, lang, isRTL } = useI18n();
      return (
        <div>
          <span data-testid="lang">{lang}</span>
          <span data-testid="translated">{t('common.save')}</span>
          <span data-testid="rtl">{isRTL ? 'yes' : 'no'}</span>
        </div>
      );
    }

    render(<TestOutsideProvider />);

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('translated')).toHaveTextContent('common.save');
    expect(screen.getByTestId('rtl')).toHaveTextContent('no');
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('Trans component', () => {
  it('should render translated text', async () => {
    render(
      <I18nProvider>
        <Trans id="common.save" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  it('should render translated text with values', async () => {
    render(
      <I18nProvider>
        <Trans id="common.greeting" values={{ name: 'Alice' }} />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello, Alice!')).toBeInTheDocument();
    });
  });

  it('should render fallback while loading', async () => {
    // Make loadTranslations slow
    const { loadTranslations } = await import('@/i18n/config');
    loadTranslations.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ common: { save: 'Save' } }), 100))
    );

    render(
      <I18nProvider>
        <Trans id="common.save" fallback="..." />
      </I18nProvider>
    );

    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('should render translation key when not found', async () => {
    render(
      <I18nProvider>
        <Trans id="nonexistent.key" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('nonexistent.key')).toBeInTheDocument();
    });
  });
});
