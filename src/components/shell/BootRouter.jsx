import React from 'react';
import { useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';
import PublicShell from '@/components/shell/PublicShell';

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
 * - LOADING → Spinner
 * - UNAUTHENTICATED → PublicShell (Age, Auth, Legal)
 * - NEEDS_AGE → AgeGate only
 * - NEEDS_ONBOARDING → Onboarding only
 * - READY → Full app (passed as children)
 */
export default function BootRouter({ children }) {
  const { bootState, isLoading } = useBootGuard();

  // Show loading while checking auth
  if (isLoading || bootState === BOOT_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // Unauthenticated users get public shell
  if (bootState === BOOT_STATES.UNAUTHENTICATED) {
    return <PublicShell />;
  }

  // Authenticated but needs age verification
  if (bootState === BOOT_STATES.NEEDS_AGE) {
    // Import dynamically to avoid circular deps
    const AgeGate = React.lazy(() => import('@/pages/AgeGate'));
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <AgeGate />
      </React.Suspense>
    );
  }

  // Authenticated but needs onboarding
  if (bootState === BOOT_STATES.NEEDS_ONBOARDING) {
    const OnboardingGate = React.lazy(() => import('@/pages/OnboardingGate'));
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <OnboardingGate />
      </React.Suspense>
    );
  }

  // READY - render full app
  return <>{children}</>;
}
