/**
 * useTranslation Hook
 * 
 * Provides translation utilities for components.
 * Works with the I18nProvider context or standalone.
 */

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import {
  getPreferredLanguage,
  setLanguage as setLanguagePref,
  loadTranslations,
  translate,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  isRTL,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from '@/i18n/config';

// Create context for i18n
export const I18nContext = createContext(null);

/**
 * I18nProvider - Wrap your app with this to provide translations
 */
export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language on mount
  useEffect(() => {
    const initLanguage = async () => {
      const preferredLang = getPreferredLanguage();
      setLanguageState(preferredLang);
      
      try {
        const loadedTranslations = await loadTranslations(preferredLang);
        setTranslations(loadedTranslations);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to empty translations
        setTranslations({});
      } finally {
        setIsLoading(false);
      }
    };
    
    initLanguage();
  }, []);

  // Function to change language
  const setLanguage = useCallback(async (langCode) => {
    if (setLanguagePref(langCode)) {
      setLanguageState(langCode);
      setIsLoading(true);
      
      try {
        const loadedTranslations = await loadTranslations(langCode);
        setTranslations(loadedTranslations);
      } catch (error) {
        console.error('Failed to load translations:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  // Translation function
  const t = useCallback((key, params = {}) => {
    return translate(key, translations, params);
  }, [translations]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    translations,
    isLoading,
    isRTL: isRTL(language),
    formatNumber: (number, options) => formatNumber(number, language, options),
    formatCurrency: (amount, currency) => formatCurrency(amount, language, currency),
    formatDate: (date, options) => formatDate(date, language, options),
    formatRelativeTime: (date) => formatRelativeTime(date, language),
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t, translations, isLoading]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * useTranslation Hook
 * 
 * Returns translation utilities. Can be used inside or outside I18nProvider.
 * When used outside, falls back to standalone mode.
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  
  // If context is available, use it
  if (context) {
    return context;
  }
  
  // Standalone mode (no provider)
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const preferredLang = getPreferredLanguage();
      setLanguageState(preferredLang);
      
      try {
        const loadedTranslations = await loadTranslations(preferredLang);
        setTranslations(loadedTranslations);
      } catch {
        setTranslations({});
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  const setLanguage = useCallback(async (langCode) => {
    if (setLanguagePref(langCode)) {
      setLanguageState(langCode);
      setIsLoading(true);
      
      try {
        const loadedTranslations = await loadTranslations(langCode);
        setTranslations(loadedTranslations);
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const t = useCallback((key, params = {}) => {
    return translate(key, translations, params);
  }, [translations]);

  return useMemo(() => ({
    language,
    setLanguage,
    t,
    translations,
    isLoading,
    isRTL: isRTL(language),
    formatNumber: (number, options) => formatNumber(number, language, options),
    formatCurrency: (amount, currency) => formatCurrency(amount, language, currency),
    formatDate: (date, options) => formatDate(date, language, options),
    formatRelativeTime: (date) => formatRelativeTime(date, language),
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t, translations, isLoading]);
}

export default useTranslation;
