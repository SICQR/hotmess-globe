/**
 * OnboardingRouter — Single owner of ALL onboarding state and navigation.
 *
 * Rendered by BootRouter for UNAUTHENTICATED, NEEDS_AGE, NEEDS_ONBOARDING,
 * and NEEDS_COMMUNITY_GATE states.
 *
 * New 3-step flow (as of 2026-03-27):
 *   AgeGate → SignUp (auth) → QuickSetup → /ghosted
 *
 * SplashScreen, QuickProfileScreen, VibeScreen, SafetySeedScreen, and
 * LocationPermissionScreen are NOT deleted — just removed from router sequence.
 * Legacy onboarding_stage values (profile/vibe/safety/location) route to
 * QuickSetupScreen so in-progress users can complete via the new path.
 *
 * Resume logic (onboarding_stage → screen):
 *   null / start / age_gate → AgeGateScreen (or SignUpScreen if sessionStorage age passed)
 *   age_verified / signup / profile / vibe / safety / location → QuickSetupScreen
 *   signed_up → QuickSetupScreen
 *   complete → /ghosted (BootRouter intercepts, never reaches here)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useBootGuard } from '@/contexts/BootGuardContext';

// Active screens
import SplashScreen from './screens/SplashScreen';
import AgeGateScreen from './screens/AgeGateScreen';
import SignUpScreen from './screens/SignUpScreen';
import QuickSetupScreen from './screens/QuickSetupScreen';

// Screen keys
const SCREENS = {
  SPLASH: 'splash',      // ← first-ever visit
  AGE_GATE: 'age_gate',
  SIGNUP: 'signup',
  SIGNIN: 'signin',
  QUICK_SETUP: 'quick_setup',
};

// Map onboarding_stage → screen.
// Legacy stages (profile/vibe/safety/location) collapse to QUICK_SETUP so
// users who were mid-old-flow can complete via the new 3-step path.
const STAGE_TO_SCREEN = {
  start: SCREENS.AGE_GATE,
  age_gate: SCREENS.SIGNUP,        // authed, age already verified pre-auth
  age_verified: SCREENS.SIGNUP,    // explicit age_verified stage
  signed_up: SCREENS.QUICK_SETUP,  // signed up, quick setup not yet done
  // Legacy stages → QuickSetup (new minimum to unlock)
  signup: SCREENS.QUICK_SETUP,
  profile: SCREENS.QUICK_SETUP,
  vibe: SCREENS.QUICK_SETUP,
  safety: SCREENS.QUICK_SETUP,
  location: SCREENS.QUICK_SETUP,
  complete: null, // should not reach OnboardingRouter
};

// Max retries when waiting for trigger-created profile row
const MAX_PROFILE_RETRIES = 5;
const PROFILE_RETRY_BASE_MS = 400;

export default function OnboardingRouter() {
  const { session, profile, refetchProfile } = useBootGuard();
  const navigate = useNavigate();
  const [screen, setScreen] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const retryCountRef = useRef(0);

  // Determine which screen to show
  const resolveScreen = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.user) {
      const ageGatePassed = localStorage.getItem('hm_age_gate_passed');
      if (ageGatePassed === 'true') {
        // Age already confirmed this session — go straight to signup
        setScreen(SCREENS.SIGNUP);
      } else {
        // Check if they've seen the splash before (localStorage persists across sessions)
        const splashSeen = localStorage.getItem('hm_splash_seen_v1');
        if (splashSeen === 'true') {
          // Returning visitor — skip splash, go to age gate
          setScreen(SCREENS.AGE_GATE);
        } else {
          // First ever visit — show splash
          setScreen(SCREENS.SPLASH);
        }
      }
      setSessionReady(true);
      retryCountRef.current = 0;
      return;
    }

    // Authenticated — fetch fresh profile
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('onboarding_stage, onboarding_completed, age_verified, community_attested_at')
      .eq('id', currentSession.user.id)
      .single();

    if (!freshProfile) {
      // Profile not yet created by trigger — exponential backoff retry
      if (retryCountRef.current < MAX_PROFILE_RETRIES) {
        const delay = PROFILE_RETRY_BASE_MS * Math.pow(2, retryCountRef.current);
        retryCountRef.current += 1;
        setTimeout(() => resolveScreen(), delay);
        return;
      }
      // Exhausted retries — show QuickSetup and let user try manually
      setScreen(SCREENS.QUICK_SETUP);
      setSessionReady(true);
      return;
    }

    retryCountRef.current = 0;

    // Already complete?
    if (freshProfile.onboarding_completed) {
      navigate('/ghosted', { replace: true });
      return;
    }

    // Apply age gate from sessionStorage if needed (user completed AgeGate pre-auth)
    const ageGatePassed = localStorage.getItem('hm_age_gate_passed');
    if (
      ageGatePassed === 'true' &&
      !freshProfile.age_verified &&
      (!freshProfile.onboarding_stage ||
        freshProfile.onboarding_stage === 'age_gate' ||
        freshProfile.onboarding_stage === 'start')
    ) {
      // Write age gate consent (anon-safe)
      await supabase.from('age_gate_consents').insert({
        session_id: crypto.randomUUID(),
        consented_at: new Date().toISOString(),
        ip_hash: null,
      });

      // Mark age verified and advance to signed_up stage
      await supabase
        .from('profiles')
        .update({
          age_verified: true,
          onboarding_stage: 'signed_up',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSession.user.id);

      localStorage.removeItem('hm_age_gate_passed');
      localStorage.removeItem('hm_age_gate_year');

      setScreen(SCREENS.QUICK_SETUP);
      setSessionReady(true);
      return;
    }

    // Safety net: age_verified=true but stage still 'start' — advance without re-gating
    if (freshProfile.age_verified && freshProfile.onboarding_stage === 'start') {
      await supabase
        .from('profiles')
        .update({
          onboarding_stage: 'signed_up',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSession.user.id);
      setScreen(SCREENS.QUICK_SETUP);
      setSessionReady(true);
      return;
    }

    // If stage is age_gate/age_verified but already authed and age is verified, advance
    if (
      (freshProfile.onboarding_stage === 'age_gate' ||
        freshProfile.onboarding_stage === 'age_verified') &&
      freshProfile.age_verified
    ) {
      await supabase
        .from('profiles')
        .update({
          onboarding_stage: 'signed_up',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSession.user.id);
      setScreen(SCREENS.QUICK_SETUP);
      setSessionReady(true);
      return;
    }

    // Map stage to screen
    const targetScreen = STAGE_TO_SCREEN[freshProfile.onboarding_stage];
    if (targetScreen) {
      setScreen(targetScreen);
    } else {
      // Unknown or null stage — default to QuickSetup (authenticated but no stage)
      setScreen(SCREENS.QUICK_SETUP);
    }
    setSessionReady(true);
  }, [navigate]);

  // Initial resolve
  useEffect(() => {
    resolveScreen();
  }, [resolveScreen]);

  // Re-resolve when BootGuardContext session or profile changes
  useEffect(() => {
    if (session || profile) {
      resolveScreen();
    }
  }, [session?.user?.id, profile?.onboarding_stage, resolveScreen]);

  // Screen history stack for back navigation
  const historyRef = useRef([]);

  const goTo = useCallback(
    (nextScreen) => {
      if (screen) historyRef.current.push(screen);
      setScreen(nextScreen);
    },
    [screen]
  );

  const goBack = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) setScreen(prev);
  }, []);

  const canGoBack = historyRef.current.length > 0;

  // Screen completion handlers
  const handleSplashComplete = () => {
    localStorage.setItem('hm_splash_seen_v1', 'true');
    goTo(SCREENS.AGE_GATE);
  };

  const handleSignInFromSplash = () => {
    localStorage.setItem('hm_splash_seen_v1', 'true');
    goTo(SCREENS.SIGNIN);
  };

  const handleAgeGateComplete = () => {
    goTo(SCREENS.SIGNUP);
  };

  const handleQuickSetupComplete = async () => {
    // Refetch profile so BootGuardContext sees onboarding_completed = true
    if (refetchProfile) {
      await refetchProfile();
    }
    navigate('/ghosted', { replace: true });
  };

  // Loading state
  if (!screen || !sessionReady) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <p className="text-lg font-black italic text-white/25 tracking-tight select-none mb-6">
          HOT<span className="text-[#C8962C]/40">MESS</span>
        </p>
        <div className="relative w-10 h-10">
          <div
            className="absolute inset-0 rounded-full border-2 border-[#C8962C]/30"
            style={{ animation: 'goldPulse 1.4s ease-in-out infinite' }}
          />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C8962C] animate-spin" />
        </div>
        <style>{`
          @keyframes goldPulse {
            0%, 100% { transform: scale(0.88); opacity: 1; }
            50% { transform: scale(1.12); opacity: 0.25; }
          }
        `}</style>
      </div>
    );
  }

  // Render the active screen
  switch (screen) {
    case SCREENS.SPLASH:
      return (
        <SplashScreen
          onJoin={handleSplashComplete}
          onSignIn={handleSignInFromSplash}
        />
      );

    case SCREENS.AGE_GATE:
      return (
        <AgeGateScreen
          onComplete={handleAgeGateComplete}
          onBack={canGoBack ? goBack : undefined}
        />
      );

    case SCREENS.SIGNUP:
      return <SignUpScreen isSignIn={false} onBack={canGoBack ? goBack : undefined} />;

    case SCREENS.SIGNIN:
      return <SignUpScreen isSignIn={true} onBack={canGoBack ? goBack : undefined} />;

    case SCREENS.QUICK_SETUP:
      return (
        <QuickSetupScreen
          session={session}
          onComplete={handleQuickSetupComplete}
          onBack={canGoBack ? goBack : undefined}
        />
      );

    default:
      return null;
  }
}

