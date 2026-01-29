import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Play, ArrowRight, Check, MessageCircle } from 'lucide-react';
import { auth, base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createPageUrl } from '../../utils';
import TelegramLogin from '@/components/auth/TelegramLogin';

// Social provider icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

/**
 * HotmessSplash - Unified bold entry experience
 * 
 * Condenses: Age Gate + Cookie Consent + GDPR + Terms + Auth
 * Into ONE beautiful splash screen
 * 
 * Flow:
 * 1. SPLASH - Bold branding with "ENTER" (confirms 18+, cookies, terms in one action)
 * 2. AUTH - Simple email/password (inline, no page switch)
 * 3. DONE - Redirect to app
 */

// Audio track URL - replace with actual Ghosted track
const SPLASH_TRACK_URL = '/audio/ghosted-intro.mp3';

export default function HotmessSplash({ onComplete }) {
  const [stage, setStage] = useState('splash'); // splash, auth, complete
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showLegalNote, setShowLegalNote] = useState(false);
  const audioRef = useRef(null);

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const user = await base44.auth.me();
          // Check if user has completed basic setup
          if (user?.has_agreed_terms !== false) {
            handleComplete();
          }
        }
      } catch (e) {
        // Not authenticated, show splash
      }
    };
    checkAuth();
  }, []);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(SPLASH_TRACK_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        // Autoplay blocked, user needs to interact first
      });
    }
    setAudioPlaying(!audioPlaying);
  };

  const handleEnter = () => {
    // Single action confirms: 18+, cookies, terms, GDPR
    try {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('terms_accepted', 'true');
      sessionStorage.setItem('cookies_accepted', 'true');
    } catch (e) {
      // Storage not available
    }
    
    // Start music on interaction
    if (audioRef.current && !audioPlaying) {
      audioRef.current.play().catch(() => {});
      setAudioPlaying(true);
    }
    
    setStage('auth');
  };

  const handleExit = () => {
    window.location.href = 'https://google.com';
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { error } = await auth.signUp(email, password, {
          full_name: fullName,
        });
        if (error) throw error;

        // Auto sign in after signup
        const { error: signInError } = await auth.signIn(email, password);
        if (signInError) throw signInError;

        // Update user with consents
        await base44.auth.updateMe({
          has_agreed_terms: true,
          has_consented_data: true,
          has_consented_gps: true,
        });

        toast.success('Welcome to HOTMESS!');
        handleComplete();
      } else {
        // Sign in
        const { error } = await auth.signIn(email, password);
        if (error) throw error;

        toast.success('Welcome back!');
        handleComplete();
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    setStage('complete');
    
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Redirect or callback
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        window.location.href = createPageUrl('Home');
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
      {/* Background - Abstract gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1a0a14] to-black" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF1493]/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00D9FF]/20 rounded-full blur-[100px]"
        />
      </div>

      {/* Audio toggle */}
      <button
        onClick={toggleAudio}
        className="absolute top-6 right-6 z-50 p-3 bg-white/5 border border-white/10 hover:border-white/30 transition-all"
      >
        {audioPlaying ? (
          <Volume2 className="w-5 h-5 text-[#FF1493]" />
        ) : (
          <VolumeX className="w-5 h-5 text-white/40" />
        )}
      </button>

      <AnimatePresence mode="wait">
        {/* SPLASH STAGE */}
        {stage === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-12"
            >
              <h1 className="text-[15vw] md:text-[12vw] lg:text-[10vw] font-black italic tracking-tighter text-white leading-none">
                HOT<span className="text-[#FF1493]">MESS</span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg md:text-2xl font-bold uppercase tracking-[0.3em] text-white/60 mt-4"
              >
                Global Operating System
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-sm uppercase tracking-[0.2em] text-[#FF1493]/60 mt-2"
              >
                Platform • Radio • Records
              </motion.p>
            </motion.div>

            {/* Enter Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEnter}
                className="relative group"
              >
                <div className="absolute inset-0 bg-[#FF1493] blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative bg-[#FF1493] text-black font-black py-6 px-16 text-2xl uppercase italic hover:bg-white transition-colors">
                  <span className="flex items-center gap-3">
                    <Play className="w-6 h-6" />
                    ENTER
                  </span>
                </div>
              </motion.button>

              <button
                onClick={handleExit}
                className="text-white/30 text-xs uppercase tracking-widest hover:text-white/60 transition-colors py-2"
              >
                Exit Terminal
              </button>
            </motion.div>

            {/* Legal footer - condensed */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5"
            >
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                <p className="text-[10px] text-white/30 uppercase leading-relaxed">
                  By entering, you confirm you are <span className="text-white/50">18+</span> and agree to our{' '}
                  <button 
                    onClick={() => setShowLegalNote(!showLegalNote)}
                    className="text-[#FF1493]/60 hover:text-[#FF1493] underline"
                  >
                    Terms, Privacy & Cookies
                  </button>
                </p>
                <p className="text-[8px] text-white/20 font-mono">
                  HM-OS-V2.0 • © 2026 HOTMESS
                </p>
              </div>
              
              {/* Expandable legal note */}
              <AnimatePresence>
                {showLegalNote && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="text-[9px] text-white/40 max-w-2xl mx-auto text-center leading-relaxed">
                      We use cookies and collect location data for Right Now, beacons, and personalization. 
                      Your data is encrypted, never sold. 18+ only. 
                      Full terms at /legal/terms • Privacy at /legal/privacy
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* AUTH STAGE */}
        {stage === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6"
          >
            <div className="w-full max-w-md">
              {/* Mini logo */}
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-black italic text-center mb-8"
              >
                HOT<span className="text-[#FF1493]">MESS</span>
              </motion.h1>

              {/* Auth toggle */}
              <div className="flex mb-6">
                <button
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 py-3 text-sm font-black uppercase border-b-2 transition-all ${
                    !isSignUp 
                      ? 'border-[#FF1493] text-white' 
                      : 'border-white/10 text-white/40'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 py-3 text-sm font-black uppercase border-b-2 transition-all ${
                    isSignUp 
                      ? 'border-[#FF1493] text-white' 
                      : 'border-white/10 text-white/40'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Social Auth Buttons */}
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { error } = await auth.signInWithGoogle(
                        `${window.location.origin}/Auth?provider=google`
                      );
                      if (error) throw error;
                    } catch (error) {
                      toast.error(error.message || 'Google sign in failed');
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-100 text-black font-medium py-5"
                >
                  <GoogleIcon />
                  <span className="ml-3">Continue with Google</span>
                </Button>

                <Button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { error } = await auth.signInWithApple(
                        `${window.location.origin}/Auth?provider=apple`
                      );
                      if (error) throw error;
                    } catch (error) {
                      toast.error(error.message || 'Apple sign in failed');
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-black hover:bg-gray-900 text-white font-medium py-5 border border-white/20"
                >
                  <AppleIcon />
                  <span className="ml-3">Continue with Apple</span>
                </Button>

                {/* Telegram Login */}
                {!showTelegram ? (
                  <Button
                    type="button"
                    onClick={() => setShowTelegram(true)}
                    disabled={loading}
                    className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium py-5"
                  >
                    <TelegramIcon />
                    <span className="ml-3">Continue with Telegram</span>
                  </Button>
                ) : (
                  <div className="p-4 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded-lg">
                    <p className="text-sm text-white/80 mb-3 text-center">
                      Click the Telegram button to sign in
                    </p>
                    <TelegramLogin
                      onSuccess={(result) => {
                        if (result.linked || result.needsRegistration) {
                          setStage('complete');
                          setTimeout(() => {
                            onComplete?.();
                          }, 1500);
                        }
                      }}
                      onError={(err) => {
                        toast.error(err.message || 'Telegram login failed');
                        setShowTelegram(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTelegram(false)}
                      className="w-full mt-3 text-center text-xs text-white/40 hover:text-white"
                    >
                      ← Back to options
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-4 text-white/40">or with email</span>
                </div>
              </div>

              {/* Auth form */}
              <form onSubmit={handleAuth} className="space-y-4">
                <AnimatePresence mode="wait">
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={isSignUp}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/30 py-6"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 py-6"
                />

                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 py-6"
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF1493] hover:bg-white text-black font-black py-6 text-lg uppercase"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-black border-t-transparent rounded-full"
                    />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Back button */}
              <button
                onClick={() => setStage('splash')}
                className="w-full mt-6 py-3 text-white/40 text-xs uppercase tracking-widest hover:text-white/60 transition-colors"
              >
                ← Back to Splash
              </button>
            </div>
          </motion.div>
        )}

        {/* COMPLETE STAGE */}
        {stage === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-[#39FF14] rounded-full flex items-center justify-center mb-8"
            >
              <Check className="w-12 h-12 text-black" />
            </motion.div>
            <h2 className="text-4xl font-black uppercase text-white mb-4">You're In</h2>
            <p className="text-white/60">Loading HOTMESS...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Quick check if user needs to see splash
 */
export function needsSplash() {
  try {
    return sessionStorage.getItem('age_verified') !== 'true';
  } catch {
    return true;
  }
}
