import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

/**
 * OAuth Callback Handler
 * 
 * This page handles OAuth redirects from providers (Google, etc.)
 * Supabase handles the token exchange automatically via the URL hash.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params (OAuth error)
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          logger.error('OAuth error from provider', { error: errorParam, description: errorDescription });
          setError(errorDescription || errorParam);
          setStatus('error');
          return;
        }

        // Supabase automatically handles the OAuth callback via URL hash
        // We just need to wait for the session to be established
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('Session error during OAuth callback', { error: sessionError.message });
          setError(sessionError.message);
          setStatus('error');
          return;
        }

        if (data?.session) {
          logger.info('OAuth callback successful, session established');
          setStatus('success');
          
          // Get the intended redirect URL from localStorage or default to home
          const redirectTo = localStorage.getItem('auth_redirect_to') || '/';
          localStorage.removeItem('auth_redirect_to');
          
          // Small delay to ensure session is properly set
          setTimeout(() => {
            navigate(redirectTo, { replace: true });
          }, 500);
        } else {
          // No session yet - Supabase may still be processing the hash
          // The onAuthStateChange listener in AuthContext will handle this
          logger.info('Waiting for session establishment...');
          
          // Set a timeout to check again
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData?.session) {
              const redirectTo = localStorage.getItem('auth_redirect_to') || '/';
              localStorage.removeItem('auth_redirect_to');
              navigate(redirectTo, { replace: true });
            } else {
              setError('Authentication timed out. Please try again.');
              setStatus('error');
            }
          }, 3000);
        }
      } catch (err) {
        logger.error('Unexpected error in OAuth callback', { error: err.message });
        setError('An unexpected error occurred. Please try again.');
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00FF66] mx-auto mb-4" />
            <p className="text-white text-lg">Completing sign in...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-[#00FF66] text-5xl mb-4">✓</div>
            <p className="text-white text-lg">Sign in successful! Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✕</div>
            <p className="text-white text-lg mb-2">Authentication failed</p>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="px-6 py-3 bg-[#00FF66] text-black font-semibold rounded-lg hover:bg-[#00cc52] transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
