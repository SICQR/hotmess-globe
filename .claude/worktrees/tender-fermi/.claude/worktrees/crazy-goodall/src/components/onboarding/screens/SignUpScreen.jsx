/**
 * SignUpScreen — OAuth + magic link auth.
 * Handles both sign-up (from Join flow) and sign-in (from Sign In button).
 *
 * NOTE: Does NOT set up its own onAuthStateChange listener.
 * BootGuardContext owns the auth listener. After auth completes,
 * BootGuardContext re-evaluates boot state → BootRouter renders
 * OnboardingRouter → OnboardingRouter.resolveScreen() applies
 * sessionStorage age gate data and routes to the correct screen.
 */
import React, { useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Loader2, Mail } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';

const GOLD = '#C8962C';

export default function SignUpScreen({ isSignIn = false }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');

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

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <Mail className="w-10 h-10 mx-auto mb-4" style={{ color: GOLD }} />
          <h2 className="text-white text-xl font-bold mb-3">Check your email</h2>
          <p className="text-white/50 text-sm mb-8">
            We sent a magic link to <span className="text-white/70">{email}</span>
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-sm font-medium"
            style={{ color: GOLD }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        {!isSignIn && <ProgressDots current={2} total={5} />}

        <h2 className="text-white text-xl font-bold mb-8">
          {isSignIn ? 'Welcome back' : 'Create your account'}
        </h2>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3 mb-8">
          <button
            onClick={() => handleOAuth('apple')}
            disabled={loading}
            className="w-full py-4 rounded-lg bg-white text-black font-bold text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full py-4 rounded-lg bg-white text-black font-bold text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Magic link */}
        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: email ? GOLD : '#333' }}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity"
            style={{
              backgroundColor: GOLD,
              opacity: loading || !email.trim() ? 0.3 : 1,
            }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Send magic link'
            )}
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
