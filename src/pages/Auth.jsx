/**
 * Auth — "Get into HOTMESS" auth chooser
 *
 * Primary: Google, Telegram, Email (magic link + password toggle)
 * Secondary: "More ways to sign in" sheet (Apple, magic link, phone OTP, password)
 * Preserves all existing auth flows: magic link confirmation, password reset, password update.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, Mail, RefreshCw, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';

const REDIRECT_DELAY_MS = 500;
const GOLD = '#C8962C';
const BG = '#050507';
const RESEND_COOLDOWN = 60;

const spring = { type: 'spring', stiffness: 200, damping: 25 };

/**
 * Apple Sign In is disabled until the Apple OAuth app (Services ID + .p8 key)
 * is fully configured in Supabase Dashboard -> Auth -> Providers -> Apple.
 * Flip to `true` once configured.
 */
const APPLE_ENABLED = true;

/**
 * Returns true when running inside a social media in-app browser (WebView)
 * that blocks Apple's OAuth popup.
 */
function isInWebView() {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Twitter|Line\/|Musical\.ly/i.test(ua);
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" fill="#29B6F6"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
    </svg>
  );
}

// ── Auth method button ─────────────────────────────────────────────────────────

function AuthButton({ icon, label, onClick, disabled, loading: isLoading }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 rounded-2xl border border-white/15 bg-white/5 text-white font-bold text-[15px] flex items-center justify-center gap-3 disabled:opacity-40 transition-all active:bg-white/10"
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <>
          {icon}
          {label}
        </>
      )}
    </motion.button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════════
// MAIN AUTH COMPONENT
// ═════════════════════════════════════════════════════════════════════════════════

