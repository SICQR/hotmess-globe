import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const REDIRECT_DELAY_MS = 500;

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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#0D0D0D] to-[#050507] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <span className="text-2xl font-black text-[#C8962C] tracking-tighter">
              HOTMESS
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-black text-white uppercase tracking-tighter mb-1"
          >
            {isSignUp ? 'Join The Mess' : 'Welcome Back'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-[#8E8E93]"
          >
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </motion.p>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-[#1C1C1E] border border-white/10 rounded-xl p-6 mb-6"
        >
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-2">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-black/40 border border-white/10 text-white placeholder:text-white/30 focus:border-[#C8962C] focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-black/40 border border-white/10 text-white placeholder:text-white/30 focus:border-[#C8962C] focus:outline-none disabled:opacity-50"
              />
            </div>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-black/40 border border-white/10 text-white placeholder:text-white/30 focus:border-[#C8962C] focus:outline-none disabled:opacity-50"
                />
              </div>
            )}

            {/* Forgot Password Link (Sign In only) */}
            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-[#8E8E93] hover:text-[#C8962C] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C8962C] hover:bg-[#B07F1F] text-black font-black uppercase py-3 text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Toggle Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <p className="text-sm text-[#8E8E93]">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-[#C8962C] hover:text-[#B07F1F] font-bold transition-colors"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-[#C8962C] hover:text-[#B07F1F] font-bold transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <p className="text-xs text-[#8E8E93] uppercase tracking-wider">
            18+ · Gay & Bi Men · London
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
