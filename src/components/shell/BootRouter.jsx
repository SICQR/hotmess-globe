import React from 'react';
import { useLocation } from 'react-router-dom';
import { useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';
import PublicShell from '@/components/shell/PublicShell';

// Consistent localStorage key for age verification
const AGE_KEY = 'hm_age_confirmed_v1';

const getLocalAgeVerified = () => {
  try {
    const val = localStorage.getItem(AGE_KEY);
    return val === 'true' || val === '1' || val === 'TRUE';
  } catch {
    return false;
  }
};

// Branded splash screen shown during boot auth check
const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <p className="text-4xl font-black tracking-tight select-none">
        <span className="text-white">HOT</span><span className="text-[#C8962C]">MESS</span>
      </p>
      <div className="w-5 h-5 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
    </div>
  </div>
);

/**
 * BootRouter - Routes based on boot state
 *
 * State → Shell mapping:
 * - LOADING          → Spinner
 * - UNAUTHENTICATED  → PublicShell (Age gate → Auth → Legal)
 *                      If the user already completed age verification locally,
 *                      skip the age page and go straight to /auth.
 * - NEEDS_AGE        → AgeGate  (BootGuardContext already syncs localStorage)
 * - NEEDS_ONBOARDING → OnboardingGate (mandatory — never bypassed)
 * - READY            → Full app (children)
 */
export default function BootRouter({ children }) {
  // Hooks must be called unconditionally (Rules of Hooks)
  const { bootState, isLoading } = useBootGuard();
  const localAge = getLocalAgeVerified();
  const location = useLocation();

  // Always allow the password reset page — the link from email must work
  // regardless of auth state or onboarding status
  if (location.pathname === '/reset-password') {
    return <PublicShell />;
  }

  // DEV BYPASS: uncomment to skip all auth gates for local testing
  // if (import.meta.env.DEV) return <>{children}</>;

  // Show loading while checking auth
  if (isLoading || bootState === BOOT_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // Unauthenticated users get the public shell.
  // If they already confirmed their age locally, drop them on /auth instead of /age.
  if (bootState === BOOT_STATES.UNAUTHENTICATED) {
    // Always start at splash — it handles both 18+ and auth in one screen
    return <PublicShell startAt="/" />;
  }

  // Authenticated but age not yet verified — show age gate.
  // BootGuardContext already attempts to sync localStorage → profile, so this
  // state only appears when the DB has age_verified = false AND localStorage is empty.
  if (bootState === BOOT_STATES.NEEDS_AGE) {
    const AgeGate = React.lazy(() => import('@/pages/AgeGate'));
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <AgeGate />
      </React.Suspense>
    );
  }

  // Authenticated, age verified, but onboarding not complete — mandatory.
  if (bootState === BOOT_STATES.NEEDS_ONBOARDING || bootState === BOOT_STATES.NEEDS_COMMUNITY_GATE) {
    const OnboardingGate = React.lazy(() => import('@/pages/OnboardingGate'));
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <OnboardingGate />
      </React.Suspense>
    );
  }

  // READY — render full app
  return <>{children}</>;
}
