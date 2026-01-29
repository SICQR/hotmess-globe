import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  LogIn, 
  UserPlus, 
  Loader2, 
  ArrowRight, 
  Check, 
  Crown, 
  Zap, 
  Star, 
  AtSign, 
  MessageCircle, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Mail,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import { validateUsername, validateDisplayName } from '@/lib/userPrivacy';
import FaceVerification from '@/components/auth/FaceVerification';
import TelegramLogin from '@/components/auth/TelegramLogin';

// Social provider icons (inline SVGs for brand accuracy)
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
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0088cc">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

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
    color: '#FF1493',
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
  const [step, setStep] = useState('auth'); // auth, forgot, reset, username, verification, membership, profile, welcome
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'apple' | 'telegram' | null
  const [selectedTier, setSelectedTier] = useState('basic');
  const [faceVerified, setFaceVerified] = useState(false);
  const [telegramData, setTelegramData] = useState(null);
  const [profileData, setProfileData] = useState({
    bio: '',
    city: 'London',
    profile_type: 'standard'
  });
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next');
  const mode = searchParams.get('mode');
  const provider = searchParams.get('provider');

  useEffect(() => {
    // Supabase recovery links typically land with tokens in the URL hash.
    // Example: /Auth?mode=reset#access_token=...&type=recovery
    const hash = (typeof window !== 'undefined' ? window.location.hash : '') || '';
    const looksLikeRecovery = hash.toLowerCase().includes('type=recovery');
    if (mode === 'reset' || looksLikeRecovery) {
      setStep('reset');
    }
    
    // Handle OAuth callback (Google, Apple)
    if (provider === 'google' || provider === 'apple') {
      handleOAuthCallback(provider);
    }
  }, [mode, provider]);

  // Handle OAuth callback after redirect
  const handleOAuthCallback = async (providerName) => {
    setLoading(true);
    try {
      const { data: { user }, error } = await auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        // Check if user needs to complete onboarding
        const profile = await base44.auth.me();
        
        if (!profile?.display_name) {
          toast.success(`Signed in with ${providerName}! Let's set up your profile.`);
          setStep('username');
        } else if (!profile?.onboarding_completed) {
          setStep('membership');
        } else {
          toast.success('Welcome back!');
          window.location.href = nextUrl || createPageUrl('Home');
        }
      }
    } catch (error) {
      toast.error(`${providerName} sign in failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Social Login Handlers
  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      const { error } = await auth.signInWithGoogle(
        `${window.location.origin}/Auth?provider=google${nextUrl ? `&next=${encodeURIComponent(nextUrl)}` : ''}`
      );
      if (error) throw error;
      // Redirect happens automatically
    } catch (error) {
      toast.error(error.message || 'Google sign in failed');
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    try {
      const { error } = await auth.signInWithApple(
        `${window.location.origin}/Auth?provider=apple${nextUrl ? `&next=${encodeURIComponent(nextUrl)}` : ''}`
      );
      if (error) throw error;
      // Redirect happens automatically
    } catch (error) {
      toast.error(error.message || 'Apple sign in failed');
      setSocialLoading(null);
    }
  };

  const handleTelegramSuccess = async (result) => {
    if (result.needsRegistration) {
      // Store telegram data and show registration form
      setTelegramData(result.telegramData);
      setTelegramUsername(result.telegramData.username || '');
      setDisplayName(result.telegramData.first_name || '');
      setShowEmailForm(true);
      setIsSignUp(true);
      toast.info('Please complete your registration');
    } else if (result.needsLogin) {
      toast.success('Check your email for login link');
    } else if (result.linked) {
      toast.success('Telegram connected!');
      const profile = await base44.auth.me();
      if (!profile?.display_name) {
        setStep('username');
      } else {
        window.location.href = nextUrl || createPageUrl('Home');
      }
    }
  };

  // Check if username is available
  const checkUsernameAvailability = async (usernameToCheck) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    const validation = validateUsername(usernameToCheck);
    if (!validation.valid) {
      setUsernameError(validation.error);
      setUsernameAvailable(false);
      return;
    }
    
    setCheckingUsername(true);
    setUsernameError('');
    
    try {
      // Check if username exists
      const existingUsers = await base44.entities.User.filter({ username: usernameToCheck.toLowerCase() });
      const isAvailable = !existingUsers || existingUsers.length === 0;
      setUsernameAvailable(isAvailable);
      if (!isAvailable) {
        setUsernameError('This username is already taken');
      }
    } catch (error) {
      console.error('Username check failed:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Validate display name on change
  useEffect(() => {
    if (displayName) {
      const validation = validateDisplayName(displayName);
      setDisplayNameError(validation.valid ? '' : validation.error);
    } else {
      setDisplayNameError('');
    }
  }, [displayName]);

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

        toast.success('Account created! Now choose your name...');
        // Go to username selection step instead of membership
        setStep('username');
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

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    
    // Validate display name is set
    const displayValidation = validateDisplayName(displayName);
    if (!displayValidation.valid) {
      setDisplayNameError(displayValidation.error);
      return;
    }
    
    // Username is optional but if provided, must be valid
    if (username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        setUsernameError(usernameValidation.error);
        return;
      }
      if (!usernameAvailable) {
        setUsernameError('This username is not available');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Update the user's profile with display_name and username
      const currentUser = await base44.auth.me();
      if (currentUser) {
        await base44.entities.User.update(currentUser.id, {
          display_name: displayName,
          username: username ? username.toLowerCase() : null,
          telegram_username: telegramUsername || null,
          ...(telegramData && {
            telegram_id: telegramData.id,
            telegram_first_name: telegramData.first_name,
            telegram_photo_url: telegramData.photo_url,
          }),
        });
      }
      
      toast.success('Profile name set! Verify your identity...');
      setStep('verification');
    } catch (error) {
      toast.error(error.message || 'Failed to save profile name');
    } finally {
      setLoading(false);
    }
  };

  // Face verification handlers
  const handleFaceVerified = async (result) => {
    setFaceVerified(true);
    try {
      const currentUser = await base44.auth.me();
      if (currentUser && result.image) {
        await base44.entities.User.update(currentUser.id, {
          face_verified: true,
          face_verified_at: result.timestamp,
          // In production, store the face image securely
        });
      }
    } catch (error) {
      console.error('Failed to save face verification:', error);
    }
    toast.success('Face verified! Choose your membership...');
    setStep('membership');
  };

  const handleSkipVerification = () => {
    toast.info('You can verify your face later in settings');
    setStep('membership');
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
      setStep('profile');
    } catch (error) {
      toast.error('Failed to set membership');
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
            {/* HOTMESS Splash Header */}
            <div className="text-center mb-8">
              <motion.h1 
                className="text-6xl font-black uppercase tracking-tighter mb-2"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.4 }}
              >
                HOT<span className="text-[#FF1493]">MESS</span>
              </motion.h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">Global OS for Gay Men</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase mb-2">
                  {isSignUp ? 'Join The Mess' : 'Welcome Back'}
                </h2>
                <p className="text-white/60 text-sm">
                  {isSignUp ? 'Create your account' : 'Sign in to continue'}
                </p>
              </div>

              {/* Social Login Buttons - Primary */}
              {!showEmailForm && (
                <div className="space-y-3 mb-6">
                  {/* Google Login */}
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={socialLoading !== null}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-6 text-base"
                  >
                    {socialLoading === 'google' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <GoogleIcon />
                        <span className="ml-3">Continue with Google</span>
                      </>
                    )}
                  </Button>

                  {/* Apple Login */}
                  <Button
                    type="button"
                    onClick={handleAppleLogin}
                    disabled={socialLoading !== null}
                    className="w-full bg-black hover:bg-gray-900 text-white font-medium py-6 text-base border border-white/20"
                  >
                    {socialLoading === 'apple' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <AppleIcon />
                        <span className="ml-3">Continue with Apple</span>
                      </>
                    )}
                  </Button>

                  {/* Telegram Login */}
                  <Button
                    type="button"
                    onClick={() => {
                      setSocialLoading('telegram');
                      // Show Telegram widget or handle inline
                    }}
                    disabled={socialLoading !== null}
                    className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium py-6 text-base"
                  >
                    {socialLoading === 'telegram' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <TelegramIcon />
                        <span className="ml-3">Continue with Telegram</span>
                      </>
                    )}
                  </Button>

                  {/* Telegram Widget (shown when telegram is selected) */}
                  {socialLoading === 'telegram' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-4"
                    >
                      <TelegramLogin
                        onSuccess={handleTelegramSuccess}
                        onError={(err) => {
                          toast.error(err.message || 'Telegram login failed');
                          setSocialLoading(null);
                        }}
                      />
                    </motion.div>
                  )}

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-black px-4 text-xs text-white/40 uppercase tracking-wider">
                        or continue with email
                      </span>
                    </div>
                  </div>

                  {/* Email Option Button */}
                  <Button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/5 py-6"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Use Email & Password
                  </Button>
                </div>
              )}

              {/* Email/Password Form - Secondary */}
              {showEmailForm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
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
                      <div className="relative">
                        <Input
                          id="auth-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          required
                          minLength={6}
                          className="bg-black/50 border-white/20 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase py-6 text-lg"
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

                  {/* Back to Social Login */}
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="w-full text-center text-sm text-white/40 hover:text-white mt-4 py-2"
                  >
                    ← Back to social login options
                  </button>
                </motion.div>
              )}

              {/* Toggle Sign Up / Sign In */}
              <div className="text-center pt-4 border-t border-white/10 mt-6">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setShowEmailForm(false);
                  }}
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
                HOT<span className="text-[#FF1493]">MESS</span>
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
                  className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase py-6 text-lg"
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
                HOT<span className="text-[#FF1493]">MESS</span>
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
                  className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase py-6 text-lg"
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

        {/* USERNAME STEP - Required before membership */}
        {step === 'username' && (
          <motion.div
            key="username"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">
                HOT<span className="text-[#FF1493]">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">Choose Your Identity</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8">
              {/* Privacy Notice */}
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Your Email is Private</p>
                    <p className="text-xs text-white/60 mt-1">
                      Other users will only see your display name. Your email is never shared.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase mb-2">Set Your Name</h2>
                <p className="text-white/60 text-sm">This is how others will see you</p>
              </div>

              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                {/* Display Name - Required */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                    Display Name <span className="text-[#FF1493]">*</span>
                  </label>
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How you want to be called"
                    required
                    className={`bg-black/50 ${displayNameError ? 'border-red-500' : 'border-white/20'}`}
                  />
                  {displayNameError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {displayNameError}
                    </p>
                  )}
                  <p className="text-xs text-white/40 mt-1">
                    This will be shown on your profile and in chats
                  </p>
                </div>

                {/* Username - Optional */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                    Username <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="unique_username"
                      className={`bg-black/50 pl-9 ${usernameError ? 'border-red-500' : usernameAvailable === true ? 'border-emerald-500' : 'border-white/20'}`}
                    />
                    {checkingUsername && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
                    )}
                    {!checkingUsername && usernameAvailable === true && username && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  {usernameError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {usernameError}
                    </p>
                  )}
                  {!usernameError && usernameAvailable === true && username && (
                    <p className="text-xs text-emerald-400 mt-1">✓ Username available</p>
                  )}
                  <p className="text-xs text-white/40 mt-1">
                    Only letters, numbers, and underscores. Can be changed later.
                  </p>
                </div>

                {/* Telegram Username - Optional */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                    Telegram Username <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0088cc]" />
                    <Input
                      type="text"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ''))}
                      placeholder="your_telegram"
                      className="bg-black/50 pl-9 border-white/20"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Connect your Telegram for enhanced messaging
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !displayName || displayNameError || (username && (usernameError || !usernameAvailable))}
                  className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase py-6 text-lg mt-6"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* FACE VERIFICATION STEP - Optional but encouraged */}
        {step === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">
                HOT<span className="text-[#FF1493]">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">Verify Your Identity</p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-8">
              {/* Benefits Banner */}
              <div className="mb-6 p-4 bg-[#FF1493]/10 border border-[#FF1493]/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF1493]/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#FF1493]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#FF1493]">Get Verified Badge</p>
                    <p className="text-xs text-white/60 mt-1">
                      Verified users get 3x more matches and build trust faster.
                      Your face data is encrypted and never shared.
                    </p>
                  </div>
                </div>
              </div>

              <FaceVerification
                onVerified={handleFaceVerified}
                onCancel={handleSkipVerification}
                isOptional={true}
                showUploadOption={true}
              />
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
                        ? 'border-[#FF1493] bg-[#FF1493]/10'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FF1493] text-black text-xs font-black uppercase">
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
                        className="absolute inset-0 border-2 border-[#FF1493] pointer-events-none"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="text-center">
              <Button
                onClick={handleMembership}
                disabled={loading}
                size="xl"
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase px-12"
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
                        ? 'border-[#FF1493] bg-[#FF1493]/10'
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
                        ? 'border-[#FF1493] bg-[#FF1493]/10'
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
                  className="w-full bg-black/50 border-2 border-white/20 p-3 text-white placeholder:text-white/40 focus:border-[#FF1493] focus:outline-none"
                />
              </div>

              <Button
                onClick={handleProfile}
                disabled={loading}
                className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase py-6 text-lg"
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
              className="w-32 h-32 bg-[#FF1493] flex items-center justify-center mx-auto mb-8"
            >
              <Check className="w-16 h-16 text-black" />
            </motion.div>
            <h2 className="text-6xl font-black uppercase mb-6">
              WELCOME TO<br />HOT<span className="text-[#FF1493]">MESS</span>
            </h2>
            <p className="text-2xl text-white/80 mb-4">You're all set!</p>
            <p className="text-white/60 mb-8">Redirecting you to the app...</p>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-[#FF1493] animate-pulse" />
              <div className="w-2 h-2 bg-[#FF1493] animate-pulse delay-75" />
              <div className="w-2 h-2 bg-[#FF1493] animate-pulse delay-150" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}