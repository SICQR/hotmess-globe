/**
 * HotmessSplash — Unified entry experience
 *
 * Flow:
 * 1. SPLASH  — Bold brand + ENTER button (confirms 18+, terms, cookies)
 * 2. AUTH    — Email/password inline (sign in or sign up)
 * 3. DONE    — Navigate into app (BootGuard handles onboarding gate)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Play, ArrowRight, Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function HotmessSplash() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('splash'); // splash | auth | forgot | reset-sent | done
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const audioRef = useRef(null);

  // Skip splash if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, []);

  // Audio setup
  useEffect(() => {
    const audio = new Audio('/audio/radio-in.mp3');
    audio.loop = true;
    audio.volume = 0.25;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setAudioPlaying(p => !p);
  };

  const handleEnter = () => {
    try {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
    } catch {}
    if (audioRef.current && !audioPlaying) {
      audioRef.current.play().catch(() => {});
      setAudioPlaying(true);
    }
    setStage('auth');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return toast.error('Enter your email address');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setStage('reset-sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return toast.error('Email and password required');
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() || undefined } },
        });
        if (error) throw error;
        toast.success('Welcome to HOTMESS! Check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
      }
      setStage('done');
      audioRef.current?.pause();
      setTimeout(() => navigate('/', { replace: true }), 600);
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black overflow-hidden">
      {/* Background — hero image + gradient */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: 'url(/assets/hero-main.png)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />

      {/* Audio toggle */}
      <button
        onClick={toggleAudio}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/5 border border-white/10 hover:border-white/30 transition-all"
      >
        {audioPlaying
          ? <Volume2 className="w-5 h-5 text-[#C8962C]" />
          : <VolumeX className="w-5 h-5 text-white/40" />}
      </button>

      <AnimatePresence mode="wait">

        {/* ─── SPLASH STAGE ──────────────────────────────────── */}
        {stage === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pb-24"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center mb-12"
            >
              <h1 className="text-[18vw] sm:text-[14vw] font-black italic tracking-tighter text-white leading-none select-none">
                HOT<span className="text-[#C8962C]">MESS</span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs uppercase tracking-[0.4em] text-white/50 mt-3"
              >
                London OS
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-[11px] uppercase tracking-[0.2em] text-[#C8962C]/50 mt-2"
              >
                No swiping. No ghosts. Just chemistry.
              </motion.p>
            </motion.div>

            {/* ENTER button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center gap-4"
            >
              <button
                onClick={handleEnter}
                className="relative group"
              >
                <div className="absolute inset-0 bg-[#C8962C] blur-2xl opacity-40 group-hover:opacity-70 transition-opacity rounded-none" />
                <div className="relative bg-[#C8962C] text-black font-black py-5 px-14 text-xl uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-3">
                  <Play className="w-5 h-5" fill="currentColor" />
                  ENTER
                </div>
              </button>

              <button
                onClick={() => window.location.href = 'https://google.com'}
                className="text-white/25 text-[10px] uppercase tracking-widest hover:text-white/50 transition-colors py-2"
              >
                Exit Terminal
              </button>
            </motion.div>

            {/* Legal footer */}
            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-white/5">
              <p className="text-center text-[10px] text-white/25 leading-relaxed">
                By entering, you confirm you are{' '}
                <span className="text-white/40">18+</span> and agree to our{' '}
                <button
                  onClick={() => setShowLegal(s => !s)}
                  className="text-[#C8962C]/50 underline hover:text-[#C8962C]"
                >
                  Terms, Privacy & Cookies
                </button>
              </p>
              <AnimatePresence>
                {showLegal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-[9px] text-white/20 leading-relaxed text-center space-y-1"
                  >
                    <p>Adults 18+ only. You must comply with local laws. No commercial sex work solicitation.</p>
                    <p>We collect minimal data for app functionality. See full Privacy Policy at hotmess.app/privacy.</p>
                    <a href="/legal/terms" className="text-[#C8962C]/30 underline">Full Terms</a>
                    {' · '}
                    <a href="/legal/privacy" className="text-[#C8962C]/30 underline">Privacy</a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ─── AUTH STAGE ────────────────────────────────────── */}
        {stage === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 flex flex-col items-end justify-end min-h-screen"
          >
            {/* Bottom sheet style */}
            <div className="w-full bg-[#0D0D0D] border-t border-white/10 rounded-t-3xl px-6 pt-8 pb-10">
              {/* Header */}
              <div className="mb-6">
                <p className="text-[#C8962C] text-[10px] font-black uppercase tracking-widest mb-1">HOTMESS</p>
                <h2 className="text-white font-black text-2xl">
                  {isSignUp ? 'Create account' : 'Welcome back'}
                </h2>
                <p className="text-white/40 text-sm mt-1">
                  {isSignUp ? 'Join the mess.' : 'Sign in to continue.'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                {isSignUp && (
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Display name"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60 mt-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Entering...</>
                    : <><ArrowRight className="w-4 h-4" /> {isSignUp ? 'Join HOTMESS' : 'Enter'}</>}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setIsSignUp(s => !s)}
                  className="text-white/40 text-xs hover:text-white/70 transition-colors"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
                {!isSignUp && (
                  <button
                    onClick={() => { setResetEmail(email); setStage('forgot'); }}
                    className="text-[#C8962C]/60 text-xs hover:text-[#C8962C] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <button
                onClick={() => setStage('splash')}
                className="mt-3 w-full text-white/20 text-xs text-center hover:text-white/40 transition-colors py-1"
              >
                ← Back
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── FORGOT PASSWORD STAGE ─────────────────────────── */}
        {stage === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 flex flex-col items-end justify-end min-h-screen"
          >
            <div className="w-full bg-[#0D0D0D] border-t border-white/10 rounded-t-3xl px-6 pt-8 pb-10">
              <button
                onClick={() => setStage('auth')}
                className="flex items-center gap-2 text-white/40 text-xs mb-6 hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#C8962C]/10 border border-[#C8962C]/20 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-[#C8962C]" />
                </div>
                <p className="text-[#C8962C] text-[10px] font-black uppercase tracking-widest mb-1">HOTMESS</p>
                <h2 className="text-white font-black text-2xl">Reset password</h2>
                <p className="text-white/40 text-sm mt-1">
                  We'll send a reset link to your email.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  autoFocus
                  className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : <><Mail className="w-4 h-4" /> Send Reset Link</>}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ─── RESET SENT STAGE ──────────────────────────────── */}
        {stage === 'reset-sent' && (
          <motion.div
            key="reset-sent"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 flex flex-col items-end justify-end min-h-screen"
          >
            <div className="w-full bg-[#0D0D0D] border-t border-white/10 rounded-t-3xl px-6 pt-8 pb-10">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#C8962C]/10 border-2 border-[#C8962C]/30 flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-7 h-7 text-[#C8962C]" />
                </div>
                <h2 className="text-white font-black text-2xl mb-2">Check your inbox</h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  We sent a password reset link to
                </p>
                <p className="text-[#C8962C] text-sm font-bold mt-1 break-all">{resetEmail}</p>
                <p className="text-white/30 text-xs mt-3 leading-relaxed">
                  Click the link in the email to set a new password.{'\n'}
                  Check your spam folder if you don't see it.
                </p>
              </div>

              <button
                onClick={() => { setStage('auth'); setIsSignUp(false); }}
                className="mt-6 w-full bg-[#1C1C1E] border border-white/10 text-white font-black text-sm rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>

              <button
                onClick={() => { setResetEmail(''); setStage('forgot'); }}
                className="mt-3 w-full text-white/20 text-xs text-center hover:text-white/40 transition-colors py-1"
              >
                Try a different email
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── DONE STAGE ────────────────────────────────────── */}
        {stage === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen"
          >
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-black text-white"
            >
              HOT<span className="text-[#C8962C]">MESS</span>
            </motion.p>
            <div className="mt-4 w-5 h-5 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
