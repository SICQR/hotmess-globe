import React from 'react';
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

// Loading spinner component
const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#050507]">
    <div className="w-8 h-8 border-4 border-[#39FF14]/20 border-t-[#39FF14] rounded-full animate-spin" />
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
  const { bootState, isLoading } = useBootGuard();
  const localAge = getLocalAgeVerified();

  // Show loading while checking auth
  if (isLoading || bootState === BOOT_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // Unauthenticated users get the public shell.
  // If they already confirmed their age locally, drop them on /auth instead of /age.
  if (bootState === BOOT_STATES.UNAUTHENTICATED) {
    return <PublicShell startAt={localAge ? '/auth' : '/age'} />;
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
  if (bootState === BOOT_STATES.NEEDS_ONBOARDING) {
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
