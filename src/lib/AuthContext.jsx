import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';
import { mergeGuestCartToUser } from '@/components/marketplace/cartStorage';
import { validateConfigOnStartup } from '@/utils/envValidation';

const AuthContext = createContext();

let warnedMissingAuthProvider = false;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const mergedGuestCartRef = React.useRef(false);

  useEffect(() => {
    // Validate configuration on startup
    const validation = validateConfigOnStartup();
    if (!validation.valid) {
      setAuthError({
        type: 'config_error',
        message: 'Authentication is not properly configured. Please check environment variables.',
        details: validation.criticalErrors
      });
    }
    
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);

      // Supabase-only: there is no app-level public settings gate.
      // We only check whether a user session exists and load the current user.
      await checkUserAuth();
    } catch (error) {
      logger.error('Unexpected error in app state check', { error: error.message });
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        mergedGuestCartRef.current = false;
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser || null);
      setIsAuthenticated(!!currentUser);

      // Best-effort: if the user logs in while holding a creators guest cart,
      // merge it into the DB cart once per session.
      if (currentUser?.email && !mergedGuestCartRef.current) {
        mergedGuestCartRef.current = true;
        mergeGuestCartToUser({ currentUser }).catch((error) => {
          logger.warn('Guest cart merge failed (non-fatal)', { error: error?.message });
        });
      }

      setIsLoadingAuth(false);
    } catch (error) {
      logger.error('User auth check failed', { error: error.message, status: error.status });
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = useCallback((shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Supabase-backed logout supports optional redirect.
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    // Redirect to the app's Auth page.
    base44.auth.redirectToLogin(window.location.href);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  // In dev, Vite HMR can briefly load two module instances (two contexts),
  // which makes `useContext` return undefined even though an AuthProvider exists.
  // Do not hard-crash the whole app; fall back to an unauthenticated state.
  if (!context) {
    if (!warnedMissingAuthProvider) {
      warnedMissingAuthProvider = true;
      logger.warn('useAuth called without active AuthProvider; using fallback auth state');
    }

    return {
      user: null,
      isAuthenticated: false,
      isLoadingAuth: false,
      authError: { type: 'auth_required', message: 'Authentication required' },
      logout: () => base44.auth.logout(),
      navigateToLogin: () => base44.auth.redirectToLogin(window.location.href),
      checkAppState: async () => {},
    };
  }

  return context;
};
