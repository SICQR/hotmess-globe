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

// Branded loading — cinematic pulse
const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
    <p className="text-lg font-black italic text-white/25 tracking-tight select-none mb-6">
      HOT<span className="text-[#C8962C]/40">MESS</span>
    </p>
    <div className="relative w-10 h-10">
      {/* Breathing gold ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-[#C8962C]/30"
        style={{
          animation: 'goldPulse 1.4s ease-in-out infinite',
        }}
      />
      {/* Spinning accent */}
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C8962C] animate-spin" />
    </div>
    <p className="mt-5 text-[8px] uppercase tracking-[0.4em] text-white/10 font-medium">
      Loading
    </p>
    <style>{`
      @keyframes goldPulse {
        0%, 100% { transform: scale(0.88); opacity: 1; }
        50% { transform: scale(1.12); opacity: 0.25; }
      }
    `}</style>
  </div>
);

/**
 * Selects which top-level UI to render based on boot state and current route.
 *
 * Behavior:
 * - Always allows the password reset route to render the public shell.
 * - Shows a loading spinner while boot/auth state is loading.
 * - For UNAUTHENTICATED, renders the provided `children` (full app shell with gated features disabled elsewhere).
 * - For NEEDS_AGE, renders the AgeGate page.
 * - For NEEDS_ONBOARDING or NEEDS_COMMUNITY_GATE, renders the OnboardingGate page.
 * - Otherwise, renders the provided `children` (app ready).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children - Content to render when the app shell should be shown (unauthenticated or ready).
 * @returns {import('react').JSX.Element} The shell or gate component appropriate for the current boot and route state.
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

  // Unauthenticated users now see the full app shell (browse, radio, shop).
  // Auth-gated features (chat, profile edit, SOS) are disabled inside each mode.
  // Login remains accessible via Profile tab or /auth route.
  if (bootState === BOOT_STATES.UNAUTHENTICATED) {
    return <>{children}</>;
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
