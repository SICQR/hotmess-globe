import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus, Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import TelegramLogin from './TelegramLogin';

/**
 * AuthModal - Unified inline authentication modal
 * 
 * Use this when you need to prompt users to sign in without
 * navigating away from their current page (e.g., checkout, follow, message).
 * 
 * @example
 * <AuthModal 
 *   open={showAuth} 
 *   onClose={() => setShowAuth(false)}
 *   onSuccess={() => { setShowAuth(false); doAction(); }}
 *   title="Sign in to continue"
 *   subtitle="You need an account to send messages"
 * />
 */

const MODAL_Z_INDEX = 'z-[100]';

export default function AuthModal({
  open,
  onClose,
  onSuccess,
  title = 'Sign in to continue',
  subtitle,
  // Options
  allowSignup = true,
  allowMagicLink = true,
  allowTelegram = true,
  defaultMode = 'signin', // signin | signup | magic
  // For magic link only flows
  magicLinkOnly = false,
}) {
  const [mode, setMode] = useState(defaultMode);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setMode(magicLinkOnly ? 'magic' : defaultMode);
      setEmail('');
      setPassword('');
      setFullName('');
    }
  }, [open, defaultMode, magicLinkOnly]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await auth.signIn(email, password);
      if (error) throw error;
      
      toast.success('Welcome back!');
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await auth.signUp(email, password, { full_name: fullName });
      if (error) throw error;
      
      // Auto sign in after signup
      const { error: signInError } = await auth.signIn(email, password);
      if (signInError) throw signInError;
      
      toast.success('Account created!');
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    
    setLoading(true);
    
    try {
      const redirectTo = window.location.href;
      const { error } = await auth.signInWithOtp(email, redirectTo);
      if (error) throw error;
      
      toast.success('Check your email for the magic link!');
      setMode('magic-sent');
    } catch (error) {
      toast.error(error.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramSuccess = (result) => {
    if (result.linked) {
      toast.success('Telegram connected!');
      onSuccess?.();
    } else if (result.needsLogin) {
      toast.info(result.message);
    } else if (result.needsRegistration) {
      toast.info('Please sign up first, then link Telegram');
      setMode('signup');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className={cn('fixed inset-0', MODAL_Z_INDEX)}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-black border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF1493] via-[#B026FF] to-[#00D9FF]" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
                {subtitle && <p className="text-white/60 text-sm mt-1">{subtitle}</p>}
              </div>

              <AnimatePresence mode="wait">
                {/* Sign In Form */}
                {mode === 'signin' && (
                  <motion.form
                    key="signin"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleSignIn}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="pl-10 bg-white/5 border-white/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="pl-10 bg-white/5 border-white/10"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      variant="hotGlow"
                      className="w-full font-black uppercase py-5"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>

                    {/* Options */}
                    <div className="flex items-center justify-between text-sm pt-2">
                      {allowMagicLink && (
                        <button
                          type="button"
                          onClick={() => setMode('magic')}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          Use magic link
                        </button>
                      )}
                      {allowSignup && (
                        <button
                          type="button"
                          onClick={() => setMode('signup')}
                          className="text-[#00D9FF] font-bold hover:underline"
                        >
                          Create account
                        </button>
                      )}
                    </div>
                  </motion.form>
                )}

                {/* Sign Up Form */}
                {mode === 'signup' && (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSignUp}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="pl-10 bg-white/5 border-white/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="pl-10 bg-white/5 border-white/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          minLength={6}
                          className="pl-10 bg-white/5 border-white/10"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      variant="hotGlow"
                      className="w-full font-black uppercase py-5"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>

                    <div className="text-center text-sm pt-2">
                      <button
                        type="button"
                        onClick={() => setMode('signin')}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-3 h-3 inline mr-1" />
                        Back to sign in
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Magic Link Form */}
                {mode === 'magic' && (
                  <motion.form
                    key="magic"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleMagicLink}
                    className="space-y-4"
                  >
                    <p className="text-white/60 text-sm text-center">
                      We'll email you a secure sign-in link. No password needed.
                    </p>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="pl-10 bg-white/5 border-white/10"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black uppercase py-5"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Magic Link
                        </>
                      )}
                    </Button>

                    {!magicLinkOnly && (
                      <div className="text-center text-sm pt-2">
                        <button
                          type="button"
                          onClick={() => setMode('signin')}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <ArrowLeft className="w-3 h-3 inline mr-1" />
                          Back to sign in
                        </button>
                      </div>
                    )}
                  </motion.form>
                )}

                {/* Magic Link Sent */}
                {mode === 'magic-sent' && (
                  <motion.div
                    key="magic-sent"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 bg-[#00D9FF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-[#00D9FF]" />
                    </div>
                    <h3 className="text-xl font-black uppercase mb-2">Check Your Email</h3>
                    <p className="text-white/60 text-sm mb-4">
                      We sent a magic link to <span className="text-white font-medium">{email}</span>
                    </p>
                    <p className="text-white/40 text-xs">
                      Click the link in the email to sign in. The link expires in 10 minutes.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMode('magic')}
                      className="mt-4 text-sm text-white/60 hover:text-white transition-colors"
                    >
                      Didn't receive it? Send again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Telegram Login */}
              {allowTelegram && mode !== 'magic-sent' && !magicLinkOnly && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-white/40 uppercase tracking-wider text-center mb-4">
                    Or continue with
                  </p>
                  <TelegramLogin
                    onSuccess={handleTelegramSuccess}
                    onError={(err) => toast.error('Telegram auth failed')}
                    buttonSize="large"
                  />
                </div>
              )}

              {/* Terms */}
              {(mode === 'signup' || mode === 'magic') && (
                <p className="text-[10px] text-white/30 text-center mt-4">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
