import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public pages (no auth required)
const HotmessSplash = lazy(() => import('@/components/splash/HotmessSplash'));
import AgeGate from '@/pages/AgeGate';
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import Privacy from '@/pages/legal/Privacy';
import Terms from '@/pages/legal/Terms';
import PrivacyHub from '@/pages/legal/PrivacyHub';

const Spinner = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="w-5 h-5 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
  </div>
);

/**
 * PublicShell - Routes available without authentication
 * Entry point: / → HotmessSplash (handles 18+ + auth in one screen)
 * Legacy routes /age and /auth still work for direct navigation.
 */
export default function PublicShell({ startAt = '/' }) {
  return (
    <div className="min-h-screen bg-black">
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
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/PrivacyHub" element={<PrivacyHub />} />

        {/* Catch-all → splash */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