export default function Auth() {
  // ── View states ────────────────────────────────────────────────────────────
  const [view, setView] = useState('chooser'); // 'chooser' | 'email' | 'magic-link-sent' | 'password-signin' | 'password-signup' | 'reset' | 'reset-sent' | 'password-update' | 'confirmation-pending' | 'phone' | 'phone-verify'

  // ── Form state ─────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Phone OTP state ───────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openSheet } = useSheet();

  // ── Countdown timer for magic link resend ──────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  // ── Handle password reset redirect ─────────────────────────────────────────
  useEffect(() => {
    const isResetParam = searchParams.get('reset') === 'true';
    if (isResetParam) {
      setView('password-update');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('password-update');
      }
    });

    return () => subscription?.unsubscribe();
  }, [searchParams]);

  // ── Capture referral code ──────────────────────────────────────────────────
  useEffect(() => {
    const r = searchParams.get('ref');
    if (r) { try { sessionStorage.setItem('hm_referral_code', r.toUpperCase()); } catch {} }
  }, [searchParams]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAuthError('');
    setPendingEmail('');
  }, []);

  const goBack = useCallback(() => {
    resetForm();
    setView('chooser');
  }, [resetForm]);

  // ── OAuth: Google ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      });
      if (error) {
        toast.error('Couldn\'t sign in with Google. Try again.');
        setGoogleLoading(false);
      }
    } catch (err) {
      toast.error('Couldn\'t sign in with Google. Try again.');
      setGoogleLoading(false);
    }
  };

  // ── Telegram placeholder ───────────────────────────────────────────────────
  const handleTelegram = () => {
    toast('Being finished now', { description: 'Telegram login is being set up.' });
  };

  // ── Magic link ─────────────────────────────────────────────────────────────
  const handleMagicLink = async (e) => {
    e?.preventDefault();
    if (!email.trim()) { setAuthError('Please enter your email'); return; }
    setLoading(true);
    setAuthError('');
    try {
      const sanitizedEmail = email.replace(/[^\x00-\x7F]/g, '').trim();
      
      // Use our custom magic link API to get the Noir template via Resend
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizedEmail,
          redirectTo: window.location.origin + '/auth/callback'
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setAuthError(result.error || 'Failed to send magic link');
        setLoading(false);
        return;
      }

      setPendingEmail(sanitizedEmail);
      setCountdown(RESEND_COOLDOWN);
      setView('magic-link-sent');
    } catch (err) {
      setAuthError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend magic link ──────────────────────────────────────────────────────
  const handleResendMagicLink = async () => {
    if (!pendingEmail || resending || countdown > 0) return;
    setResending(true);
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail,
          redirectTo: window.location.origin + '/auth/callback'
        }),
      });

      if (!response.ok) {
        toast.error('Couldn\'t resend. Wait a moment and try again.');
      } else {
        toast.success('Magic link resent');
        setCountdown(RESEND_COOLDOWN);
      }
    } catch (err) {
      toast.error('Couldn\'t resend. Wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Password sign in ──────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim() || !password.trim()) { setAuthError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const sanitizedEmail = email.replace(/[^\x00-\x7F]/g, '').trim();
      const { error } = await supabase.auth.signInWithPassword({ email: sanitizedEmail, password });
      if (error) { setAuthError(error.message || 'Sign in failed'); setLoading(false); return; }
      toast.success('Signed in!');
      setTimeout(() => navigate(searchParams.get('redirect') || '/'), REDIRECT_DELAY_MS);
    } catch (err) {
      setAuthError(err.message || 'Sign in failed');
      setLoading(false);
    }
  };

  // ── Password sign up ──────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) { toast.error('Please fill in all fields'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) { toast.error('Sign up failed. Check your details and try again.'); setLoading(false); return; }
      setPendingEmail(email.trim());
      setView('confirmation-pending');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error('Sign up failed. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend signup confirmation ─────────────────────────────────────────────
  const handleResendConfirmation = async () => {
    if (!pendingEmail || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
      if (error) { toast.error('Couldn\'t resend. Wait a moment and try again.'); }
      else { toast.success('Confirmation email resent'); }
    } catch (err) {
      toast.error('Couldn\'t resend. Wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Password reset ────────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) { toast.error('Couldn\'t send reset link. Check your email and try again.'); setLoading(false); return; }
      setView('reset-sent');
      toast.success('Check your inbox for reset link');
    } catch (err) {
      toast.error('Couldn\'t send reset link. Check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Password update (after reset link) ────────────────────────────────────
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) { toast.error('Please fill in all fields'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error('Couldn\'t update your password. Try again.'); setLoading(false); return; }
      toast.success('Password updated!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/'), REDIRECT_DELAY_MS);
    } catch (err) {
      toast.error('Couldn\'t update your password. Try again.');
      setLoading(false);
    }
  };

  // ── Phone OTP: send code ───────────────────────────────────────────────────
  const handlePhoneSend = async (e) => {
    e?.preventDefault();
    const cleaned = phone.replace(/[^+\d]/g, '');
    if (!cleaned || cleaned.length < 8) { setAuthError('Enter a valid phone number with country code (e.g. +44...)'); return; }
    setLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });
      if (error) { setAuthError(error.message || 'Failed to send code'); setLoading(false); return; }
      setCountdown(RESEND_COOLDOWN);
      setView('phone-verify');
    } catch (err) {
      setAuthError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // ── Phone OTP: verify code ────────────────────────────────────────────────
  const handlePhoneVerify = async (e) => {
    e?.preventDefault();
    if (!otpCode || otpCode.length < 6) { setAuthError('Enter the 6-digit code'); return; }
    setLoading(true);
    setAuthError('');
    try {
      const cleaned = phone.replace(/[^+\d]/g, '');
      const { error } = await supabase.auth.verifyOtp({ phone: cleaned, token: otpCode, type: 'sms' });
      if (error) { setAuthError(error.message || 'Invalid code'); setLoading(false); return; }
      toast.success('Signed in!');
      setTimeout(() => navigate(searchParams.get('redirect') || '/'), REDIRECT_DELAY_MS);
    } catch (err) {
      setAuthError(err.message || 'Verification failed');
      setLoading(false);
    }
  };

  // ── Phone OTP: resend code ────────────────────────────────────────────────
  const handlePhoneResend = async () => {
    if (resending || countdown > 0) return;
    setResending(true);
    try {
      const cleaned = phone.replace(/[^+\d]/g, '');
      const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });
      if (error) { toast.error('Couldn\'t resend. Wait a moment and try again.'); }
      else { toast.success('Code resent'); setCountdown(RESEND_COOLDOWN); }
    } catch (err) {
      toast.error('Couldn\'t resend. Wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Open "more auth methods" sheet ─────────────────────────────────────────
  const handleMoreMethods = () => {
    openSheet('more-auth-methods', {
      onSelectApple: () => {
        supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo: window.location.origin + '/auth/callback' },
        }).then(({ error }) => {
          if (error) toast.error('Couldn\'t sign in with Apple. Try again.');
        });
      },
      onSelectMagicLink: () => { setView('email'); },
      onSelectPhone: () => { setView('phone'); },
      onSelectPassword: () => { setView('password-signin'); },
      appleEnabled: APPLE_ENABLED,
      isWebView: isInWebView(),
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex flex-col justify-between text-white" style={{ background: BG }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,150,44,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
      </div>

      {/* ── TOP SECTION ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-20 pb-8">
        <AnimatePresence mode="wait">
          {/* ────────────────────────────────────────────────────────────────── */}
          {/* CHOOSER VIEW                                                      */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'chooser' && (
            <motion.div
              key="chooser"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={spring}
            >
              <h1 className="text-[32px] font-black text-white leading-tight mb-2">
                Get into HOTMESS
              </h1>
              <p className="text-white/50 text-[15px] mb-10">
                18+. Care-first. No chaos at the door.
              </p>

              <div className="flex flex-col gap-3">
                <AuthButton
                  icon={<GoogleIcon />}
                  label="Continue with Google"
                  onClick={handleGoogle}
                  loading={googleLoading}
                  disabled={googleLoading}
                />
                <AuthButton
                  icon={<TelegramIcon />}
                  label="Continue with Telegram"
                  onClick={handleTelegram}
                />
                <AuthButton
                  icon={<EmailIcon />}
                  label="Continue with Email"
                  onClick={() => setView('email')}
                />
              </div>

              <button
                onClick={handleMoreMethods}
                className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors font-medium mt-6 py-2"
              >
                More ways to sign in
              </button>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* EMAIL VIEW (magic link primary, password toggle)                   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <button onClick={goBack} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-2xl font-black text-white mb-1">Enter your email</h2>
              <p className="text-white/40 text-sm mb-6">We will send you a magic link to sign in.</p>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <Input
                  type="email"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^\x00-\x7F]/g, '').trim())}
                  disabled={loading}
                  className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                />

                {authError && (
                  <p role="alert" className="text-[#FF3B30] text-xs font-medium">{authError}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: '0 0 30px rgba(200,150,44,0.25)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Send magic link <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>

              <button
                onClick={() => { resetForm(); setView('password-signin'); }}
                className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors font-medium mt-4 py-2"
              >
                Sign in with password instead
              </button>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* MAGIC LINK SENT (confirmation screen with countdown + resend)      */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'magic-link-sent' && (
            <motion.div
              key="magic-link-sent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}30` }}
                >
                  <Mail className="w-7 h-7" style={{ color: GOLD }} />
                </div>
              </div>

              <h3 className="text-xl font-black text-white mb-2">Check your email</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-1">
                We sent a magic link to
              </p>
              <p className="text-base font-bold mb-6" style={{ color: GOLD }}>{pendingEmail}</p>
              <p className="text-xs text-white/30 leading-relaxed mb-6">
                Tap the link in the email to sign in instantly. No password needed.
              </p>

              <button
                onClick={handleResendMagicLink}
                disabled={resending || countdown > 0}
                className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider border flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                style={{ borderColor: `${GOLD}30`, color: 'rgba(255,255,255,0.5)' }}
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend magic link
                  </>
                )}
              </button>

              <button
                onClick={() => { resetForm(); setView('email'); }}
                className="w-full text-sm text-white/30 hover:text-white/50 transition-colors font-medium py-3 mt-2"
              >
                Use a different email
              </button>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* PHONE OTP: ENTER NUMBER                                            */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <button onClick={goBack} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-2xl font-black text-white mb-1">Enter your number</h2>
              <p className="text-white/40 text-sm mb-6">We'll text you a 6-digit code to sign in.</p>

              <form onSubmit={handlePhoneSend} className="space-y-4">
                <Input
                  type="tel"
                  autoComplete="tel"
                  autoFocus
                  placeholder="+44 7700 900000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4 text-lg tracking-wide"
                />

                {authError && (
                  <p role="alert" className="text-[#FF3B30] text-xs font-medium">{authError}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: '0 0 30px rgba(200,150,44,0.25)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Send code <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* PHONE OTP: VERIFY CODE                                             */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'phone-verify' && (
            <motion.div
              key="phone-verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <h3 className="text-xl font-black text-white mb-2">Enter your code</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-1">
                We sent a 6-digit code to
              </p>
              <p className="text-base font-bold mb-6" style={{ color: GOLD }}>{phone}</p>

              <form onSubmit={handlePhoneVerify} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-14 px-4"
                />

                {authError && (
                  <p role="alert" className="text-[#FF3B30] text-xs font-medium">{authError}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: '0 0 30px rgba(200,150,44,0.25)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                </motion.button>
              </form>

              <button
                onClick={handlePhoneResend}
                disabled={resending || countdown > 0}
                className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider border flex items-center justify-center gap-2 disabled:opacity-40 transition-all mt-4"
                style={{ borderColor: `${GOLD}30`, color: 'rgba(255,255,255,0.5)' }}
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend code
                  </>
                )}
              </button>

              <button
                onClick={() => { setOtpCode(''); setAuthError(''); setView('phone'); }}
                className="w-full text-sm text-white/30 hover:text-white/50 transition-colors font-medium py-3 mt-2"
              >
                Use a different number
              </button>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* PASSWORD SIGN IN                                                   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'password-signin' && (
            <motion.div
              key="password-signin"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <button onClick={goBack} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
              <p className="text-white/40 text-sm mb-6">Sign in with your password</p>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Email</label>
                  <Input
                    type="email"
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/[^\x00-\x7F]/g, '').trim())}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Password</label>
                  <Input
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <div className="flex justify-end -mt-1">
                  <button type="button" onClick={() => { resetForm(); setView('reset'); }}
                    className="text-[11px] text-white/30 hover:text-[#C8962C] transition-colors font-medium">
                    Forgot password?
                  </button>
                </div>

                {authError && (
                  <p role="alert" className="text-[#FF3B30] text-xs font-medium">{authError}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: '0 0 30px rgba(200,150,44,0.25)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>

              <p className="text-center text-sm text-white/30 mt-4">
                New here?{' '}
                <button onClick={() => { resetForm(); setView('password-signup'); }} className="font-black" style={{ color: GOLD }}>
                  Create account
                </button>
              </p>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* PASSWORD SIGN UP                                                   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'password-signup' && (
            <motion.div
              key="password-signup"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <button onClick={goBack} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-2xl font-black text-white mb-1">Join The Mess</h2>
              <p className="text-white/40 text-sm mb-6">Create your account</p>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Email</label>
                  <Input
                    type="email"
                    autoComplete="email"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/[^\x00-\x7F]/g, '').trim())}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Password</label>
                  <Input
                    type="password"
                    placeholder="6+ characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: '0 0 30px rgba(200,150,44,0.25)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>

              <p className="text-center text-sm text-white/30 mt-4">
                Already a member?{' '}
                <button onClick={() => { resetForm(); setView('password-signin'); }} className="font-black" style={{ color: GOLD }}>
                  Sign in
                </button>
              </p>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* CONFIRMATION PENDING (email signup confirmation)                   */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'confirmation-pending' && (
            <motion.div
              key="confirmation-pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}30` }}
                >
                  <Mail className="w-7 h-7" style={{ color: GOLD }} />
                </div>
              </div>

              <h3 className="text-xl font-black text-white mb-2">Check your email</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-1">
                We have sent a confirmation link to
              </p>
              <p className="text-base font-bold mb-6" style={{ color: GOLD }}>{pendingEmail}</p>
              <p className="text-xs text-white/30 leading-relaxed mb-6">
                Tap the link in the email to activate your account.
                Once confirmed, you will be signed in automatically.
              </p>

              <button
                onClick={handleResendConfirmation}
                disabled={resending}
                className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider border flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                style={{ borderColor: `${GOLD}30`, color: 'rgba(255,255,255,0.5)' }}
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend confirmation email
                  </>
                )}
              </button>

              <button
                onClick={() => { resetForm(); setView('email'); }}
                className="w-full text-sm text-white/30 hover:text-white/50 transition-colors font-medium py-3 mt-2"
              >
                Use a different email
              </button>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* PASSWORD RESET REQUEST                                             */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'reset' && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <button onClick={() => { resetForm(); setView('password-signin'); }} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <h2 className="text-2xl font-black text-white mb-1">Reset password</h2>
              <p className="text-white/40 text-sm mb-6">Enter your email to receive a reset link</p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  type="email"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^\x00-\x7F]/g, '').trim())}
                  disabled={loading}
                  className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                />

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: '0 0 30px rgba(200,150,44,0.25)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Send reset link <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* RESET SENT CONFIRMATION                                            */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'reset-sent' && (
            <motion.div
              key="reset-sent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}30` }}
                >
                  <Mail className="w-7 h-7" style={{ color: GOLD }} />
                </div>
              </div>

              <h3 className="text-xl font-black text-white mb-2">Check your inbox</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                We have sent a password reset link to <span className="text-white font-semibold">{email}</span>
              </p>

              <motion.button
                type="button"
                onClick={() => { resetForm(); setView('password-signin'); }}
                whileTap={{ scale: 0.97 }}
                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wide mt-8 border"
                style={{ borderColor: `${GOLD}30`, color: 'rgba(255,255,255,0.5)' }}
              >
                Back to sign in
              </motion.button>
            </motion.div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* PASSWORD UPDATE (after reset link clicked)                         */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {view === 'password-update' && (
            <motion.div
              key="password-update"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-2xl font-black text-white mb-1">Set new password</h2>
              <p className="text-white/40 text-sm mb-6">Choose a strong password</p>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">New Password</label>
                  <Input
                    type="password"
                    placeholder="6+ characters"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: '0 0 30px rgba(200,150,44,0.25)' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Update Password <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── LEGAL MICROCOPY ─────────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 pb-10 pt-4 text-center">
        <p className="text-[11px] text-white/25 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-white/40 transition-colors">Terms</a>,{' '}
          <a href="/privacy" className="underline hover:text-white/40 transition-colors">Privacy</a>, and{' '}
          <a href="/community" className="underline hover:text-white/40 transition-colors">Community Rules</a>.
        </p>
      </div>
    </div>
  );
}
