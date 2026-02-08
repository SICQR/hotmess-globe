/**
 * Legacy URL Redirects
 * 
 * Converts old page routes to new sheet-based URLs
 * This enables deep linking: /events/abc123 → /?sheet=event&id=abc123
 */

import { SHEET_TYPES } from '@/contexts/SheetContext';

// Map legacy routes to sheet types
export const LEGACY_ROUTE_MAP = {
  // Profile
  '/profile': { sheet: SHEET_TYPES.PROFILE },
  
  // Social / Ghosted
  '/social': { sheet: SHEET_TYPES.GHOSTED },
  '/right-now': { sheet: SHEET_TYPES.GHOSTED },
  '/ghosted': { sheet: SHEET_TYPES.GHOSTED },
  
  // Messages
  '/social/inbox': { sheet: SHEET_TYPES.CHAT },
  '/messages': { sheet: SHEET_TYPES.CHAT },
  '/inbox': { sheet: SHEET_TYPES.CHAT },
  
  // Shop / Market
  '/market': { sheet: SHEET_TYPES.SHOP },
  '/shop': { sheet: SHEET_TYPES.SHOP },
  
  // Vault
  '/vault': { sheet: SHEET_TYPES.VAULT },
  '/purchases': { sheet: SHEET_TYPES.VAULT },
  '/orders': { sheet: SHEET_TYPES.VAULT },
};

// Dynamic route patterns (with params)
export const DYNAMIC_ROUTE_PATTERNS = [
  {
    pattern: /^\/events\/(.+)$/,
    sheet: SHEET_TYPES.EVENT,
    getParams: (match) => ({ id: decodeURIComponent(match[1]) }),
  },
  {
    pattern: /^\/profile\?email=(.+)$/,
    sheet: SHEET_TYPES.PROFILE,
    getParams: (match) => ({ email: decodeURIComponent(match[1]) }),
  },
  {
    pattern: /^\/social\/t\/(.+)$/,
    sheet: SHEET_TYPES.CHAT,
    getParams: (match) => ({ thread: match[1] }),
  },
  {
    pattern: /^\/market\/p\/(.+)$/,
    sheet: SHEET_TYPES.SHOP,
    getParams: (match) => ({ handle: match[1] }),
  },
  {
    pattern: /^\/market\/product\/(.+)$/,
    sheet: SHEET_TYPES.SHOP,
    getParams: (match) => ({ handle: match[1] }),
  },
];

/**
 * Convert a legacy URL to a sheet-based URL
 * 
 * @param {string} url - The legacy URL
 * @returns {{ sheet: string, params: object } | null} - Sheet config or null if not a legacy route
 */
export function getLegacyRedirect(url) {
  if (!url) return null;
  
  // Parse URL
  const [path, queryString] = url.split('?');
  const searchParams = new URLSearchParams(queryString || '');
  
  // Check static routes first
  if (LEGACY_ROUTE_MAP[path]) {
    const { sheet } = LEGACY_ROUTE_MAP[path];
    const params = {};
    
    // Extract params from query string
    if (sheet === SHEET_TYPES.PROFILE && searchParams.has('email')) {
      params.email = searchParams.get('email');
    }
    
    return { sheet, params };
  }
  
  // Check dynamic routes
  for (const { pattern, sheet, getParams } of DYNAMIC_ROUTE_PATTERNS) {
    const match = path.match(pattern);
    if (match) {
      return { sheet, params: getParams(match) };
    }
  }
  
  // Also check full URL for patterns like /profile?email=x
  const fullUrl = url;
  for (const { pattern, sheet, getParams } of DYNAMIC_ROUTE_PATTERNS) {
    const match = fullUrl.match(pattern);
    if (match) {
      return { sheet, params: getParams(match) };
    }
  }
  
  return null;
}

/**
 * Build a sheet URL from sheet type and params
 * 
 * @param {string} sheetType - SHEET_TYPES value
 * @param {object} params - Sheet props
 * @returns {string} - URL like /?sheet=event&id=abc123
 */
export function buildSheetUrl(sheetType, params = {}) {
  const url = new URLSearchParams();
  url.set('sheet', sheetType);
  
  // Add all params
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      url.set(key, String(value));
    }
  }
  
  return `/?${url.toString()}`;
}

/**
 * Parse sheet params from current URL
 * 
 * @returns {{ sheet: string | null, params: object }}
 */
export function parseSheetUrl() {
  if (typeof window === 'undefined') return { sheet: null, params: {} };
  
  const url = new URL(window.location.href);
  const sheet = url.searchParams.get('sheet');
  
  if (!sheet) return { sheet: null, params: {} };
  
  const params = {};
  url.searchParams.forEach((value, key) => {
    if (key !== 'sheet') {
      params[key] = value;
    }
  });
  
  return { sheet, params };
}

/**
 * Hook-compatible function to check and handle legacy redirects
 * Call this in App.jsx or a route guard
 * 
 * @param {object} navigate - React Router navigate function
 * @param {function} openSheet - SheetContext openSheet function
 * @returns {boolean} - True if redirect was handled
 */
export function handleLegacyRedirect(navigate, openSheet) {
  if (typeof window === 'undefined') return false;
  
  const path = window.location.pathname + window.location.search;
  const redirect = getLegacyRedirect(path);
  
  if (redirect && openSheet) {
    // Navigate to home and open sheet
    navigate('/', { replace: true });
    setTimeout(() => {
      openSheet(redirect.sheet, redirect.params);
    }, 100);
    return true;
  }
  
  return false;
}

export default {
  getLegacyRedirect,
  buildSheetUrl,
  parseSheetUrl,
  handleLegacyRedirect,
  LEGACY_ROUTE_MAP,
  DYNAMIC_ROUTE_PATTERNS,
};
