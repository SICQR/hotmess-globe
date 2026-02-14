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
 * - LOADING → Spinner
 * - UNAUTHENTICATED → PublicShell (Age, Auth, Legal)
 * - NEEDS_AGE → AgeGate only (unless localStorage says verified)
 * - NEEDS_ONBOARDING → Onboarding only (unless localStorage says verified)
 * - READY → Full app (passed as children)
 */
export default function BootRouter({ children }) {
  const { bootState, isLoading } = useBootGuard();
  const localAge = getLocalAgeVerified();
  
  // Debug logging
  console.log('[BootRouter] State:', bootState, 'isLoading:', isLoading, 'localAge:', localAge);

  // Show loading while checking auth
  if (isLoading || bootState === BOOT_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // Unauthenticated users get public shell
  if (bootState === BOOT_STATES.UNAUTHENTICATED) {
    // CRITICAL FIX: If user has localStorage age verified, they might just have
    // a profile fetch issue. Check if we should let them through anyway.
    if (localAge) {
      console.log('[BootRouter] UNAUTHENTICATED but localStorage has age - showing children');
      return <>{children}</>;
    }
    return <PublicShell />;
  }

  // Authenticated but needs age verification
  // CRITICAL: If localStorage says verified, skip the gate entirely
  if (bootState === BOOT_STATES.NEEDS_AGE) {
    if (localAge) {
      // User already verified age locally - don't block them
      console.log('[BootRouter] Bypassing AgeGate - localStorage has age verified');
      return <>{children}</>;
    }
    
    // Import dynamically to avoid circular deps
    const AgeGate = React.lazy(() => import('@/pages/AgeGate'));
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <AgeGate />
      </React.Suspense>
    );
  }

  // Authenticated but needs onboarding
  // CRITICAL: If localStorage says age verified, they can proceed (onboarding is optional)
  if (bootState === BOOT_STATES.NEEDS_ONBOARDING) {
    if (localAge) {
      // User verified age - onboarding can be done later
      console.log('[BootRouter] Bypassing OnboardingGate - localStorage has age verified');
      return <>{children}</>;
    }
    
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
