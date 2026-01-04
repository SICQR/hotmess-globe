import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

async function loadUserProfile(supabaseUser) {
  if (!supabaseUser?.email) return null;

  // Ensure there is a profile row (many pages expect User-table fields like xp, consent flags, etc.)
  // Policies applied: self by auth_user_id (auth.uid()), with an email fallback for legacy rows.
  try {
    await supabase
      .from('User')
      .upsert(
        { email: supabaseUser.email, auth_user_id: supabaseUser.id },
        { onConflict: 'email' }
      );
  } catch {
    // Non-fatal during migration or when RLS blocks access.
  }

  // Prefer selecting by auth_user_id; fallback to email for legacy rows.
  try {
    const { data: byAuthId, error: byAuthIdError } = await supabase
      .from('User')
      .select('*')
      .eq('auth_user_id', supabaseUser.id)
      .maybeSingle();
    if (!byAuthIdError && byAuthId) return byAuthId;
  } catch {
    // Non-fatal.
  }

  let byEmail = null;
  try {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('email', supabaseUser.email)
      .maybeSingle();
    if (!error) byEmail = data ?? null;
  } catch {
    // Non-fatal.
  }

  // If we found a legacy row without auth_user_id, try to attach it.
  if (byEmail && !byEmail.auth_user_id) {
    try {
      await supabase
        .from('User')
        .update({ auth_user_id: supabaseUser.id })
        .eq('id', byEmail.id);

      const { data: byAuthIdAfter, error: byAuthIdAfterError } = await supabase
        .from('User')
        .select('*')
        .eq('auth_user_id', supabaseUser.id)
        .maybeSingle();
      if (!byAuthIdAfterError && byAuthIdAfter) return byAuthIdAfter;
    } catch {
      // Non-fatal.
    }
  }

  return byEmail ?? null;
}

function mergeAuthAndProfile(supabaseUser, profileRow) {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    ...(supabaseUser.user_metadata || {}),
    ...(profileRow || {}),
    __supabase_user: supabaseUser,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        setIsLoadingAuth(true);
        setAuthError(null);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const sessionUser = data?.session?.user ?? null;
        if (!sessionUser) {
          if (!isMounted) return;
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
          setIsLoadingAuth(false);
          return;
        }

        const profile = await loadUserProfile(sessionUser);
        if (!isMounted) return;
        setUser(mergeAuthAndProfile(sessionUser, profile));
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
      } catch (error) {
        console.error('Auth bootstrap failed:', error);
        if (!isMounted) return;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthError({ type: 'unknown', message: error?.message || 'Auth error' });
      }
    };

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const sessionUser = session?.user ?? null;
        if (!sessionUser) {
          if (!isMounted) return;
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
          setIsLoadingAuth(false);
          return;
        }

        setIsLoadingAuth(true);
        const profile = await loadUserProfile(sessionUser);
        if (!isMounted) return;
        setUser(mergeAuthAndProfile(sessionUser, profile));
        setIsAuthenticated(true);
        setAuthError(null);
        setIsLoadingAuth(false);
      } catch (error) {
        console.error('Auth state change handling failed:', error);
        if (!isMounted) return;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthError({ type: 'unknown', message: error?.message || 'Auth error' });
      }
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      supabase.auth.signOut().finally(() => {
        window.location.href = `/Login?returnUrl=${encodeURIComponent(window.location.href)}`;
      });
    } else {
      supabase.auth.signOut();
    }
  };

  const navigateToLogin = () => {
    window.location.href = `/Login?returnUrl=${encodeURIComponent(window.location.href)}`;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
