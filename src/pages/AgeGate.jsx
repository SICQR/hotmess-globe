import React from 'react';
import HotmessSplash from '../components/splash/HotmessSplash';
import { createPageUrl } from '../utils';

/**
 * AgeGate - Entry point for the app
 * Now uses the unified HotmessSplash component that handles:
 * - 18+ age verification
 * - Cookie consent
 * - Terms acceptance
 * - Auth (sign in/sign up)
 * 
 * All in ONE bold screen instead of multiple fragmented gates
 */
export default function AgeGate() {
  const handleComplete = () => {
    // Check if user needs profile setup
    window.location.href = createPageUrl('Home');
  };

  return <HotmessSplash onComplete={handleComplete} />;
}
