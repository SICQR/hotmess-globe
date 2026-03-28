import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

/**
 * OAuth / Magic Link Callback Handler
 *
 * After Supabase verifies the token:
 * - Returning user (onboarding_completed = true) → /ghosted
 * - New / incomplete user → /
 * - Bot/scraper hitting a stale link (400 error) → / gracefully
 *
 * The BootGuardContext will handle final routing from / anyway,
 * so /ghosted for returning users is an optimistic fast-path.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Gracefully handle bot/scraper 400s — wrong verification type, stale links etc.
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          logger.error('OAuth error from provider', { error: errorParam, description: errorDescription });
          // Invalid email verification type (bot hit) → silently redirect to /
          if (
            errorParam === 'access_denied' ||
            errorDescription?.includes('Invalid') ||
            errorDescription?.includes('expired')
          ) {
            navigate('/', { replace: true });
            return;
          }
          setError(errorDescription || errorParam);
          setStatus('error');
          return;
        }

        // Wait for Supabase to process the hash (magic link / OAuth token)
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('Session error during callback', { error: sessionError.message });
          setError(sessionError.message);
          setStatus('error');
          return;
        }

        if (data?.session?.user?.id) {
          setStatus('success');
          await routeAfterAuth(data.session.user.id, navigate);
          return;
        }

        // Retry once — hash may not be processed yet
        setTimeout(async () => {
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData?.session?.user?.id) {
            await routeAfterAuth(retryData.session.user.id, navigate);
          } else {
            setError('Authentication timed out. Please try again.');
            setStatus('error');
          }
        }, 2000);
      } catch (err) {
        logger.error('Unexpected error in callback', { error: err.message });
        // Fail gracefully — BootGuardContext will recover
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#050507' }}>
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <div
              className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: '#C8962C', borderTopColor: 'transparent' }}
            />
            <p className="text-white/60 text-sm">Signing you in…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-3xl mb-3">✓</div>
            <p className="text-white/60 text-sm">Done. Taking you in…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-3xl mb-3">✕</div>
            <p className="text-white text-base mb-1">Sign in failed</p>
            <p className="text-white/40 text-sm mb-6">{error}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ backgroundColor: '#C8962C', color: '#000' }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * After a successful auth, check onboarding_completed and route accordingly.
 * Returning user → /ghosted. New/incomplete user → /.
 */
async function routeAfterAuth(userId, navigate) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    if (profile?.onboarding_completed === true) {
      navigate('/ghosted', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  } catch {
    // DB unavailable — BootGuardContext will recover from /
    navigate('/', { replace: true });
  }
}
