import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

const CALLBACK_SETTLING_KEY = 'hm_auth_callback_settling';

/**
 * OAuth / Magic Link Callback Handler
 *
 * This page is the single owner of Supabase callback settlement. Do not let
 * BootRouter / onboarding auth UI relaunch OAuth while this route is mounted.
 *
 * Handles both modern PKCE links (`?code=...`) and older implicit/hash links.
 * After Supabase verifies the token:
 * - Returning user (onboarding_completed = true) → /pulse
 * - New / incomplete user → /
 * - Bot/scraper hitting a stale/expired link → graceful UI or splash
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;

    const finishWithError = (message, dest = '/') => {
      if (cancelled) return;
      logger.error('Auth callback failed', { error: message });
      setError(message || 'Sign in failed');
      setStatus('error');
      retryTimer = setTimeout(() => {
        if (!cancelled) navigate(dest, { replace: true });
      }, 1200);
    };

    const readSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      return data?.session || null;
    };

    const settleCallback = async () => {
      try {
        try { sessionStorage.setItem(CALLBACK_SETTLING_KEY, 'true'); } catch {}

        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const code = searchParams.get('code');

        // Supabase may return auth errors/tokens in the hash fragment.
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hashError = hashParams.get('error') || hashParams.get('error_code');
        const hashErrorDesc = hashParams.get('error_description');

        const allErrors = [errorParam, errorDescription, hashError, hashErrorDesc]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const isExpired = allErrors.includes('expired') || allErrors.includes('otp_expired');

        if (isExpired) {
          logger.warn('Magic link expired', { error: allErrors });
          setStatus('expired');
          return;
        }

        if (!errorParam && (hashError || hashErrorDesc)) {
          finishWithError(hashErrorDesc || hashError || 'OAuth error from provider');
          return;
        }

        if (errorParam) {
          finishWithError(errorDescription || errorParam);
          return;
        }

        let session = null;

        // Modern Supabase OAuth/magic-link callbacks use PKCE: /auth/callback?code=...
        // getSession() alone is not enough here; we must exchange the code exactly once.
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            const msg = exchangeError.message || '';
            const maybeReplayedCode =
              msg.toLowerCase().includes('code') &&
              ['already', 'expired', 'used'].some((needle) => msg.toLowerCase().includes(needle));

            if (!maybeReplayedCode) {
              finishWithError(msg || 'Could not complete sign in');
              return;
            }

            logger.warn('Auth code replay/expiry during callback — checking existing session', { error: msg });
            session = await readSession();
          } else {
            session = data?.session || null;
          }
        } else {
          session = await readSession();
        }

        if (session?.user?.id) {
          if (cancelled) return;
          setStatus('success');
          await routeAfterAuth(session.user.id, navigate);
          return;
        }

        // Hash/implicit links can need one tick before supabase-js persists the session.
        retryTimer = setTimeout(async () => {
          try {
            const retrySession = await readSession();
            if (retrySession?.user?.id) {
              if (cancelled) return;
              setStatus('success');
              await routeAfterAuth(retrySession.user.id, navigate);
              return;
            }
            finishWithError('No session found after callback');
          } catch (err) {
            finishWithError(err?.message || 'Could not complete sign in');
          }
        }, 500);
      } catch (err) {
        finishWithError(err?.message || 'Unexpected callback error');
      }
    };

    settleCallback();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      try { sessionStorage.removeItem(CALLBACK_SETTLING_KEY); } catch {}
    };
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
 * Returning user → /pulse. New/incomplete user → /.
 * Also handles referral code capture for new users.
 */
async function routeAfterAuth(userId, navigate) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, age_verified_at')
      .eq('id', userId)
      .single();

    // 2026-05-12: Backfill age_verified_at from localStorage flag if the user
    // passed the AgeGate pre-auth but we never wrote it to their profile row.
    // Required for has_xxx_access() (paid membership + age verified) to ever
    // return true — without this the Ghosted lockbox is unreachable.
    try {
      if (!profile?.age_verified_at && typeof window !== 'undefined' &&
          window.localStorage?.getItem('hm_age_gate_passed') === 'true') {
        await supabase
          .from('profiles')
          .update({ age_verified_at: new Date().toISOString() })
          .eq('id', userId)
          .is('age_verified_at', null);
      }
    } catch {}

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

    const dest = profile?.onboarding_completed === true ? '/pulse' : '/';
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
