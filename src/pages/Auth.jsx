/**
 * Auth — Sign in / Sign up
 *
 * Luxury noir-gold aesthetic matching AgeGate.
 * HOT = white, MESS = gold (#C8962C). Ambient glow behind card.
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const REDIRECT_DELAY_MS = 500;
const GOLD = '#C8962C';
const springSmooth = { type: 'spring', stiffness: 200, damping: 25 };

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error(error.message || 'Sign in failed');
        setLoading(false);
        return;
      }

      toast.success('Signed in!');
      setTimeout(() => {
        const redirect = searchParams.get('redirect') || '/';
        navigate(redirect);
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      toast.error(err.message || 'Sign in failed');
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error(error.message || 'Sign up failed');
        setLoading(false);
        return;
      }

      toast.success('Check your email to confirm your account');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info('Email reset not yet enabled');
  };

  const switchMode = (signUp) => {
    setIsSignUp(signUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white overflow-hidden p-4">
      {/* Ambient gold glow behind card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(200,150,44,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springSmooth}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, ...springSmooth }}
          className="text-center mb-7"
        >
          <p className="text-3xl font-black italic tracking-tight text-white leading-none">
            HOT<span style={{ color: GOLD }}>MESS</span>
          </p>
          <p className="text-[10px] tracking-[0.3em] text-white/20 uppercase font-black mt-2">
            Private Members Club
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, ...springSmooth }}
          className="bg-[#1C1C1E] border border-white/8 rounded-3xl p-7"
        >
          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'signup-header' : 'signin-header'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <h1 className="text-2xl font-black text-white">
                {isSignUp ? 'Join The Mess' : 'Welcome Back'}
              </h1>
              <p className="text-sm text-white/40 mt-1">
                {isSignUp ? 'Create your account below' : 'Sign in to continue'}
              </p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-[#0D0D0D] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-[#0D0D0D] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
              />
            </div>

            {/* Confirm Password (Sign Up only) */}
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#0D0D0D] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forgot Password (Sign In only) */}
            {!isSignUp && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-white/30 hover:text-[#C8962C] transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide mt-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              style={{
                background: GOLD,
                boxShadow: '0 0 30px rgba(200,150,44,0.25)',
              }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-5"
        >
          <p className="text-sm text-white/30">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => switchMode(false)}
                  className="font-black transition-colors"
                  style={{ color: GOLD }}
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                New here?{' '}
                <button
                  onClick={() => switchMode(true)}
                  className="font-black transition-colors"
                  style={{ color: GOLD }}
                >
                  Join The Mess
                </button>
              </>
            )}
          </p>
        </motion.div>

        {/* Fine print */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-white/15 text-[10px] text-center mt-4 uppercase tracking-[0.2em]"
        >
          18+ · Gay & Bi Men · London
        </motion.p>
      </motion.div>
    </div>
  );
}
