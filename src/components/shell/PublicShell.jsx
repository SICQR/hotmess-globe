import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public pages (no auth required)
const HotmessSplash = lazy(() => import('@/components/splash/HotmessSplash'));
import AgeGate from '@/pages/AgeGate';
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import PrivacyHub from '@/pages/legal/PrivacyHub';
import { PrivacyPolicyPage, LegalPage } from '@/pages/legal/LegalPages';

// Polish-sweep 2026-05-18 Issue 3: brand the cold-visitor transition state.
// Was a 5px spinner — visually indistinguishable from a frozen black page on a
// fresh page-load. Now: pulsing gold ring matches the Pulse brand language.
import GoldPulseLoader from '@/components/ui/GoldPulseLoader';
const Spinner = () => <GoldPulseLoader />;

/**
 * PublicShell - Routes available without authentication
 * Entry point: / → HotmessSplash (handles 18+ + auth in one screen)
 * Legacy routes /age and /auth still work for direct navigation.
 */
export default function PublicShell({ startAt = '/' }) {
  return (
    <div className="relative z-10 min-h-screen bg-black">
      <Routes>
        {/* Main entry — splash + auth combined */}
        <Route path="/" element={
          <Suspense fallback={<Spinner />}>
            <HotmessSplash />
          </Suspense>
        } />

        {/* Legacy age verification route */}
        <Route path="/age" element={<AgeGate />} />
        <Route path="/AgeGate" element={<AgeGate />} />

        {/* Legacy auth route */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/Auth" element={<Auth />} />

        {/* Password reset — linked from Supabase reset email */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Legal */}
        <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/legal/terms" element={<LegalPage />} />
        {/* Phil 2026-05-28 (#251): /privacy + /terms removed from PublicShell.
            App.jsx already declares standalone routes pointing to the new
            PrivacyPolicy.jsx + TermsOfService.jsx components. Having them here
            ALSO created a double-registration that React Router resolved to the
            wrong target depending on render order — Google OAuth crawler hit
            the wrong shell, Phil saw "Lost in the fog". Single source of truth
            now: App.jsx. */}
        <Route path="/PrivacyHub" element={<PrivacyHub />} />

        {/* Catch-all → splash */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
