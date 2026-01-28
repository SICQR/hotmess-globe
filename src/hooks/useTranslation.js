import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPreferredLanguage,
  setLanguage as setStoredLanguage,
  loadTranslations,
  translate,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  isRTL,
  SUPPORTED_LANGUAGES,
} from '@/i18n/config';

/**
 * Custom hook for internationalization
 * 
 * @returns {Object} Translation utilities
 * @property {function} t - Translation function: t('key') or t('key', { param: value })
 * @property {string} lang - Current language code
 * @property {function} setLang - Function to change language
 * @property {boolean} isLoading - Whether translations are loading
 * @property {boolean} isRTL - Whether current language is RTL
 * @property {function} formatNumber - Locale-aware number formatter
 * @property {function} formatCurrency - Locale-aware currency formatter  
 * @property {function} formatDate - Locale-aware date formatter
 * @property {function} formatRelativeTime - Relative time formatter (e.g., "2 hours ago")
 * @property {Array} supportedLanguages - List of supported languages
 * 
 * @example
 * const { t, lang, setLang, formatDate } = useTranslation();
 * 
 * // Simple translation
 * <h1>{t('common.loading')}</h1>
 * 
 * // With parameters
 * <p>{t('profile.joined', { date: '2024' })}</p>
 * 
 * // Change language
 * setLang('es');
 * 
 * // Format date
 * <span>{formatDate(new Date())}</span>
 */
export function useTranslation() {
  const [lang, setLang] = useState(getPreferredLanguage);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadTranslations(lang)
      .then((data) => {
        if (!cancelled) {
          setTranslations(data);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load translations:', error);
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Translation function
  const t = useCallback(
    (key, params = {}) => {
      if (isLoading) {
        // Return the key while loading to prevent flashing
        return key;
      }
      return translate(key, translations, params);
    },
    [translations, isLoading]
  );

  // Language setter that updates both state and storage
  const handleSetLang = useCallback((newLang) => {
    if (setStoredLanguage(newLang)) {
      setLang(newLang);
    }
  }, []);

  // Memoized formatters bound to current language
  const boundFormatNumber = useCallback(
    (number, options) => formatNumber(number, lang, options),
    [lang]
  );

  const boundFormatCurrency = useCallback(
    (amount, currency) => formatCurrency(amount, lang, currency),
    [lang]
  );

  const boundFormatDate = useCallback(
    (date, options) => formatDate(date, lang, options),
    [lang]
  );

  const boundFormatRelativeTime = useCallback(
    (date) => formatRelativeTime(date, lang),
    [lang]
  );

  const rtl = useMemo(() => isRTL(lang), [lang]);

  return {
    t,
    lang,
    setLang: handleSetLang,
    isLoading,
    isRTL: rtl,
    formatNumber: boundFormatNumber,
    formatCurrency: boundFormatCurrency,
    formatDate: boundFormatDate,
    formatRelativeTime: boundFormatRelativeTime,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

export default useTranslation;
