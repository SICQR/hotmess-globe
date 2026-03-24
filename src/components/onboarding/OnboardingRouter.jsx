/**
 * OnboardingRouter — Single owner of ALL onboarding state and navigation.
 *
 * Rendered by BootRouter for UNAUTHENTICATED, NEEDS_AGE, NEEDS_ONBOARDING,
 * and NEEDS_COMMUNITY_GATE states.
 *
 * Determines the correct screen from session state + profile.onboarding_stage.
 * Does NOT set up its own auth listener — relies on BootGuardContext's session
 * and profile state, re-resolving whenever those change.
 *
 * Flow:
 *   Splash → AgeGate → SignUp (auth) → QuickProfile → Vibe → Safety → Location → /ghosted
 *
 * Returning user with onboarding_complete = true → handled by BootRouter (never reaches here).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useBootGuard } from '@/contexts/BootGuardContext';

// Screens
import SplashScreen from './screens/SplashScreen';
import AgeGateScreen from './screens/AgeGateScreen';
import SignUpScreen from './screens/SignUpScreen';
import QuickProfileScreen from './screens/QuickProfileScreen';
import VibeScreen from './screens/VibeScreen';
import SafetySeedScreen from './screens/SafetySeedScreen';
import LocationPermissionScreen from './screens/LocationPermissionScreen';

// Screen keys
const SCREENS = {
  SPLASH: 'splash',
  AGE_GATE: 'age_gate',
  SIGNUP: 'signup',
  SIGNIN: 'signin',
  PROFILE: 'profile',
  VIBE: 'vibe',
  SAFETY: 'safety',
  LOCATION: 'location',
};

// Map onboarding_stage → screen
const STAGE_TO_SCREEN = {
  start: SCREENS.AGE_GATE,
  age_gate: SCREENS.PROFILE, // if authed + age_gate stage, age was already passed pre-auth
  signup: SCREENS.PROFILE,
  profile: SCREENS.PROFILE,
  vibe: SCREENS.VIBE,
  safety: SCREENS.SAFETY,
  location: SCREENS.LOCATION,
  complete: null, // should not reach here
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
    // Check for active session
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.user) {
      // Not authenticated
      const ageGatePassed = sessionStorage.getItem('hm_age_gate_passed');
      if (ageGatePassed === 'true') {
        setScreen(SCREENS.SIGNUP);
      } else {
        setScreen(SCREENS.SPLASH);
      }
      setSessionReady(true);
      retryCountRef.current = 0;
      return;
    }

    // Authenticated — check profile stage
    // Fetch fresh profile to avoid stale state
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select(
        'onboarding_stage, onboarding_complete, onboarding_completed, age_verified, community_attested_at'
      )
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
      // Exhausted retries — show profile screen and let user try manually
      setScreen(SCREENS.PROFILE);
      setSessionReady(true);
      return;
    }

    retryCountRef.current = 0;

    // Already complete? Navigate away
    if (freshProfile.onboarding_complete && freshProfile.onboarding_completed) {
      navigate('/ghosted', { replace: true });
      return;
    }

    // Apply age gate from sessionStorage if needed
    const ageGatePassed = sessionStorage.getItem('hm_age_gate_passed');
    if (
      ageGatePassed === 'true' &&
      !freshProfile.age_verified &&
      (freshProfile.onboarding_stage === 'age_gate' ||
        freshProfile.onboarding_stage === 'start')
    ) {
      // Write age_gate_consents (anon-safe)
      await supabase.from('age_gate_consents').insert({
        session_id: crypto.randomUUID(),
        consented_at: new Date().toISOString(),
        ip_hash: null,
      });

      await supabase
        .from('profiles')
        .update({
          age_verified: true,
          onboarding_stage: 'profile',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSession.user.id);

      sessionStorage.removeItem('hm_age_gate_passed');
      sessionStorage.removeItem('hm_age_gate_year');

      setScreen(SCREENS.PROFILE);
      setSessionReady(true);
      return;
    }

    // If stage is age_gate but we're already authed and age is verified, advance
    if (
      freshProfile.onboarding_stage === 'age_gate' &&
      freshProfile.age_verified
    ) {
      await supabase
        .from('profiles')
        .update({
          onboarding_stage: 'profile',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSession.user.id);
      setScreen(SCREENS.PROFILE);
      setSessionReady(true);
      return;
    }

    // Map stage to screen
    const targetScreen = STAGE_TO_SCREEN[freshProfile.onboarding_stage];
    if (targetScreen) {
      setScreen(targetScreen);
    } else {
      // Unknown stage — start from profile
      setScreen(SCREENS.PROFILE);
    }
    setSessionReady(true);
  }, [navigate]);

  // Initial resolve
  useEffect(() => {
    resolveScreen();
  }, [resolveScreen]);

  // Re-resolve when BootGuardContext session or profile changes
  // This is the primary mechanism for detecting post-auth state transitions —
  // BootGuardContext's auth listener fires, updates session/profile, and this
  // effect picks up the change. No need for a separate auth listener.
  useEffect(() => {
    if (session || profile) {
      resolveScreen();
    }
  }, [session?.user?.id, profile?.onboarding_stage, resolveScreen]);

  // Screen completion handlers — each advances to next screen
  const handleAgeGateComplete = () => {
    setScreen(SCREENS.SIGNUP);
  };

  const handleProfileComplete = () => {
    setScreen(SCREENS.VIBE);
  };

  const handleVibeComplete = () => {
    setScreen(SCREENS.SAFETY);
  };

  const handleSafetyComplete = () => {
    setScreen(SCREENS.LOCATION);
  };

  const handleLocationComplete = async () => {
    // Refetch profile so BootGuardContext sees onboarding_complete = true
    if (refetchProfile) {
      await refetchProfile();
    }
    // Navigate to Ghosted grid
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
          onJoin={() => setScreen(SCREENS.AGE_GATE)}
          onSignIn={() => setScreen(SCREENS.SIGNIN)}
        />
      );

    case SCREENS.AGE_GATE:
      return <AgeGateScreen onComplete={handleAgeGateComplete} />;

    case SCREENS.SIGNUP:
      return <SignUpScreen isSignIn={false} />;

    case SCREENS.SIGNIN:
      return <SignUpScreen isSignIn={true} />;

    case SCREENS.PROFILE:
      return (
        <QuickProfileScreen
          session={session}
          onComplete={handleProfileComplete}
        />
      );

    case SCREENS.VIBE:
      return (
        <VibeScreen session={session} onComplete={handleVibeComplete} />
      );

    case SCREENS.SAFETY:
      return (
        <SafetySeedScreen session={session} onComplete={handleSafetyComplete} />
      );

    case SCREENS.LOCATION:
      return (
        <LocationPermissionScreen
          session={session}
          onComplete={handleLocationComplete}
        />
      );

    default:
      return null;
  }
}
