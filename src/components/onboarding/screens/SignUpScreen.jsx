/**
 * SignUpScreen — OAuth + magic link auth.
 * Handles both sign-up (from Join flow) and sign-in (from Sign In button).
 *
 * NOTE: Does NOT set up its own onAuthStateChange listener.
 * BootGuardContext owns the auth listener. After auth completes,
 * BootGuardContext re-evaluates boot state → BootRouter renders
 * OnboardingRouter → OnboardingRouter.resolveScreen() applies
 * sessionStorage age gate data and routes to the correct screen.
 *
 * WebView detection: Apple Sign In is hidden in Instagram / FBAN / Twitter
 * WebViews because WKWebView blocks the Apple auth popup (returns 400).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2, Mail } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';

const GOLD = '#C8962C';

/**
 * Apple Sign In is disabled until the Apple OAuth app (Services ID + .p8 key)
 * is fully configured in Supabase Dashboard → Auth → Providers → Apple.
 * Flip to `true` once configured.
 */
const APPLE_ENABLED = false;

/**
 * Returns true when running inside a social media in-app browser (WebView)
 * that blocks Apple's OAuth popup.
 */
function isInWebView() {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Twitter|Line\/|Musical\.ly/i.test(ua);
}

const RESEND_COOLDOWN = 60; // seconds

export default function SignUpScreen({ isSignIn = false }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const webView = isInWebView();

  // Capture referral code from URL
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref');
    if (r) { try { sessionStorage.setItem('hm_referral_code', r.toUpperCase()); } catch {} }
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleOAuth = async (provider) => {
    setLoading(true);
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const sendMagicLink = useCallback(async (emailAddr) => {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: emailAddr.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return otpError;
  }, []);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const otpError = await sendMagicLink(email);
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setMagicLinkSent(true);
      setCountdown(RESEND_COOLDOWN);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    const otpError = await sendMagicLink(email);
    setLoading(false);
    if (!otpError) {
      setCountdown(RESEND_COOLDOWN);
    }
  };

  // ── Magic link sent: confirmation screen ──────────────────────────────────
  if (magicLinkSent) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-6"
        style={{ background: '#0A0A0A' }}
      >
        <div className="w-full max-w-xs text-center">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}30` }}
          >
            <Mail className="w-7 h-7" style={{ color: GOLD }} />
          </div>

          <h2 className="text-white text-xl font-black mb-2">Check your inbox</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-1">
            Magic link sent to
          </p>
          <p className="text-white/80 text-sm font-semibold mb-8 break-all">{email}</p>

          <p className="text-white/30 text-xs mb-6">
            Tap the link in your email to sign in. It expires in 10 minutes.
          </p>

          {/* Resend */}
          <button
            onClick={handleResend}
            disabled={countdown > 0 || loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm mb-3 transition-opacity"
            style={{
              background: countdown > 0 ? 'rgba(255,255,255,0.04)' : `${GOLD}18`,
              border: `1px solid ${countdown > 0 ? 'rgba(255,255,255,0.08)' : `${GOLD}30`}`,
              color: countdown > 0 ? 'rgba(255,255,255,0.3)' : GOLD,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading
              ? 'Sending…'
              : countdown > 0
              ? `Resend in ${countdown}s`
              : 'Resend magic link'}
          </button>

          {/* Wrong email */}
          <button
            onClick={() => { setMagicLinkSent(false); setEmail(''); setCountdown(0); }}
            className="text-xs font-medium"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Wrong email? Start over
          </button>
        </div>
      </div>
    );
  }

  // ── Main auth screen ───────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: '#0A0A0A' }}
    >
      <div className="w-full max-w-xs">
        {!isSignIn && <ProgressDots current={2} total={5} />}

        <h2 className="text-white text-xl font-bold mb-8">
          {isSignIn ? 'Welcome back' : 'Create your account'}
        </h2>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3 mb-8">
          {/* Apple Sign In: hidden until configured in Supabase Dashboard */}
          {APPLE_ENABLED && !webView && (
            <button
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </button>
          )}

          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {APPLE_ENABLED && webView && (
            <p className="text-white/30 text-[11px] text-center -mt-1">
              Open in Safari for Apple Sign In
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Magic link form */}
        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-transparent text-white py-3 border-b focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: email ? GOLD : '#333' }}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-4 rounded-xl text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
            style={{
              backgroundColor: GOLD,
              opacity: loading || !email.trim() ? 0.3 : 1,
            }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send magic link'}
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
