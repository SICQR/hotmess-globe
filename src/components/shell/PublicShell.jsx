import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageTransition } from '@/components/lux/PageTransition';
import AgeGate from '@/pages/AgeGate';
import Auth from '@/pages/Auth';
import Privacy from '@/pages/legal/Privacy';
import Terms from '@/pages/legal/Terms';
import PrivacyHub from '@/pages/legal/PrivacyHub';
import OnboardingGate from '@/pages/OnboardingGate';

/**
 * PublicShell - Pre-authentication / Public Routes
 * 
 * Renders ONLY when:
 * - UNAUTHENTICATED (no session)
 * - NEEDS_AGE (authenticated but age not confirmed)
 * - NEEDS_ONBOARDING (authenticated but onboarding incomplete)
 * 
 * CRITICAL: Globe, Radio, and OS runtime MUST NOT mount here.
 * These are pre-OS gates only.
 */
export default function PublicShell({ bootState }) {
  return (
    <PageTransition>
      <Routes>
        {/* Age verification (works with or without auth) */}
        <Route path="/age" element={<AgeGate />} />
        
        {/* Authentication routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/*" element={<Auth />} />
        
        {/* Onboarding (requires auth) */}
        <Route path="/onboarding" element={<OnboardingGate />} />
        <Route path="/onboarding/*" element={<OnboardingGate />} />
        
        {/* Legal pages (public) */}
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/terms" element={<Terms />} />
        <Route path="/legal/privacy-hub" element={<PrivacyHub />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        
        {/* Default redirects based on boot state */}
        <Route path="*" element={
          bootState === 'UNAUTHENTICATED' ? (
            <Navigate to="/age" replace />
          ) : bootState === 'NEEDS_AGE' ? (
            <Navigate to="/age" replace />
          ) : bootState === 'NEEDS_ONBOARDING' ? (
            <Navigate to="/onboarding" replace />
          ) : (
            <Navigate to="/auth" replace />
          )
        } />
      </Routes>
    </PageTransition>
  );
}
