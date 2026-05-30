/**
 * OnboardingRouter — Single owner of ALL onboarding state and navigation.
 *
 * Rendered by BootRouter for UNAUTHENTICATED, NEEDS_AGE, NEEDS_ONBOARDING,
 * and NEEDS_COMMUNITY_GATE states.
 *
 * Active flow (as of 2026-05-09 — Grindr-fast directive):
 *   Splash → AgeGate → SignUp (auth) → QuickSetup → /pulse
 *
 * Both ProfileScreen (vibe/orientation/body/height/ethnicity) and
 * PinSetupScreen are removed from the gate. Vibe data lives in
 * L2EditProfileSheet, PIN setup lives in /safety. The .jsx files are
 * still in tree, just unwired from the gate. Legacy onboarding_stage
 * values (profile / vibe / safety / location) collapse to QuickSetup.
 *
 * Resume logic (onboarding_stage → screen):
 *   null / start / age_gate → AgeGateScreen (or SignUpScreen if sessionStorage age passed)
 *   age_verified / signup / profile / vibe / safety / location → QuickSetupScreen
 *   signed_up → QuickSetupScreen
 *   quick_setup / profile_complete / vibe_complete / pin_complete → /pulse
 *   complete → /pulse (BootRouter intercepts, never reaches here)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useV6Flag as useFlag } from '@/hooks/useV6Flag';
import { track } from '@/lib/analytics';
import First5MinutesFlow from './First5MinutesFlow';

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useBootGuard } from '@/contexts/BootGuardContext';

// Active screens.
// ProfileScreen + PinSetupScreen removed from the router 2026-05-09 —
// vibe/body/orientation are deferred to L2EditProfileSheet and PIN is
// opt-in via /safety settings (Grindr-fast directive). Both .jsx files
// are still exported and used from those entry points.
import SplashScreen from './screens/SplashScreen';
import AgeGateScreen from './screens/AgeGateScreen';
import SignUpScreen from './screens/SignUpScreen';
import QuickSetupScreen from './screens/QuickSetupScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import BridgeScreen from './screens/BridgeScreen';

// Screen keys
const SCREENS = {
  SPLASH: 'splash',      // ← first-ever visit
  AGE_GATE: 'age_gate',
  SIGNUP: 'signup',
  SIGNIN: 'signin',
  QUICK_SETUP: 'quick_setup',
  NOTIFICATIONS: 'notifications',  // T5 (Phil 2026-05-26): channel pref before completion
  BRIDGE: 'bridge',  // Phase 1 conversion repair (Phil 2026-05-28): explanation layer between age_gate + signup
};

// Map onboarding_stage → screen.
// Legacy stages (profile / vibe / safety / location / vibe_complete /
// profile_complete / pin_complete) collapse to QuickSetup or finish.
const STAGE_TO_SCREEN = {
  start: SCREENS.AGE_GATE,
  age_gate: SCREENS.SIGNUP,        // authed, age already verified pre-auth
  age_verified: SCREENS.SIGNUP,    // explicit age_verified stage
  signed_up: SCREENS.QUICK_SETUP,  // signed up, quick setup not yet done
  quick_setup: null,               // QuickSetup → finish (was: ProfileScreen / PinSetup)
  profile_complete: null,          // legacy stage, also finishes
  vibe_complete: null,             // legacy stage, also finishes
  pin_complete: null,              // legacy stage, also finishes
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
  // v6 First 5 Minutes — flag hooks (f5m_hooks_v2)
  const f5mEnabled = useFlag('v6_first_five_minutes');
  const [profileStage, setProfileStage] = React.useState(null);
  useEffect(() => {
    if (!f5mEnabled) return;
    import('@/components/utils/supabaseClient').then(({ supabase: sb }) => {
      sb.auth.getUser().then(({ data: { user } }) => {
        if (!user) { setProfileStage('start'); return; }
        sb.from('profiles').select('onboarding_stage').eq('id', user.id).single()
          .then(({ data }) => setProfileStage(data?.onboarding_stage || 'start'));
      });
    });
  }, [f5mEnabled]);


  const { session, profile, refetchProfile } = useBootGuard();
  const navigate = useNavigate();
  const [screen, setScreen] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const retryCountRef = useRef(0);
  const screenRef = useRef(null);

  // Telemetry: abandon listener — fire 'onboarding_abandoned' if the user
  // closes the tab/window mid-flow (i.e. screen is set but not complete).
  // Uses navigator.sendBeacon for delivery reliability past page-unload.
  //
  // 2026-05-30 (#346): added visibilitychange:hidden alongside beforeunload.
  // iOS Safari + Chrome mobile suppress beforeunload on swipe-close, which
  // hid the Notifications-screen abandonment cliff identified in #344.
  // visibilitychange:hidden fires reliably on backgrounding + swipe-close.
  // Both fire in tab-close on desktop, hence the dedupe ref.
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => {
    // Dedupe across both events — desktop fires both; we only want one row.
    let fired = false;
    const fireAbandonment = () => {
      if (fired) return;
      const s = screenRef.current;
      if (!s || s === SCREENS.COMPLETE) return;
      fired = true;
      try {
        navigator.sendBeacon?.(
          '/api/analytics/track',
          new Blob(
            [JSON.stringify({
              event_name: 'onboarding_abandoned',
              category:   'onboarding',
              label:      String(s).toLowerCase(),
            })],
            { type: 'application/json' },
          ),
        );
      } catch { /* swallow — analytics must never block unload */ }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') fireAbandonment();
    };
    window.addEventListener('beforeunload', fireAbandonment);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', fireAbandonment);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Determine which screen to show
  const resolveScreen = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.user) {
      const ageGatePassed = localStorage.getItem('hm_age_gate_passed');
      const bridgeSeen = localStorage.getItem('hm_bridge_seen_v1');
      if (ageGatePassed === 'true') {
        // Age already confirmed — but Phase 1 (Phil 2026-05-28) added the
        // Bridge between age-gate and signup. Returning users who passed
        // age-gate before Bridge existed never see it. Show Bridge once,
        // then stamp `hm_bridge_seen_v1` to never re-show.
        if (bridgeSeen !== 'true') {
          setScreen(SCREENS.BRIDGE);
        } else {
          // Age confirmed + bridge seen — straight to signup
          setScreen(SCREENS.SIGNUP);
        }
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
      navigate('/pulse', { replace: true });
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
    } else if (!freshProfile.onboarding_stage && !freshProfile.age_verified) {
      // Brand new user (null stage, age not verified) — start from age gate
      setScreen(SCREENS.AGE_GATE);
    } else {
      // Authenticated + age verified but unknown stage — QuickSetup
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

  const handleAgeGateComplete = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (currentSession?.user) {
      // Already authenticated — write age_verified directly, skip Signup
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
      goTo(SCREENS.QUICK_SETUP);
    } else {
      // Phase 1 (Phil 2026-05-28): bridge between age-gate + signup.
      // The old straight-to-signup created a tonal cliff that probably
      // accounted for the 18/7d signup-screen abandons. Bridge gives the
      // user the explanation layer they have been waiting for since splash.
      goTo(SCREENS.BRIDGE);
    }
  }, [goTo]);

  const handleBridgeContinue = useCallback(() => {
    try { localStorage.setItem('hm_bridge_seen_v1', 'true'); } catch {}
    goTo(SCREENS.SIGNUP);
  }, [goTo]);

  // QuickSetup is now the FINAL gate. Both ProfileScreen and PinSetup are
  // deferred (vibe → L2EditProfileSheet, PIN → /safety settings).
  const finishOnboarding = useCallback(async () => {
    track('onboarding_stage_completed', 'onboarding', 'quick_setup');
    track('profile_complete', 'onboarding');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          onboarding_stage: 'complete',
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      }
    } catch (e) {
      console.warn('[OnboardingRouter] finishOnboarding write failed:', e);
    }
    try {
      localStorage.setItem('hm_age_gate_passed', 'true');
      localStorage.setItem('hm_community_attested_v1', 'true');
    } catch {}
    if (refetchProfile) {
      await refetchProfile();
    }
    navigate('/pulse', { replace: true });
  }, [navigate, refetchProfile]);

  // v6 F5M — render intercept (all hooks above, safe to return here)
  if (f5mEnabled) {
    if (profileStage === null) return null; // still loading profile stage
    if (profileStage === 'start' || profileStage?.startsWith('f5m_')) {
      return <First5MinutesFlow initialStage={profileStage} />;
    }
  }

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

    case SCREENS.BRIDGE:
      return (
        <BridgeScreen
          onContinue={handleBridgeContinue}
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
          onComplete={() => goTo(SCREENS.NOTIFICATIONS)}
          onBack={canGoBack ? goBack : undefined}
        />
      );

    case SCREENS.NOTIFICATIONS:
      return (
        <NotificationsScreen
          session={session}
          onComplete={finishOnboarding}
          onBack={canGoBack ? goBack : undefined}
        />
      );

    default:
      return null;
  }
}

