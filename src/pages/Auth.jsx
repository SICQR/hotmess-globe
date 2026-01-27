import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, base44, supabase } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, Loader2, ArrowRight, Check, Crown, Zap, Star, AtSign, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

// Username validation regex: alphanumeric and underscores, 3-20 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'At least 3 characters required' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Maximum 20 characters' };
  }
  
  if (!USERNAME_REGEX.test(trimmed)) {
    return { valid: false, error: 'Letters, numbers, and underscores only' };
  }
  
  const reserved = ['admin', 'hotmess', 'support', 'help', 'moderator', 'mod', 'system'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true, username: trimmed };
};

const MEMBERSHIP_TIERS = [
  {
    id: 'basic',
    name: 'FREE',
    price: '£0',
    color: '#FFFFFF',
    features: ['Basic profile', 'Browse events & market', 'Social: limited threads/day', 'Beacons: 1/day', 'Calendar: basic'],
    icon: Star
  },
  {
    id: 'plus',
    name: 'PLUS',
    price: '£9.99/mo',
    color: '#E62020',
    features: ['Everything in FREE', 'Social: more threads + sorting', 'Saved filter presets', 'More beacons + privacy controls', 'Extended calendar'],
    icon: Zap,
    popular: true
  },
  {
    id: 'pro',
    name: 'CHROME',
    price: '£19.99/mo',
    color: '#00D9FF',
    features: ['Everything in PLUS', 'Visibility boost (non-spam)', 'Advanced Pulse layers', 'Music: early access', 'Full stats dashboard'],
    icon: Crown
  }
];

