import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public pages (no auth required)
import AgeGate from '@/pages/AgeGate';
import Auth from '@/pages/Auth';
import Privacy from '@/pages/legal/Privacy';
import Terms from '@/pages/legal/Terms';
import PrivacyHub from '@/pages/legal/PrivacyHub';

/**
 * PublicShell - Routes available without authentication
 *
 * Contains:
 * - AgeGate (18+ verification)
 * - Auth (login/signup)
 * - Legal pages (privacy, terms)
 *
 * `startAt` controls where unknown paths are redirected:
 * - '/age'  (default) — user hasn't confirmed their age yet
 * - '/auth' — user already confirmed age locally; send straight to sign-in
 */
export default function PublicShell({ startAt = '/age' }) {
  return (
    <div className="min-h-screen bg-[#050507]">
      <Routes>
        {/* Age verification - entry point */}
        <Route path="/age" element={<AgeGate />} />
        <Route path="/AgeGate" element={<AgeGate />} />
        
        {/* Authentication */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/Auth" element={<Auth />} />
        
        {/* Legal */}
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/PrivacyHub" element={<PrivacyHub />} />
        
        {/* Default: redirect to startAt (age gate or auth) */}
        <Route path="*" element={<Navigate to={startAt} replace />} />
      </Routes>
    </div>
  );
}
