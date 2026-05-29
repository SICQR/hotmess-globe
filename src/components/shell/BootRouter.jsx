import React from 'react';
import { useLocation } from 'react-router-dom';
import { useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';
import PublicShell from '@/components/shell/PublicShell';
import { claimPendingBetaCode } from '@/lib/beta/claimPendingBetaCode';

// Routes that must remain accessible without auth (legal, callbacks, etc.)
// Doctrine 11 (Single Auth Authority): /auth is INTENTIONALLY ABSENT here.
// It is no longer a public surface — it redirects to / at the route level
// (App.jsx). /auth/callback is handled by the early-return below.
const PUBLIC_PATH_PREFIXES = [
  '/legal',
  '/about',
  '/terms',
  '/privacy',
  '/guidelines',
  '/contact',
  '/accessibility',
  // Reentry + welcome portal pages MUST render for unauthenticated visitors —
  // these flows ARE the auth entry path (reentry email links for returning
  // beta members; portal magic links for paid partners). Pre-fix, BootRouter
  // intercepted them and bounced to OnboardingRouter, which is why the
  // 17 May reentry campaign saw 68 tokens minted but 0 verify calls in 4h
  // of runtime logs. Whitelist or the funnel is dead on arrival.
  '/reentry',
  '/portal',
  // Phil 2026-05-29 HOTFIX — /redeem REMOVED from public prefix list to
  // restore Doctrine 11 Single Auth Authority. Unauth invitees were
  // landing on the RedeemPage hero without splash/age/consent. The code
  // is now captured in sessionStorage by src/main.jsx BEFORE React mounts,
  // so unauth invitees go through the canonical gate chain and the code
  // rides through to /auth/callback where claimPendingBetaCode resolves it.
  // Authed users still hit RedeemPage normally (BootRouter passes through
  // when READY) and the auto-claim path works as before.
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

  // PR 4 (Phil 2026-05-29) — Doctrine 11 silent-state-death recovery sweep.
  // /auth/callback is the primary claim site, but stale sessions, refreshed
  // tabs, interrupted OAuth, and mobile deep-link inconsistencies can land a
  // user in READY with a beta code still sitting in sessionStorage. Run the
  // same idempotent helper on the first READY render to close intent. No-op
  // if no code is pending.
  //
  // Hooks rule: this effect MUST sit above every early-return below
  // (rules-of-hooks). The READY guard lives INSIDE the effect; the early-returns
  // for reset-password / auth-callback / loading still run after, unchanged.
  React.useEffect(() => {
    if (bootState === BOOT_STATES.READY) {
      claimPendingBetaCode().catch(() => { /* helper is safe */ });
    }
  }, [bootState]);

  // Always allow password reset page
  if (location.pathname === '/reset-password') {
    return <PublicShell />;
  }

  // Auth callback is a standalone full-screen page — never render inside OS chrome.
  // It handles its own loading/error/redirect UI.
  if (location.pathname === '/auth/callback') {
    const AuthCallback = React.lazy(
      () => import('@/pages/auth/callback')
    );
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <AuthCallback />
      </React.Suspense>
    );
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