export default function Auth() {
  const [step, setStep] = useState('auth'); // auth, forgot, reset, membership, username, profile, welcome
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [profileData, setProfileData] = useState({
    bio: '',
    city: 'London',
    profile_type: 'standard'
  });
  
  // Username state
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Telegram state
  const [telegramUsername, setTelegramUsername] = useState(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [importingTelegram, setImportingTelegram] = useState(false);
  
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next');
  const mode = searchParams.get('mode');
  
  // Check for existing Telegram connection when entering username step
  useEffect(() => {
    const checkTelegram = async () => {
      if (step !== 'username') return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        
        const response = await fetch('/api/telegram/status', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.connected && data.username) {
            setTelegramConnected(true);
            setTelegramUsername(data.username);
          }
        }
      } catch (err) {
        // Ignore errors - Telegram is optional
      }
    };
    
    checkTelegram();
  }, [step]);
  
  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (usernameToCheck) => {
    const validation = validateUsername(usernameToCheck);
    
    if (!validation.valid) {
      setUsernameError(validation.error);
      setUsernameAvailable(null);
      return;
    }
    
    setCheckingUsername(true);
    setUsernameError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token 
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      
      const response = await fetch(`/api/username/check?username=${encodeURIComponent(validation.username)}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.available);
        if (!data.available && data.error) {
          setUsernameError(data.error);
        }
      }
    } catch (err) {
      setUsernameError('Failed to check availability');
    } finally {
      setCheckingUsername(false);
    }
  }, []);
  
  // Debounce username check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [username, checkUsernameAvailability]);
  
  // Import username from Telegram
  const handleImportTelegramUsername = async () => {
    if (!telegramUsername) return;
    
    setImportingTelegram(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expired. Please sign in again.');
        return;
      }
      
      const response = await fetch('/api/telegram/import-username', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUsername(data.username);
        setUsernameAvailable(true);
        setUsernameError('');
        toast.success('Username imported from Telegram!');
      } else {
        if (data.available === false) {
          // Username already taken, let user choose a different one
          setUsername(telegramUsername);
          toast.error(data.error || 'Username already taken');
        } else {
          toast.error(data.error || 'Failed to import username');
        }
      }
    } catch (err) {
      toast.error('Failed to import Telegram username');
    } finally {
      setImportingTelegram(false);
    }
  };

  useEffect(() => {
    // Handle step parameter for direct navigation (e.g., from Layout username requirement redirect)
    const stepParam = searchParams.get('step');
    if (stepParam === 'username') {
      setStep('username');
      return;
    }
    
    // Supabase recovery links typically land with tokens in the URL hash.
    // Example: /Auth?mode=reset#access_token=...&type=recovery
    const hash = (typeof window !== 'undefined' ? window.location.hash : '') || '';
    const looksLikeRecovery = hash.toLowerCase().includes('type=recovery');
    if (mode === 'reset' || looksLikeRecovery) {
      setStep('reset');
    }
  }, [mode, searchParams]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await auth.signUp(email, password, {
          full_name: fullName,
        });

        if (error) throw error;

        const { error: signInError } = await auth.signIn(email, password);
        if (signInError) throw signInError;

        toast.success('Account created! Let\'s set you up...');
        setStep('membership');
      } else {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;

        toast.success('Welcome back!');
        setTimeout(() => {
          window.location.href = nextUrl || createPageUrl('Home');
        }, 500);
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const { protocol, hostname, port, origin } = window.location;
      const isDevLoopback = hostname === '127.0.0.1' || hostname === '0.0.0.0';
      const safeOrigin = isDevLoopback
        ? `${protocol}//localhost${port ? `:${port}` : ''}`
        : origin;
      const redirectTo = `${safeOrigin}${createPageUrl('Auth')}?mode=reset`;
      const { error } = await auth.resetPasswordForEmail(email, redirectTo);
      if (error) throw error;

      toast.success("If an account exists for that email, you'll receive a reset link shortly.");
      setStep('auth');
    } catch (error) {
      toast.error(error?.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await auth.getSession();
      if (!sessionData?.session) {
        throw new Error('Reset link is invalid or expired. Please request a new one.');
      }

      const { error } = await auth.updatePassword(newPassword);
      if (error) throw error;

      toast.success('Password updated! Please sign in.');
      await auth.signOut();
      setNewPassword('');
      setConfirmPassword('');
      setStep('auth');
    } catch (error) {
      toast.error(error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleMembership = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        membership_tier: selectedTier,
        subscription_status: selectedTier === 'basic' ? 'active' : 'trial'
      });
      toast.success('Membership selected!');
      setStep('username'); // Go to username step first
    } catch (error) {
      toast.error('Failed to set membership');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUsername = async () => {
    // Validate username
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameError(validation.error);
      return;
    }
    
    if (!usernameAvailable) {
      setUsernameError('Please choose an available username');
      return;
    }
    
    setLoading(true);
    try {
      await base44.auth.updateMe({
        username: validation.username,
        username_required: false // Clear the flag once username is set
      });
      toast.success('Username set!');
      
      // If user was redirected here to set username (step=username in URL),
      // redirect to the next URL instead of continuing onboarding
      const stepParam = searchParams.get('step');
      if (stepParam === 'username' && nextUrl) {
        window.location.href = nextUrl;
        return;
      }
      
      setStep('profile');
    } catch (error) {
      toast.error('Failed to set username');
    } finally {
      setLoading(false);
    }
  };

  const handleProfile = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        ...profileData,
        onboarding_completed: true
      });
      setStep('welcome');
      setTimeout(() => {
        window.location.href = nextUrl || createPageUrl('Home');
      }, 3000);
    } catch (error) {
      toast.error('Failed to update profile');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">
                HOT<span className="text-[#E62020]">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">LONDON OS</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase mb-2">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-white/60 text-sm">
                  {isSignUp ? 'Join the mess' : 'Sign in to continue'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label
                      htmlFor="auth-full-name"
                      className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                    >
                      Full Name
                    </label>
                    <Input
                      id="auth-full-name"
                      name="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      className="bg-black/50 border-white/20"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                  >
                    Email
                  </label>
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="bg-black/50 border-white/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs uppercase tracking-wider text-white/60 mb-2"
                  >
                    Password
                  </label>
                  <Input
                    id="auth-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    minLength={6}
                    className="bg-black/50 border-white/20"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black font-black uppercase py-6 text-lg"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create Account
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {!isSignUp && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setStep('forgot')}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="text-center pt-4 border-t border-white/10 mt-6">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <span className="text-[#00D9FF] font-bold">Sign In</span>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <span className="text-[#00D9FF] font-bold">Sign Up</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-white/40 mt-6 uppercase tracking-wider">
              By continuing, you agree to our Terms & Privacy Policy
            </p>
          </motion.div>
        )}

        {step === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">
                HOT<span className="text-[#E62020]">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">LONDON OS</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase mb-2">Reset Password</h2>
                <p className="text-white/60 text-sm">We’ll email you a reset link</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="bg-black/50 border-white/20"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black font-black uppercase py-6 text-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>

              <div className="text-center pt-4 border-t border-white/10 mt-6">
                <button
                  type="button"
                  onClick={() => setStep('auth')}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'reset' && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">
                HOT<span className="text-[#E62020]">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">LONDON OS</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase mb-2">Set New Password</h2>
                <p className="text-white/60 text-sm">Choose a new password to continue</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    className="bg-black/50 border-white/20"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                    className="bg-black/50 border-white/20"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black font-black uppercase py-6 text-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                </Button>
              </form>

              <div className="text-center pt-4 border-t border-white/10 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword('');
                    setConfirmPassword('');
                    setStep('auth');
                  }}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'membership' && (
          <motion.div
            key="membership"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-5xl"
          >
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black uppercase mb-3">CHOOSE YOUR TIER</h2>
              <p className="text-white/60 text-lg">Start free, upgrade anytime</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {MEMBERSHIP_TIERS.map((tier) => {
                const Icon = tier.icon;
                return (
                  <motion.button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-6 border-2 transition-all ${
                      selectedTier === tier.id
                        ? 'border-[#E62020] bg-[#E62020]/10'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#E62020] text-black text-xs font-black uppercase">
                        POPULAR
                      </div>
                    )}
                    <div className="text-center mb-6">
                      <Icon className="w-12 h-12 mx-auto mb-4" style={{ color: tier.color }} />
                      <h3 className="text-3xl font-black uppercase mb-2">{tier.name}</h3>
                      <p className="text-2xl font-bold" style={{ color: tier.color }}>{tier.price}</p>
                    </div>
                    <ul className="space-y-3 text-left">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 mt-0.5 text-[#39FF14] flex-shrink-0" />
                          <span className="text-white/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {selectedTier === tier.id && (
                      <motion.div
                        layoutId="selected"
                        className="absolute inset-0 border-2 border-[#E62020] pointer-events-none"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="text-center space-y-4">
              <Button
                onClick={handleMembership}
                disabled={loading}
                size="xl"
                className="bg-[#E62020] hover:bg-[#E62020]/90 text-black font-black uppercase px-12"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <div>
                <button
                  onClick={() => {
                    setSelectedTier('basic');
                    setStep('username');
                  }}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors underline"
                >
                  Skip for now, stay on free tier
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'username' && (
          <motion.div
            key="username"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black uppercase mb-3">CHOOSE YOUR USERNAME</h2>
              <p className="text-white/60">This is how others will find you. Your email and personal details stay private.</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8 space-y-6">
              {/* Telegram Import Option */}
              {telegramConnected && telegramUsername && (
                <div className="p-4 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageCircle className="w-5 h-5" style={{ color: '#0088cc' }} />
                    <span className="text-sm text-white/80">Telegram connected</span>
                  </div>
                  <p className="text-sm text-white/60 mb-3">
                    Import your Telegram username: <span className="text-[#0088cc] font-bold">@{telegramUsername}</span>
                  </p>
                  <Button
                    onClick={handleImportTelegramUsername}
                    disabled={importingTelegram}
                    variant="outline"
                    className="w-full border-[#0088cc]/50 text-[#0088cc] hover:bg-[#0088cc]/10"
                  >
                    {importingTelegram ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <MessageCircle className="w-4 h-4 mr-2" />
                    )}
                    Use @{telegramUsername}
                  </Button>
                </div>
              )}

              <div>
                <label className="block text-sm uppercase tracking-wider text-white/60 mb-3">
                  Username
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setUsername(val);
                      setUsernameError('');
                      setUsernameAvailable(null);
                    }}
                    placeholder="your_username"
                    className="bg-black/50 border-white/20 pl-10 pr-10"
                    maxLength={20}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && (
                      <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                    )}
                    {!checkingUsername && usernameAvailable === true && (
                      <CheckCircle2 className="w-5 h-5 text-[#39FF14]" />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                
                {/* Username feedback */}
                <div className="mt-2 min-h-[20px]">
                  {usernameError && (
                    <p className="text-xs text-red-400">{usernameError}</p>
                  )}
                  {!usernameError && usernameAvailable === true && (
                    <p className="text-xs text-[#39FF14]">Username available!</p>
                  )}
                  {!usernameError && username.length > 0 && username.length < 3 && (
                    <p className="text-xs text-white/40">At least 3 characters</p>
                  )}
                </div>
                
                <p className="text-xs text-white/40 mt-2">
                  3-20 characters. Letters, numbers, and underscores only.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-start gap-3 p-3 bg-[#B026FF]/10 border border-[#B026FF]/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-[#B026FF] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-white/80 font-medium">Privacy First</p>
                    <p className="text-xs text-white/60 mt-1">
                      Your email and personal details are never shown to other users. Only your username is visible.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUsername}
                disabled={loading || !usernameAvailable}
                className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black font-black uppercase py-6 text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black uppercase mb-3">COMPLETE YOUR PROFILE</h2>
              <p className="text-white/60">Tell us a bit about yourself</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8 space-y-6">
              <div>
                <label className="block text-sm uppercase tracking-wider text-white/60 mb-3">
                  Profile Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setProfileData({ ...profileData, profile_type: 'standard' })}
                    className={`p-4 border-2 transition-all ${
                      profileData.profile_type === 'standard'
                        ? 'border-[#E62020] bg-[#E62020]/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <p className="font-black uppercase mb-1">STANDARD</p>
                    <p className="text-xs text-white/60">Regular profile</p>
                  </button>
                  <button
                    onClick={() => setProfileData({ ...profileData, profile_type: 'seller' })}
                    className={`p-4 border-2 transition-all ${
                      profileData.profile_type === 'seller'
                        ? 'border-[#E62020] bg-[#E62020]/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <p className="font-black uppercase mb-1">SELLER</p>
                    <p className="text-xs text-white/60">Sell products/services</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm uppercase tracking-wider text-white/60 mb-3">
                  City
                </label>
                <Input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  placeholder="London"
                  className="bg-black/50 border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm uppercase tracking-wider text-white/60 mb-3">
                  Bio (Optional)
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full bg-black/50 border-2 border-white/20 p-3 text-white placeholder:text-white/40 focus:border-[#E62020] focus:outline-none"
                />
              </div>

              <Button
                onClick={handleProfile}
                disabled={loading}
                className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black font-black uppercase py-6 text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Complete Setup
                    <Check className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-32 h-32 bg-[#E62020] flex items-center justify-center mx-auto mb-8"
            >
              <Check className="w-16 h-16 text-black" />
            </motion.div>
            <h2 className="text-6xl font-black uppercase mb-6">
              WELCOME TO<br />HOT<span className="text-[#E62020]">MESS</span>
            </h2>
            <p className="text-2xl text-white/80 mb-4">You're all set!</p>
            <p className="text-white/60 mb-8">Redirecting you to the app...</p>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-[#E62020] animate-pulse" />
              <div className="w-2 h-2 bg-[#E62020] animate-pulse delay-75" />
              <div className="w-2 h-2 bg-[#E62020] animate-pulse delay-150" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}