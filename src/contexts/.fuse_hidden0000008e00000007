import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPreferredLanguage,
  setLanguage as setLanguagePref,
  loadTranslations,
  translate,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isRTL,
} from '@/i18n/config';

/**
 * I18n Context
 * Provides translation and localization functionality app-wide
 */
const I18nContext = createContext(null);

/**
 * I18nProvider Component
 * 
 * Wraps the app to provide translation functionality to all components.
 * 
 * Usage:
 * <I18nProvider>
 *   <App />
 * </I18nProvider>
 * 
 * Then in any component:
 * const { t, setLang } = useI18n();
 */
export function I18nProvider({ children, initialLanguage }) {
  const [lang, setLangState] = useState(() => initialLanguage || getPreferredLanguage());
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadTranslations(lang)
      .then((trans) => {
        if (!cancelled) {
          setTranslations(trans);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('[I18nProvider] Failed to load translations:', error);
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Update document direction for RTL languages
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  // Change language function
  const setLang = useCallback((langCode) => {
    const success = setLanguagePref(langCode);
    if (success) {
      setLangState(langCode);
      // Emit custom event for components that need to react
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: langCode } }));
    }
    return success;
  }, []);

  // Translation function
  const t = useCallback(
    (key, params = {}) => {
      return translate(key, translations, params);
    },
    [translations]
  );

  // Format helpers bound to current language
  const formatNum = useCallback(
    (number, options) => formatNumber(number, lang, options),
    [lang]
  );

  const formatMoney = useCallback(
    (amount, currency) => formatCurrency(amount, lang, currency),
    [lang]
  );

  const formatDt = useCallback(
    (date, options) => formatDate(date, lang, options),
    [lang]
  );

  const formatRelative = useCallback(
    (date) => formatRelativeTime(date, lang),
    [lang]
  );

  // Get current language info
  const currentLanguage = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0],
    [lang]
  );

  // Context value
  const value = useMemo(
    () => ({
      // Core translation
      t,
      lang,
      setLang,
      isLoading,
      translations,

      // Language info
      currentLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      defaultLanguage: DEFAULT_LANGUAGE,
      isRTL: isRTL(lang),

      // Format helpers
      formatNumber: formatNum,
      formatCurrency: formatMoney,
      formatDate: formatDt,
      formatRelativeTime: formatRelative,
    }),
    [t, lang, setLang, isLoading, translations, currentLanguage, formatNum, formatMoney, formatDt, formatRelative]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * useI18n Hook
 * 
 * Use this hook in components to access translation functionality.
 * 
 * Usage:
 * const { t, lang, setLang, formatCurrency } = useI18n();
 * 
 * // Translate a key
 * <button>{t('common.save')}</button>
 * 
 * // With parameters
 * <p>{t('profile.joined', { date: '2024' })}</p>
 * 
 * // Format currency
 * <span>{formatCurrency(99.99)}</span>
 */
export function useI18n() {
  const context = useContext(I18nContext);
  
  if (!context) {
    // Return a fallback for components outside provider
    console.warn('[useI18n] Used outside I18nProvider, returning fallback');
    return {
      t: (key) => key,
      lang: DEFAULT_LANGUAGE,
      setLang: () => false,
      isLoading: false,
      translations: {},
      currentLanguage: SUPPORTED_LANGUAGES[0],
      supportedLanguages: SUPPORTED_LANGUAGES,
      defaultLanguage: DEFAULT_LANGUAGE,
      isRTL: false,
      formatNumber: (n) => String(n),
      formatCurrency: (n) => `£${n}`,
      formatDate: (d) => String(d),
      formatRelativeTime: (d) => String(d),
    };
  }
  
  return context;
}

/**
 * Trans Component
 * 
 * Declarative translation component with support for rich content.
 * 
 * Usage:
 * <Trans id="welcome.message" values={{ name: 'Alex' }} />
 * 
 * With components (for links, bold, etc.):
 * <Trans
 *   id="terms.agree"
 *   components={{
 *     link: <a href="/terms" />,
 *     bold: <strong />,
 *   }}
 * />
 */
export function Trans({ id, values = {}, components = {}, fallback }) {
  const { t, isLoading } = useI18n();
  
  if (isLoading && fallback) {
    return <>{fallback}</>;
  }
  
  const translated = t(id, values);
  
  // If no components, return plain text
  if (Object.keys(components).length === 0) {
    return <>{translated}</>;
  }
  
  // Replace component placeholders
  // Format: <link>text</link> or <bold>text</bold>
  let result = translated;
  const parts = [];
  let lastIndex = 0;
  
  // Simple component replacement
  for (const [key, component] of Object.entries(components)) {
    const openTag = `<${key}>`;
    const closeTag = `</${key}>`;
    const regex = new RegExp(`${openTag}(.*?)${closeTag}`, 'g');
    
    let match;
    while ((match = regex.exec(result)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(result.slice(lastIndex, match.index));
      }
      
      // Add the component with its content
      parts.push(
        React.cloneElement(component, { key: `${key}-${match.index}` }, match[1])
      );
      
      lastIndex = match.index + match[0].length;
    }
  }
  
  // Add remaining text
  if (lastIndex < result.length) {
    parts.push(result.slice(lastIndex));
  }
  
  return <>{parts.length > 0 ? parts : result}</>;
}

export default I18nProvider;
