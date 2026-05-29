/**
 * SignUpScreen — OAuth (Apple, Google) + Phone OTP + Telegram, with
 * email+password tucked under a "More options" expander.
 *
 * 2026-05-09 (Grindr-fast directive):
 *   - Magic link path REMOVED entirely (no email input as primary path,
 *     no "Check your inbox" confirmation screen).
 *   - Email+password is now the legacy fallback, collapsed under
 *     "More options" so it doesn't compete with 1-tap auth.
 *   - Phone OTP and Telegram buttons are wired separately in sibling PRs
 *     and will surface above email+password once those PRs land.
 *
 * NOTE: Does NOT set up its own onAuthStateChange listener. BootGuardContext
 * owns the auth listener. After auth completes, BootGuardContext re-evaluates
 * boot state → BootRouter renders OnboardingRouter → resolveScreen() applies
 * sessionStorage age gate data and routes to the correct screen.
 *
 * WebView detection: Apple Sign In is hidden in Instagram / FBAN / Twitter
 * WebViews because WKWebView blocks the Apple auth popup (returns 400).
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';
import { track } from '@/lib/analytics';
import TelegramLoginButton from '../TelegramLoginButton';
import PhoneOtpButton from '../PhoneOtpButton';

const GOLD = '#C8962C';

// AUTH FUNNEL RESCUE (2026-05-17): Apple Sign-In is broken — no APPLE_* env
// vars exist on hotmess-globe Vercel (confirmed via `vercel env ls`). The
// .p8 key isn't accessible from this thread either. Per the brief's Issue
// 4 launch-day mitigation: hide the Apple button entirely behind an env
// flag rather than show a dead CTA. When Phil hands over the .p8 + sets
// the secrets, flip VITE_AUTH_APPLE_ENABLED=true in Vercel and the button
// reappears with no code change.
const APPLE_ENABLED = import.meta.env.VITE_AUTH_APPLE_ENABLED === 'true';

function isInWebView() {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Twitter|Line\/|Musical\.ly/i.test(ua);
}

export default function SignUpScreen({ isSignIn: initialIsSignIn = false }) {
  // Phil 2026-05-28 (#266): isSignIn is local state so the same form can flip
  // between Create / Sign in without bouncing through OnboardingRouter or
  // (broken) /auth?mode=signin URLs. Initialised from prop for back-compat.
  const [isSignIn, setIsSignIn] = useState(initialIsSignIn);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const webView = isInWebView();

  // Capture referral code from URL
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('ref');
    if (r) { try { sessionStorage.setItem('hm_referral_code', r.toUpperCase()); } catch {} }
  }, []);

  const handleOAuth = async (provider) => {
    setLoading(true);
    setError('');
    track('signup', 'onboarding', provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const handleEmailPassword = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (isSignIn) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
        } else {
          track('signin', 'onboarding', 'password');
          window.location.assign('/auth/callback');
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) {
          // Phil 2026-05-28 hotfix — surface duplicate-email errors cleanly
          // when Supabase does return them.
          const msg = String(signUpError.message || '').toLowerCase();
          if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
            setError("This email is already on HOTMESS. Sign in instead?");
          } else {
            setError(signUpError.message);
          }
        } else if (data?.session) {
          track('signup', 'onboarding', 'password');
          window.location.assign('/auth/callback');
        } else {
          // Phil 2026-05-28 hotfix: Supabase email confirmation is OFF in
          // this project (verified — every signup auto-confirms within ms).
          // So signUp returning no error AND no session means Supabase's
          // anti-enumeration response: the email is ALREADY on HOTMESS.
          // Previously we showed 'Check your email' which was a lie + a
          // dead screen. Now we tell the truth + try the password as a
          // sign-in attempt (one-tap recovery for users who actually
          // remember their password).
          track('signup', 'onboarding', 'existing_account_detected');
          const { data: siData, error: siError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (siData?.session) {
            track('signin', 'onboarding', 'password_after_existing_detect');
            window.location.assign('/auth/callback');
          } else {
            // Wrong password or genuine new-account creation issue —
            // surface the felt copy + offer the sign-in switch.
            setError("That email is already on HOTMESS. Sign in instead — or use a different email.");
            // Auto-flip into sign-in mode would be cleaner if isSignIn was
            // local state. For now, surface the error + 'Forgot password?'
            // appears via the existing isSignIn path; users can switch
            // manually via the splash back-button.
          }
        }
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: '#0A0A0A' }}
    >
      <div className="w-full max-w-xs">
        {!isSignIn && <ProgressDots current={2} total={3} />}

        <h2 className="text-white text-xl font-bold mb-2">
          {isSignIn ? 'Welcome back' : 'How HOTMESS knows it\'s you'}
        </h2>
        <p className="text-white/45 text-[12px] mb-7 leading-relaxed">
          Whichever you pick, we never post anywhere and never use your contacts.
        </p>

        {/* OAuth buttons — primary 1-tap paths */}
        <div className="flex flex-col gap-3 mb-3">
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

          <PhoneOtpButton disabled={loading} />
          <TelegramLoginButton disabled={loading} />
        </div>

        {/* "More options" expander — email+password fallback */}
        <button
          type="button"
          onClick={() => setShowMoreOptions((v) => !v)}
          className="w-full py-3 mt-2 mb-2 flex items-center justify-center gap-1 text-white/40 text-xs font-semibold tracking-wider uppercase hover:text-white/70 transition-colors"
          aria-expanded={showMoreOptions}
        >
          {showMoreOptions ? 'Hide email signup' : 'Use email — keep it private'}
          {showMoreOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showMoreOptions && (
          <form onSubmit={handleEmailPassword} className="flex flex-col gap-3 pt-2 border-t border-white/5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-transparent text-white py-3 border-b focus:outline-none text-base placeholder:text-white/25"
              style={{ borderBottomColor: email ? GOLD : '#333' }}
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent text-white py-3 border-b focus:outline-none text-base placeholder:text-white/25"
              style={{ borderBottomColor: password ? GOLD : '#333' }}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              minLength={isSignIn ? undefined : 8}
            />
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-4 rounded-xl text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: GOLD,
                opacity: loading || !email.trim() || !password ? 0.3 : 1,
              }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignIn ? 'Sign in' : 'Create account')}
            </button>
            {!isSignIn && (
              <>
                <p className="text-white/25 text-[10px] text-center leading-relaxed">
                  Use 8+ chars. We'll never email you marketing.
                </p>
                {/* M4 v2 (Phil 2026-05-28 #266): toggle isSignIn locally — same form,
                    same OAuth buttons, just flip the submit handler + label. No
                    nav, no /auth round-trip. */}
                <button
                  type="button"
                  onClick={() => { setIsSignIn(true); setError(''); setInfo(''); }}
                  className="text-white/55 text-[11px] text-center mt-2 hover:text-white/85"
                >
                  Already on HOTMESS? <span style={{ color: GOLD }} className="font-semibold">Sign in</span>
                </button>
              </>
            )}
            {isSignIn && (
              <button
                type="button"
                onClick={() => { setIsSignIn(false); setError(''); setInfo(''); }}
                className="text-white/55 text-[11px] text-center mt-2 hover:text-white/85"
              >
                Need an account? <span style={{ color: GOLD }} className="font-semibold">Create one</span>
              </button>
            )}

            {isSignIn && (
              <button
                type="button"
                onClick={async () => {
                  // AUTH FUNNEL RESCUE (2026-05-17): wire forgot-password.
                  // Brief Issue 3: members locked out if they don't remember
                  // their password. Fire Supabase's reset email; show a toast.
                  if (!email.trim()) {
                    setError('Enter your email above first.');
                    return;
                  }
                  setError('');
                  setInfo('');
                  try {
                    const { error: rstErr } = await supabase.auth.resetPasswordForEmail(
                      email.trim(),
                      { redirectTo: 'https://hotmessldn.com/reset-password' },
                    );
                    if (rstErr) {
                      setError(rstErr.message);
                    } else {
                      setInfo("Sent. Check your inbox for a reset link. Still stuck? Email phil@hotmessldn.com.");
                    }
                  } catch (e) {
                    setError(e?.message || 'Failed to send reset email.');
                  }
                }}
                className="text-white/40 text-[11px] hover:text-white/70 transition-colors underline underline-offset-2 self-center"
              >
                Forgot password?
              </button>
            )}
          </form>
        )}

        {error && (
          <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
        )}
        {info && (
          <p className="text-white/60 text-xs mt-4 text-center leading-relaxed">{info}</p>
        )}
      </div>
    </div>
  );
}
