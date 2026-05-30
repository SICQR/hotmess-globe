/**
 * OnboardingBackButton — Shared back arrow for onboarding screens
 *
 * Renders a 44px tap target in the top-left with a chevron-left icon.
 * Only renders if onBack prop is provided.
 */
import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function OnboardingBackButton({ onBack }) {
  if (!onBack) return null;

  return (
    <button
      onClick={onBack}
      className="absolute top-[env(safe-area-inset-top,16px)] left-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white active:scale-95 transition-all"
      aria-label="Go back"
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
  );
}
