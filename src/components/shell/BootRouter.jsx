import React from 'react';
import { useLocation } from 'react-router-dom';
import { useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';
import PublicShell from '@/components/shell/PublicShell';

// Routes that must remain accessible without auth (legal, callbacks, etc.)
const PUBLIC_PATH_PREFIXES = [
  '/legal',
  '/about',
  '/terms',
  '/privacy',
  '/guidelines',
  '/contact',
  '/accessibility',
  '/auth/callback',
];

// Branded loading — cinematic pulse
const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
    <p className="text-lg font-black italic text-white/25 tracking-tight select-none mb-6">
      <span className="text-white">HOT</span><span className="text-[#C8962C]">MESS</span>
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
 * BootRouter — gates the entire app behind onboarding.
 *
 * Non-READY users see OnboardingRouter (splash -> age -> auth -> profile -> vibe -> safety -> location).
 * READY users see the full OS. Public routes (legal, auth callback) always pass through.
 */
export default function BootRouter({ children }) {
  const { bootState, isLoading } = useBootGuard();
  const location = useLocation();

  // Always allow password reset page
  if (location.pathname === '/reset-password') {
    return <PublicShell />;
  }

  // Show loading while checking auth
  if (isLoading || bootState === BOOT_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // READY — render full app
  if (bootState === BOOT_STATES.READY) {
    return <>{children}</>;
  }

  // Public routes pass through even for non-READY users
  const isPublicRoute = PUBLIC_PATH_PREFIXES.some(
    (prefix) =>
      location.pathname === prefix ||
      location.pathname.startsWith(prefix + '/')
  );
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // All non-READY states -> OnboardingRouter handles everything:
  // UNAUTHENTICATED -> splash / signup
  // NEEDS_AGE -> age gate (post-auth edge case)
  // NEEDS_ONBOARDING -> resume from onboarding_stage
  // NEEDS_COMMUNITY_GATE -> treated as needs onboarding
  const OnboardingRouter = React.lazy(
    () => import('@/components/onboarding/OnboardingRouter')
  );

  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <OnboardingRouter />
    </React.Suspense>
  );
}
