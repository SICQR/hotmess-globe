import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
} from './config';

/**
 * I18n Context
 * Provides translation utilities throughout the app
 */
const I18nContext = createContext(null);

/**
 * I18n Provider Component
 * Wraps the app to provide translation context
 * 
 * @example
 * // In App.jsx or main.jsx
 * import { I18nProvider } from '@/i18n/I18nProvider';
 * 
 * function App() {
 *   return (
 *     <I18nProvider>
 *       <YourApp />
 *     </I18nProvider>
 *   );
 * }
 */
export function I18nProvider({ children, defaultLanguage }) {
  const [lang, setLang] = useState(() => defaultLanguage || getPreferredLanguage());
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
      if (isLoading || !translations || Object.keys(translations).length === 0) {
        // Return the key while loading
        return key;
      }
      return translate(key, translations, params);
    },
    [translations, isLoading]
  );

  // Language setter
  const handleSetLang = useCallback((newLang) => {
    if (setStoredLanguage(newLang)) {
      setLang(newLang);
    }
  }, []);

  // Memoized formatters
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

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
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
    }),
    [
      t,
      lang,
      handleSetLang,
      isLoading,
      rtl,
      boundFormatNumber,
      boundFormatCurrency,
      boundFormatDate,
      boundFormatRelativeTime,
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access the i18n context
 * Must be used within an I18nProvider
 * 
 * @returns {Object} Translation utilities from context
 * @throws {Error} If used outside of I18nProvider
 * 
 * @example
 * function MyComponent() {
 *   const { t, formatCurrency } = useI18n();
 *   return <span>{t('common.price')}: {formatCurrency(99.99)}</span>;
 * }
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * HOC to inject i18n props into class components
 * 
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component with i18n props
 * 
 * @example
 * class MyClassComponent extends React.Component {
 *   render() {
 *     const { t, lang } = this.props;
 *     return <h1>{t('common.hello')}</h1>;
 *   }
 * }
 * export default withI18n(MyClassComponent);
 */
export function withI18n(Component) {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props) => {
    const i18n = useI18n();
    return <Component {...props} {...i18n} />;
  };

  WrappedComponent.displayName = `withI18n(${displayName})`;
  return WrappedComponent;
}

/**
 * Trans component for inline translations with JSX
 * 
 * @example
 * <Trans i18nKey="welcome.message" values={{ name: 'John' }}>
 *   Welcome, <strong>{{name}}</strong>!
 * </Trans>
 */
export function Trans({ i18nKey, values = {}, children }) {
  const { t } = useI18n();
  const translation = t(i18nKey, values);
  
  // If translation equals the key, render children as fallback
  if (translation === i18nKey && children) {
    return children;
  }
  
  return translation;
}

export default I18nProvider;
