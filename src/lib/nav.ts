/**
 * Navigation Contract
 * 
 * Single entry point for all navigation in HOTMESS.
 * Replaces direct window.location.href assignments with router navigation.
 * Respects overlay-pop-first rule for back navigation.
 */

import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import { createPageUrl } from '@/utils';

/**
 * Navigation hook that wraps React Router with HOTMESS conventions.
 * 
 * Usage:
 *   const { go, goBack, goHome } = useNav();
 *   go('/profile');           // Navigate to path
 *   go('Profile');            // Navigate to page by name
 *   goBack();                 // Go back (respects overlay stack)
 *   goHome();                 // Navigate to home
 */
export function useNav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * Navigate to a path or page name.
   * If path doesn't start with '/', treats it as a page name and uses createPageUrl.
   */
  const go = useCallback((
    pathOrPageName: string, 
    options?: { 
      replace?: boolean;
      state?: unknown;
      query?: Record<string, string>;
    }
  ) => {
    let path = pathOrPageName;
    
    // If it doesn't start with '/', treat as page name
    if (!pathOrPageName.startsWith('/')) {
      path = createPageUrl(pathOrPageName);
    }
    
    // Add query params if provided
    if (options?.query) {
      const params = new URLSearchParams(options.query);
      path = `${path}?${params.toString()}`;
    }
    
    navigate(path, { 
      replace: options?.replace,
      state: options?.state,
    });
  }, [navigate]);
  
  /**
   * Navigate back.
   * NOTE: If sheets are open, SheetContext should handle closing them first.
   * This is just the router-level back.
   */
  const goBack = useCallback(() => {
    // Check if we have history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to home if no history
      navigate('/');
    }
  }, [navigate]);
  
  /**
   * Navigate to home page
   */
  const goHome = useCallback((options?: { replace?: boolean }) => {
    navigate('/', options);
  }, [navigate]);
  
  /**
   * Navigate to auth page with optional return URL
   */
  const goAuth = useCallback((returnUrl?: string) => {
    const next = returnUrl || location.pathname + location.search;
    navigate(`/auth?next=${encodeURIComponent(next)}`);
  }, [navigate, location]);
  
  /**
   * Navigate to profile page/sheet
   */
  const goProfile = useCallback((options?: { 
    uid?: string; 
    email?: string;
    next?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.uid) params.set('uid', options.uid);
    if (options?.email) params.set('email', options.email);
    if (options?.next) params.set('next', options.next);
    
    const query = params.toString();
    navigate(createPageUrl('Profile') + (query ? `?${query}` : ''));
  }, [navigate]);
  
  /**
   * Set a query parameter without navigation
   */
  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(location.search);
    params.set(key, value);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [navigate, location]);
  
  /**
   * Clear a query parameter without navigation
   */
  const clearParam = useCallback((key: string) => {
    const params = new URLSearchParams(location.search);
    params.delete(key);
    const query = params.toString();
    navigate(location.pathname + (query ? `?${query}` : ''), { replace: true });
  }, [navigate, location]);
  
  return {
    go,
    goBack,
    goHome,
    goAuth,
    goProfile,
    setParam,
    clearParam,
    // Expose current location for convenience
    pathname: location.pathname,
    search: location.search,
  };
}

/**
 * Type-safe page names for go() function
 */
export type PageName = 
  | 'Home'
  | 'Auth'
  | 'Profile'
  | 'EditProfile'
  | 'Settings'
  | 'Pulse'
  | 'Events'
  | 'Social'
  | 'Messages'
  | 'Music'
  | 'Radio'
  | 'RadioSchedule'
  | 'More'
  | 'Safety'
  | 'Beacons'
  | 'CreateBeacon'
  | 'EditBeacon'
  | 'Bookmarks'
  | 'Calendar'
  | 'Scan'
  | 'Community'
  | 'Leaderboard'
  | 'OnboardingGate'
  | 'AgeGate'
  | 'AccountConsents'
  | 'MembershipUpgrade'
  | 'Pricing'
  | 'Marketplace'
  | 'ProductDetail'
  | 'OrderHistory'
  | 'AdminDashboard';

export default useNav;
