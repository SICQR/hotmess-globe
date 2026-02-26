import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, base44, supabase } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, Loader2, ArrowRight, Check, Crown, Zap, Star, Upload, User } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import TelegramLogin from '@/components/auth/TelegramLogin';

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
    color: '#C8962C',
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

const REDIRECT_DELAY_MS = 500; // Short delay for toast visibility before redirect

export default function Auth() {
  const [step, setStep] = useState('auth'); // auth, forgot, reset, membership, profile, welcome
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [photoPolicyAck, setPhotoPolicyAck] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nextUrl = searchParams.get('next');
  const mode = searchParams.get('mode');

  // Helper function to check if user profile is complete
  const checkProfileComplete = async (userId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_complete, display_name')
        .eq('account_id', userId)
        .maybeSingle();
      // If profile row is missing or onboarding not done, send to Profile setup
      return !!(profile?.onboarding_complete);
    } catch {
      return false;
    }
  };

  // Helper function to handle post-auth redirects
  const performRedirectAfterAuth = async (session) => {
    // Check if profile is complete before redirecting
    const userId = session?.user?.id;
    if (userId) {
      const isComplete = await checkProfileComplete(userId);
      if (!isComplete) {
        // Redirect to Profile for setup
        setTimeout(() => {
          navigate(createPageUrl('Profile'));
        }, REDIRECT_DELAY_MS);
        return;
      }
    }
    
    const redirect = nextUrl || searchParams.get('redirect_to') || createPageUrl('Home');
    setTimeout(() => {
      navigate(redirect);
    }, REDIRECT_DELAY_MS);
  };

  // Listen to Supabase auth state changes (for OAuth callbacks and password recovery)
  useEffect(() => {
    const { data: authSubscription } = auth.onAuthStateChange(async (event, session) => {
      // Recovery link clicked → Supabase fires PASSWORD_RECOVERY (not SIGNED_IN).
      // Show the reset-password form regardless of the current step.
      if (event === 'PASSWORD_RECOVERY') {
        setStep('reset');
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        // Only redirect if we're not already showing the membership/profile/reset steps
        if (step === 'auth') {
          toast.success('Welcome back!');
          performRedirectAfterAuth(session);
        }
      }
    });

    return () => {
      authSubscription?.subscription?.unsubscribe();
    };
  }, [step, nextUrl, searchParams]);

  useEffect(() => {
    // Handle OAuth callbacks (Google, etc.)
    const handleOAuthCallback = async () => {
      const hash = (typeof window !== 'undefined' ? window.location.hash : '') || '';
      const looksLikeRecovery = hash.toLowerCase().includes('type=recovery');
      
      // Recovery link: confirm session exists (Supabase auto-exchanges the hash token)
      // before showing the reset form so the updatePassword call won't fail.
      if (mode === 'reset' || looksLikeRecovery) {
        try {
          const { data } = await auth.getSession();
          if (data?.session) {
            setStep('reset');
          } else {
            // Token not yet exchanged — wait for PASSWORD_RECOVERY event from onAuthStateChange
            setStep('reset');
          }
        } catch {
          setStep('reset');
        }
        return;
      }

      // Check if this is an OAuth callback (has access_token or code in hash)
      const hasOAuthToken = hash.includes('access_token=') || hash.includes('code=');
      
      if (hasOAuthToken) {
        setLoading(true);
        try {
          // Supabase automatically exchanges the token
          const { data, error } = await auth.getSession();
          
          if (error) {
            console.error('[Auth] OAuth callback error:', error);
            toast.error('Authentication failed. Please try again.');
            setLoading(false);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }

          if (data?.session) {
            // Successfully authenticated
            toast.success('Welcome back!');
            
            // Redirect to intended page or home
            setTimeout(() => {
              const redirect = nextUrl || searchParams.get('redirect_to') || createPageUrl('Home');
              navigate(redirect);
            }, 500);
          } else {
            setLoading(false);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('[Auth] OAuth session error:', error);
          toast.error('Authentication failed. Please try again.');
          setLoading(false);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleOAuthCallback();
  }, [mode, nextUrl, searchParams]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (isSignUp) {
        if (!fullName || fullName.trim().length < 2) {
          throw new Error('Please enter your full name');
        }
        
        const { error } = await auth.signUp(email, password, {
          full_name: fullName,
        });

        if (error) throw error;

        const { error: signInError } = await auth.signIn(email, password);
        if (signInError) throw signInError;

        toast.success('Account created! Let\'s set you up...');
        setStep('membership');
      } else {
        const { data, error } = await auth.signIn(email, password);
        if (error) {
          // Provide more specific error messages
          if (error.message?.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please try again.');
          } else if (error.message?.includes('Email not confirmed')) {
            throw new Error('Please check your email and confirm your account before signing in.');
          }
          throw error;
        }

        toast.success('Welcome back!');
        // Check profile completeness before redirect
        const session = data?.session;
        performRedirectAfterAuth(session);
      }
    } catch (error) {
      const errorMessage = error.message || 'Authentication failed. Please try again.';
      toast.error(errorMessage);
      console.error('[Auth] Error:', error);
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
      // Clear the recovery token from the URL so the reset form doesn't
      // reappear if the page is refreshed after a successful reset.
      window.history.replaceState({}, document.title, window.location.pathname);
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
      // Write to auth user metadata (legacy) + profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            membership_tier: selectedTier,
            subscription_status: selectedTier === 'basic' ? 'active' : 'trial',
          })
          .eq('account_id', user.id);
      }
      // Also persist to auth metadata as fallback
      await supabase.auth.updateUser({
        data: {
          membership_tier: selectedTier,
          subscription_status: selectedTier === 'basic' ? 'active' : 'trial',
        },
      });
      toast.success('Membership selected!');
      setStep('profile');
    } catch (error) {
      toast.error('Failed to set membership');
      console.error('[Auth] handleMembership error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build initials avatar as fallback
  const buildInitialsAvatar = (name) => {
    const raw = String(name || '').trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'H';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : 'M';
    const initials = `${first}${last}`.toUpperCase();
    const palette = [['#C8962C', '#B026FF'], ['#00D9FF', '#1E3A8A'], ['#22C55E', '#0F766E']];
    const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length;
    const [c1, c2] = palette[idx];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="512" height="512" rx="64" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="190" font-weight="900" fill="rgba(255,255,255,0.92)">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const handleProfile = async () => {
    if (!photoPolicyAck) {
      toast.error('Please confirm your photos are of men.');
      return;
    }
    
    setLoading(true);
    try {
      let avatarUrl = null;
      
      // Upload avatar if provided
      if (avatarFile) {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: avatarFile });
          avatarUrl = file_url;
        } catch (uploadError) {
          console.warn('Avatar upload failed, using placeholder', uploadError);
          avatarUrl = buildInitialsAvatar(fullName);
        }
      } else {
        avatarUrl = buildInitialsAvatar(fullName);
      }
      
      // Update auth user metadata (for legacy base44 compatibility)
      await base44.auth.updateMe({
        ...profileData,
        full_name: fullName,
        avatar_url: avatarUrl,
        gender: 'male',
        photo_policy_ack: true,
        onboarding_completed: true,
      });

      // CRITICAL: also mark onboarding_complete in the profiles table so
      // BootGuardContext exits NEEDS_ONBOARDING and renders the full app.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Derive a username slug — required by the DB constraint that guards
        // onboarding_complete=true (must have username OR display_name set).
        const usernameSlug = fullName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
        await supabase
          .from('profiles')
          .update({
            onboarding_complete: true,
            display_name: fullName,
            username: usernameSlug,
            avatar_url: avatarUrl,
            bio: profileData.bio || null,
            city: profileData.city || 'London',
            profile_type: profileData.profile_type || 'standard',
          })
          .eq('account_id', user.id);
      }

      setStep('welcome');
      setTimeout(() => {
        navigate(nextUrl || createPageUrl('Home'));
      }, 3000);
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('[Auth] handleProfile error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#000' }}>
      {/* Hero background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/assets/hero-bokeh-1.jpg"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.22 }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.75) 100%)' }} />
      </div>
      {/* Amber ambient glow */}
      <div className="fixed top-1/3 -left-24 w-80 h-80 rounded-full blur-[140px] pointer-events-none" style={{ background: 'rgba(200,150,44,0.18)' }} />
      <div className="fixed bottom-1/4 -right-24 w-64 h-64 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(176,38,255,0.10)' }} />
      
      <AnimatePresence mode="wait">
        {step === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-md relative z-10"
          >
            <motion.div 
              className="text-center mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-6xl font-black uppercase tracking-tighter mb-2">
                <span className="text-white">HOT</span>
                <span className="text-gradient-hot">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-[0.3em]">LONDON OS</p>
            </motion.div>

            <div className="bg-[#1C1C1E] border border-white/8 rounded-2xl p-8">
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
                  className="w-full font-black uppercase py-6 text-lg bg-[#C8962C] hover:bg-[#D4A84B] text-black border-0"
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
                    onClick={() => {
                      console.log('[Auth] Forgot password clicked');
                      setStep('forgot');
                    }}
                    className="text-sm text-[#C8962C] hover:text-white transition-colors underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="text-center pt-4 border-t border-white/10 mt-6">
                
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { error } = await auth.signInWithGoogle(
                        `${window.location.origin}/auth/callback`
                      );
                      if (error) {
                        if (error.message?.includes('not enabled')) {
                          throw new Error('Google sign-in is not enabled. Please contact support.');
                        } else if (error.message?.includes('popup')) {
                          throw new Error('Pop-up was blocked. Please allow pop-ups for this site.');
                        }
                        throw error;
                      }
                    } catch (error) {
                      const errorMessage = error.message || 'Google sign in failed. Please try again.';
                      toast.error(errorMessage);
                      console.error('[Auth] Google OAuth error:', error);
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-100 text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 mb-3 transition-colors active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <TelegramLogin 
                  onSuccess={(result) => {
                    if (result.linked) {
                      toast.success('Telegram connected! Redirecting...');
                      const next = searchParams.get('next') || '/social';
                      navigate(next);
                    } else if (result.needsLogin) {
                      toast.info(result.message);
                    } else if (result.needsRegistration) {
                      toast.info('Please sign up with your email, then link Telegram');
                      setIsSignUp(true);
                    }
                  }}
                  onError={(err) => {
                    toast.error('Telegram auth failed: ' + (err.message || 'Unknown error'));
                  }}
                  buttonSize="large"
                />
                {/* Fallback link for localhost */}
                <p className="text-xs text-white/30 mt-2">
                  Widget not loading? <a href="https://t.me/hotmess_london_bot?start=login" target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline">Open in Telegram</a>
                </p>
              </div>

              <div className="text-center pt-4 border-t border-white/10 mt-6">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <span className="text-[#C8962C] font-bold">Sign In</span>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <span className="text-[#C8962C] font-bold">Sign Up</span>
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
                HOT<span className="text-[#C8962C]">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">LONDON OS</p>
            </div>

            <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8">
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
                  className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase py-6 text-lg"
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
                HOT<span className="text-[#C8962C]">MESS</span>
              </h1>
              <p className="text-white/40 uppercase text-sm tracking-wider">LONDON OS</p>
            </div>

            <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8">
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
                  className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase py-6 text-lg"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl relative z-10"
          >
            <div className="text-center mb-12">
              <motion.h2 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-5xl md:text-6xl font-black uppercase mb-3"
              >
                CHOOSE YOUR <span className="text-gradient-hot">TIER</span>
              </motion.h2>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-white/60 text-lg uppercase tracking-wider"
              >
                Start free, upgrade anytime
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {MEMBERSHIP_TIERS.map((tier, idx) => {
                const Icon = tier.icon;
                const isSelected = selectedTier === tier.id;
                const glowClass = tier.id === 'plus' ? 'shadow-glow-hot' : tier.id === 'pro' ? 'shadow-glow-cyan' : '';
                
                return (
                  <motion.button
                    key={tier.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    onClick={() => setSelectedTier(tier.id)}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-6 rounded-2xl transition-all duration-300 ${
                      isSelected
                        ? `border-2 border-[${tier.color}] bg-white/10 ${glowClass}`
                        : 'border-2 border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#C8962C] to-[#B026FF] text-white text-xs font-black uppercase rounded-full shadow-glow-hot">
                        POPULAR
                      </div>
                    )}
                    <div className="text-center mb-6">
                      <div 
                        className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${tier.color}20` }}
                      >
                        <Icon className="w-8 h-8" style={{ color: tier.color }} />
                      </div>
                      <h3 className="text-3xl font-black uppercase mb-2">{tier.name}</h3>
                      <p className="text-2xl font-bold" style={{ color: tier.color }}>{tier.price}</p>
                    </div>
                    <ul className="space-y-3 text-left">
                      {tier.features.map((feature, fidx) => (
                        <li key={fidx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 mt-0.5 text-[#39FF14] flex-shrink-0" />
                          <span className="text-white/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {isSelected && (
                      <motion.div
                        layoutId="tier-selected"
                        className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
                        style={{ borderColor: tier.color }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
                className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase px-12"
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
              <p className="text-white/60">Set up your card so others can find you</p>
            </div>

            <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8 space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 bg-gradient-to-br from-[#C8962C] to-[#B026FF] border-2 border-white flex items-center justify-center overflow-hidden">
                  {avatarFile ? (
                    <img
                      src={URL.createObjectURL(avatarFile)}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      style={{ filter: 'grayscale(100%)' }}
                    />
                  ) : (
                    <User className="w-12 h-12 text-white/40" />
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => document.getElementById('auth-avatar-upload').click()}
                  variant="outline"
                  className="font-black uppercase"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
                <input
                  id="auth-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <p className="text-xs text-white/40 uppercase">Grayscale • you can change it later</p>
              </div>

              {/* Profile Type */}
              <div>
                <label className="block text-sm uppercase tracking-wider text-white/60 mb-3">
                  Profile Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setProfileData({ ...profileData, profile_type: 'standard' })}
                    className={`p-4 border-2 transition-all ${
                      profileData.profile_type === 'standard'
                        ? 'border-[#C8962C] bg-[#C8962C]/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <p className="font-black uppercase mb-1">STANDARD</p>
                    <p className="text-xs text-white/60">Connect + social</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileData({ ...profileData, profile_type: 'seller' })}
                    className={`p-4 border-2 transition-all ${
                      profileData.profile_type === 'seller'
                        ? 'border-[#C8962C] bg-[#C8962C]/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <p className="font-black uppercase mb-1">SELLER</p>
                    <p className="text-xs text-white/60">MessMarket shop</p>
                  </button>
                </div>
              </div>

              {/* City */}
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
                  required
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm uppercase tracking-wider text-white/60 mb-3">
                  Bio (Optional)
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="What are you about? What are you here for?"
                  rows={3}
                  className="w-full bg-black/50 border-2 border-white/20 p-3 text-white placeholder:text-white/40 focus:border-[#C8962C] focus:outline-none"
                />
              </div>

              {/* Photo Policy */}
              <div className="border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-widest text-white/50 font-black">Photo Policy</p>
                <p className="mt-1 text-xs text-white/60">All profile photos must be of men.</p>
                <label className="mt-3 flex items-start gap-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={photoPolicyAck}
                    onChange={(e) => setPhotoPolicyAck(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>I confirm my profile photos depict men.</span>
                </label>
              </div>

              <Button
                onClick={handleProfile}
                disabled={loading || !profileData.city?.trim() || !photoPolicyAck}
                className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase py-6 text-lg disabled:opacity-50"
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
            className="w-full max-w-2xl text-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-32 h-32 bg-gradient-to-br from-[#C8962C] via-[#B026FF] to-[#00D9FF] flex items-center justify-center mx-auto mb-8 rounded-2xl shadow-glow-hot animate-glow-pulse"
            >
              <Check className="w-16 h-16 text-white" />
            </motion.div>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-5xl md:text-6xl font-black uppercase mb-6"
            >
              WELCOME TO<br />
              <span className="text-white">HOT</span>
              <span className="text-gradient-hot">MESS</span>
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl text-white/80 mb-4"
            >
              You're all set!
            </motion.p>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/50 uppercase tracking-wider mb-8"
            >
              Redirecting you to the app...
            </motion.p>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-3"
            >
              <div className="w-3 h-3 rounded-full bg-[#C8962C] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 rounded-full bg-[#B026FF] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 rounded-full bg-[#00D9FF] animate-bounce" style={{ animationDelay: '300ms' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}