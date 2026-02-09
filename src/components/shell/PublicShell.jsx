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
 * This shell renders when bootState is UNAUTHENTICATED.
 * Users can freely navigate between these routes.
 */
export default function PublicShell() {
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
        
        {/* Default: go to age gate */}
        <Route path="*" element={<Navigate to="/age" replace />} />
      </Routes>
    </div>
  );
}
