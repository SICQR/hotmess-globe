import { useState, useEffect, useCallback, useMemo } from 'react';
import logger from '@/utils/logger';
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
} from '@/i18n/config';

/**
 * useTranslation Hook
 * 
 * Provides translation functionality for components.
 * 
 * Usage:
 * const { t, lang, setLang, isLoading } = useTranslation();
 * 
 * // Basic translation
 * t('common.save') // => "Save"
 * 
 * // With parameters
 * t('profile.joined', { date: '2024' }) // => "Joined 2024"
 * 
 * // Format helpers
 * formatNumber(1234.56) // => "1,234.56"
 * formatCurrency(99.99) // => "£99.99"
 * formatDate(new Date()) // => "Jan 28, 2026, 10:30 AM"
 */
export function useTranslation() {
  const [lang, setLangState] = useState(getPreferredLanguage);
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
        logger.error('[useTranslation] Failed to load translations:', error);
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Change language function
  const setLang = useCallback((langCode) => {
    const success = setLanguagePref(langCode);
    if (success) {
      setLangState(langCode);
    }
    return success;
  }, []);

  // Translation function with memoization
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

  return {
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
    
    // Format helpers
    formatNumber: formatNum,
    formatCurrency: formatMoney,
    formatDate: formatDt,
    formatRelativeTime: formatRelative,
  };
}

export default useTranslation;
