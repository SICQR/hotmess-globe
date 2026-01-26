/**
 * Internationalization (i18n) Configuration
 * 
 * Multi-language support for HOTMESS
 */

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
];

// Default language
export const DEFAULT_LANGUAGE = 'en';

// RTL languages
export const RTL_LANGUAGES = ['ar', 'he', 'fa'];

// Storage key for language preference
const LANGUAGE_KEY = 'hotmess_language';

// Translation cache
const translationCache = new Map();

/**
 * Get user's preferred language
 */
export function getPreferredLanguage() {
  // Check stored preference
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
    return stored;
  }
  
  // Check browser language
  const browserLang = navigator.language?.split('-')[0];
  if (SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
    return browserLang;
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Set language preference
 */
export function setLanguage(langCode) {
  if (!SUPPORTED_LANGUAGES.some(l => l.code === langCode)) {
    console.warn(`Language ${langCode} is not supported`);
    return false;
  }
  
  localStorage.setItem(LANGUAGE_KEY, langCode);
  document.documentElement.lang = langCode;
  document.documentElement.dir = RTL_LANGUAGES.includes(langCode) ? 'rtl' : 'ltr';
  
  return true;
}

/**
 * Load translations for a language
 */
export async function loadTranslations(langCode) {
  if (translationCache.has(langCode)) {
    return translationCache.get(langCode);
  }
  
  try {
    const translations = await import(`./locales/${langCode}.json`);
    translationCache.set(langCode, translations.default);
    return translations.default;
  } catch (error) {
    console.warn(`Failed to load translations for ${langCode}:`, error);
    
    // Fallback to English
    if (langCode !== DEFAULT_LANGUAGE) {
      return loadTranslations(DEFAULT_LANGUAGE);
    }
    
    return {};
  }
}

/**
 * Translate a key
 */
export function translate(key, translations, params = {}) {
  // Get the translation string
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Key not found, return the key itself
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Replace parameters
  return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
    return params[param] !== undefined ? params[param] : match;
  });
}

/**
 * Format number according to locale
 */
export function formatNumber(number, langCode, options = {}) {
  try {
    return new Intl.NumberFormat(langCode, options).format(number);
  } catch {
    return number.toString();
  }
}

/**
 * Format currency according to locale
 */
export function formatCurrency(amount, langCode, currency = 'GBP') {
  try {
    return new Intl.NumberFormat(langCode, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/**
 * Format date according to locale
 */
export function formatDate(date, langCode, options = {}) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(langCode, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options,
    }).format(dateObj);
  } catch {
    return date.toString();
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date, langCode) {
  try {
    const rtf = new Intl.RelativeTimeFormat(langCode, { numeric: 'auto' });
    const dateObj = date instanceof Date ? date : new Date(date);
    const diff = dateObj.getTime() - Date.now();
    const diffInSeconds = diff / 1000;
    const diffInMinutes = diffInSeconds / 60;
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;
    
    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(Math.round(diffInSeconds), 'second');
    }
    if (Math.abs(diffInMinutes) < 60) {
      return rtf.format(Math.round(diffInMinutes), 'minute');
    }
    if (Math.abs(diffInHours) < 24) {
      return rtf.format(Math.round(diffInHours), 'hour');
    }
    if (Math.abs(diffInDays) < 30) {
      return rtf.format(Math.round(diffInDays), 'day');
    }
    
    return formatDate(date, langCode, { dateStyle: 'medium' });
  } catch {
    return date.toString();
  }
}

/**
 * Check if language is RTL
 */
export function isRTL(langCode) {
  return RTL_LANGUAGES.includes(langCode);
}

export default {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  RTL_LANGUAGES,
  getPreferredLanguage,
  setLanguage,
  loadTranslations,
  translate,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  isRTL,
};
