import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

/**
 * Login.jsx - Redirect to unified Auth flow
 * 
 * This page now redirects to the unified Auth flow to ensure:
 * - Consistent onboarding experience
 * - Username/profile checks are enforced
 * - All gate checks (consent, terms, username) are applied
 */

function useReturnUrl() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const returnUrl = params.get('returnUrl') || params.get('next') || '/';

    // Only allow same-origin relative paths; fall back to '/' otherwise.
    if (typeof returnUrl === 'string' && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
      return returnUrl;
    }

    return '/';
  }, [location.search]);
}

export default function Login() {
  const navigate = useNavigate();
  const returnUrl = useReturnUrl();

  useEffect(() => {
    // Redirect to Auth page with return URL preserved
    // Auth page handles login, signup, and all onboarding flows
    const authUrl = createPageUrl('Auth') + `?mode=login&next=${encodeURIComponent(returnUrl)}`;
    navigate(authUrl, { replace: true });
  }, [navigate, returnUrl]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#E62020]/30 border-t-[#E62020] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm uppercase tracking-wider">Redirecting to login...</p>
      </div>
    </div>
  );
}
