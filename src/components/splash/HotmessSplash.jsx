/**
 * HotmessSplash — Cinematic entry experience
 *
 * Flow:
 * 1. SPLASH  — Cinematic hero + staggered wordmark + gold ENTER
 * 2. AUTH    — Bottom sheet auth (sign in / sign up)
 * 3. FORGOT  — Password reset
 * 4. RESET-SENT — Confirmation
 * 5. DONE    — Branded transition into OS
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

/* ─── Animation configs ───────────────────────────────────── */
const springSmooth = { type: 'spring', stiffness: 200, damping: 25 };
const springSnap = { type: 'spring', stiffness: 300, damping: 28 };

const letterVariants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.6 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const HOTMESS = ['H', 'O', 'T', 'M', 'E', 'S', 'S'];

export default function HotmessSplash() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('splash');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Skip splash if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, []);

  const handleEnter = () => {
    try {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
    } catch {}
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
      setTimeout(() => navigate('/', { replace: true }), 800);
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black overflow-hidden">

      {/* ─── Cinematic background ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.45, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/assets/hero-main.png)' }}
      />
      {/* Gradient vignette — dark edges, transparent center-top */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" style={{ height: '50%', top: '50%' }} />

      {/* Gold ambient light — behind wordmark area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ delay: 0.4, duration: 1.5 }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, rgba(200, 150, 44, 0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <AnimatePresence mode="wait">

        {/* ═══════════════════════════════════════════════════════════
            SPLASH — Cinematic entrance
            ═══════════════════════════════════════════════════════ */}
        {stage === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6"
          >
            {/* Staggered wordmark */}
            <div className="text-center mb-16">
              <h1 className="flex items-baseline justify-center select-none" aria-label="HOTMESS">
                {HOTMESS.map((letter, i) => (
                  <motion.span
                    key={i}
                    custom={i}
                    variants={letterVariants}
                    initial="hidden"
                    animate="visible"
                    className={`text-[17vw] sm:text-[12vw] font-black italic leading-none ${
                      i >= 3 ? 'text-[#C8962C]' : 'text-white'
                    }`}
                    style={{
                      textShadow: i >= 3
                        ? '0 0 80px rgba(200, 150, 44, 0.35)'
                        : '0 0 40px rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="text-[10px] uppercase tracking-[0.35em] text-white/25 mt-4 font-medium"
              >
                Private Members Club
              </motion.p>
            </div>

            {/* ENTER CTA */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, ...springSmooth }}
              className="flex flex-col items-center gap-6 w-full max-w-xs"
            >
              <button
                onClick={handleEnter}
                className="group relative w-full"
              >
                {/* Glow layer */}
                <div className="absolute inset-0 bg-[#C8962C] rounded-2xl blur-xl opacity-30 group-hover:opacity-50 group-active:opacity-60 transition-opacity" />
                {/* Button */}
                <div className="relative bg-[#C8962C] text-black font-black py-4 text-center text-sm uppercase tracking-[0.25em] rounded-2xl active:scale-[0.97] transition-transform">
                  Enter
                </div>
              </button>

              <button
                onClick={() => window.location.href = 'https://google.com'}
                className="text-white/15 text-[10px] uppercase tracking-[0.2em] hover:text-white/30 transition-colors"
              >
                Leave
              </button>
            </motion.div>

            {/* Legal footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.4 }}
              className="absolute bottom-0 left-0 right-0 p-5"
            >
              <p className="text-center text-[9px] text-white/20 leading-relaxed">
                By entering, you confirm you are{' '}
                <span className="text-white/30">18+</span> and agree to our{' '}
                <button
                  onClick={() => setShowLegal(s => !s)}
                  className="text-[#C8962C]/40 underline decoration-[#C8962C]/20 hover:text-[#C8962C]/60"
                >
                  Terms, Privacy &amp; Cookies
                </button>
              </p>
              <AnimatePresence>
                {showLegal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-[8px] text-white/15 leading-relaxed text-center space-y-1 overflow-hidden"
                  >
                    <p>Adults 18+ only. You must comply with local laws. No commercial sex work solicitation.</p>
                    <p>We collect minimal data for app functionality. See full Privacy Policy at hotmess.app/privacy.</p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <a href="/legal/terms" className="text-[#C8962C]/25 underline">Terms</a>
                      <span className="text-white/10">·</span>
                      <a href="/legal/privacy" className="text-[#C8962C]/25 underline">Privacy</a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            AUTH — Bottom sheet
            ═══════════════════════════════════════════════════════ */}
        {stage === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col justify-end min-h-[100dvh]"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springSmooth}
              className="bg-[#0D0D0D]/95 backdrop-blur-2xl border-t border-white/8 rounded-t-[28px] px-6 pt-8 pb-10"
            >
              {/* Drag indicator */}
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />

              {/* Header */}
              <div className="mb-7">
                <p className="text-[#C8962C] text-[9px] font-black uppercase tracking-[0.3em] mb-2">HOTMESS</p>
                <h2 className="text-white font-black text-[28px] leading-tight">
                  {isSignUp ? 'Create account' : 'Welcome back'}
                </h2>
                <p className="text-white/35 text-sm mt-1.5">
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
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#C8962C]/50 transition-colors"
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#C8962C]/50 transition-colors"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#C8962C]/50 pr-12 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl h-14 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50 mt-1"
                  style={{ boxShadow: '0 0 30px rgba(200, 150, 44, 0.2)' }}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Entering...</>
                    : <><ArrowRight className="w-4 h-4" /> {isSignUp ? 'Join HOTMESS' : 'Enter'}</>}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={() => setIsSignUp(s => !s)}
                  className="text-white/30 text-xs hover:text-white/60 transition-colors"
                >
                  {isSignUp
                    ? 'Already a member? Sign in'
                    : "New here? Create account"}
                </button>
                {!isSignUp && (
                  <button
                    onClick={() => { setResetEmail(email); setStage('forgot'); }}
                    className="text-[#C8962C]/50 text-xs hover:text-[#C8962C] transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <button
                onClick={() => setStage('splash')}
                className="mt-4 w-full text-white/15 text-[10px] text-center hover:text-white/30 transition-colors py-1 uppercase tracking-widest"
              >
                Back
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            FORGOT PASSWORD
            ═══════════════════════════════════════════════════════ */}
        {stage === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col justify-end min-h-[100dvh]"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={springSmooth}
              className="bg-[#0D0D0D]/95 backdrop-blur-2xl border-t border-white/8 rounded-t-[28px] px-6 pt-8 pb-10"
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />

              <button
                onClick={() => setStage('auth')}
                className="flex items-center gap-1.5 text-white/30 text-xs mb-6 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="mb-7">
                <div className="w-12 h-12 rounded-2xl bg-[#C8962C]/8 border border-[#C8962C]/15 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-[#C8962C]" />
                </div>
                <h2 className="text-white font-black text-2xl">Reset password</h2>
                <p className="text-white/35 text-sm mt-1.5">
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
                  className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#C8962C]/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl h-14 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : <><Mail className="w-4 h-4" /> Send Reset Link</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            RESET SENT — Confirmation
            ═══════════════════════════════════════════════════════ */}
        {stage === 'reset-sent' && (
          <motion.div
            key="reset-sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col justify-end min-h-[100dvh]"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={springSmooth}
              className="bg-[#0D0D0D]/95 backdrop-blur-2xl border-t border-white/8 rounded-t-[28px] px-6 pt-8 pb-10"
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />

              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...springSnap, delay: 0.2 }}
                  className="w-16 h-16 rounded-full bg-[#C8962C]/10 border-2 border-[#C8962C]/25 flex items-center justify-center mx-auto mb-5"
                >
                  <Mail className="w-7 h-7 text-[#C8962C]" />
                </motion.div>
                <h2 className="text-white font-black text-2xl mb-2">Check your inbox</h2>
                <p className="text-white/35 text-sm leading-relaxed">
                  We sent a reset link to
                </p>
                <p className="text-[#C8962C] text-sm font-bold mt-1 break-all">{resetEmail}</p>
                <p className="text-white/20 text-xs mt-3 leading-relaxed">
                  Click the link to set a new password. Check spam if needed.
                </p>
              </div>

              <button
                onClick={() => { setStage('auth'); setIsSignUp(false); }}
                className="mt-6 w-full bg-[#1C1C1E] border border-white/8 text-white font-black text-sm rounded-2xl h-14 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>

              <button
                onClick={() => { setResetEmail(''); setStage('forgot'); }}
                className="mt-3 w-full text-white/15 text-[10px] text-center hover:text-white/30 transition-colors py-1 uppercase tracking-widest"
              >
                Try a different email
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            DONE — Branded loading transition
            ═══════════════════════════════════════════════════════ */}
        {stage === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh]"
          >
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springSnap}
              className="text-3xl font-black italic text-white select-none"
            >
              HOT<span className="text-[#C8962C]">MESS</span>
            </motion.p>
            {/* Gold pulse ring */}
            <div className="mt-6 relative">
              <div className="w-10 h-10 rounded-full border-2 border-[#C8962C]/20 border-t-[#C8962C] animate-spin" />
            </div>
            <p className="mt-4 text-[9px] uppercase tracking-[0.4em] text-white/15">Loading</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
