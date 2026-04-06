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
        // Check both URL search params AND hash fragment for errors.
        // Supabase sometimes returns OAuth errors in the hash fragment.
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Also check hash fragment (Supabase auth errors sometimes land here)
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hashError = hashParams.get('error') || hashParams.get('error_code');
        const hashErrorDesc = hashParams.get('error_description');

        // Detect expired magic link / OTP
        const allErrors = [errorParam, errorDescription, hashError, hashErrorDesc].join(' ').toLowerCase();
        const isExpired = allErrors.includes('expired') || allErrors.includes('otp_expired');

        if (isExpired) {
          logger.warn('Magic link expired', { error: allErrors });
          setStatus('expired');
          return;
        }

        if (!errorParam && (hashError || hashErrorDesc)) {
          logger.error('OAuth error from hash fragment', { error: hashError, description: hashErrorDesc });
          navigate('/', { replace: true });
          return;
        }

        if (errorParam) {
          logger.error('OAuth error from provider', { error: errorParam, description: errorDescription });
          navigate('/', { replace: true });
          return;
        }

        // Wait for Supabase to process the hash (magic link / OAuth token)
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          // "code already used" means the user hit back during OAuth and replayed
          // the callback URL. They likely already have a valid session — send them in.
          const msg = sessionError.message || '';
          if (msg.includes('code') && (msg.includes('already') || msg.includes('expired') || msg.includes('used'))) {
            logger.warn('OAuth code already used — checking for existing session', { error: msg });
            const { data: existing } = await supabase.auth.getSession();
            if (existing?.session?.user?.id) {
              await routeAfterAuth(existing.session.user.id, navigate);
              return;
            }
            // No session at all — redirect to /ghosted as a best-effort
            // (BootGuardContext will redirect to auth if truly unauthenticated)
            navigate('/ghosted', { replace: true });
            return;
          }

          logger.error('Session error during callback', { error: sessionError.message });
          navigate('/', { replace: true });
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
            // Timed out — send back to splash
            navigate('/', { replace: true });
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

        {status === 'expired' && (
          <>
            <div className="text-[#C8962C] text-3xl mb-3">⏱</div>
            <p className="text-white text-base mb-1">Link expired</p>
            <p className="text-white/40 text-sm mb-6">Magic links expire after 1 hour. Request a new one.</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ backgroundColor: '#C8962C', color: '#000' }}
            >
              Resend Link
            </button>
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
 * Also handles referral code capture for new users.
 */
async function routeAfterAuth(userId, navigate) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    // Handle referral code capture for new users
    try {
      const ref = sessionStorage.getItem('hm_referral_code');
      if (ref && !profile?.onboarding_completed) {
        const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', ref).maybeSingle();
        if (referrer) {
          await supabase.from('referrals').insert({
            referrer_id: referrer.id, referee_id: userId,
            referral_code: ref, status: 'completed',
            reward_granted: false, completed_at: new Date().toISOString(),
          });
          sessionStorage.removeItem('hm_referral_code');
        }
      }
    } catch {}

    const dest = profile?.onboarding_completed === true ? '/ghosted' : '/';
    navigate(dest, { replace: true });
    // Hard fallback: if React Router navigate doesn't fire (race with BootGuard),
    // force a full page load after a short delay.
    setTimeout(() => { window.location.replace(dest); }, 1500);
  } catch {
    // DB unavailable — BootGuardContext will recover from /
    navigate('/', { replace: true });
    setTimeout(() => { window.location.replace('/'); }, 1500);
  }
}
