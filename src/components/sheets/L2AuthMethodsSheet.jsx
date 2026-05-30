/**
 * L2AuthMethodsSheet — "More ways to sign in"
 *
 * Options: Apple (gated), Magic Link, Phone OTP, Password sign-in
 * Opened from Auth.jsx via openSheet('more-auth-methods', { callbacks })
 */

import React from 'react';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.51-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.02 8.93 8.76c1.28.07 2.17.72 2.92.76.96-.2 1.88-.89 3.13-.81 1.49.12 2.63.7 3.37 1.74-3.07 1.84-2.34 5.89.59 7.02-.5 1.33-1.16 2.63-1.89 3.81zM12.05 8.68c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function MagicLinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

function MethodRow({ icon, label, sublabel, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-left hover:bg-white/8 active:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 bg-white/5 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-[15px]">{label}</p>
        {sublabel && <p className="text-white/40 text-xs mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
}

export default function L2AuthMethodsSheet({
  onSelectApple,
  onSelectMagicLink,
  onSelectPhone,
  onSelectPassword,
  appleEnabled = false,
  isWebView = false,
}) {
  const { closeSheet } = useSheet();

  const handleSelect = (fn) => {
    closeSheet();
    // Small delay to let sheet animation finish before switching Auth view
    setTimeout(() => fn?.(), 200);
  };

  return (
    <div className="px-5 pb-8 pt-2 space-y-3">
      <p className="text-white/40 text-sm mb-2">Choose how you want to sign in</p>

      {/* Apple — gated by APPLE_ENABLED flag */}
      {appleEnabled && !isWebView && (
        <MethodRow
          icon={<AppleIcon />}
          label="Continue with Apple"
          sublabel="Use your Apple ID"
          onClick={() => handleSelect(onSelectApple)}
        />
      )}

      {appleEnabled && isWebView && (
        <div className="px-4 py-3 rounded-2xl border border-white/5 bg-white/[0.02]">
          <p className="text-white/30 text-xs text-center">
            Apple Sign In is not available in this browser. Open in Safari to use Apple.
          </p>
        </div>
      )}

      {/* Magic Link */}
      <MethodRow
        icon={<MagicLinkIcon />}
        label="Magic link"
        sublabel="Sign in via email link, no password"
        onClick={() => handleSelect(onSelectMagicLink)}
      />

      {/* Phone OTP */}
      <MethodRow
        icon={<PhoneIcon />}
        label="Phone number"
        sublabel="Get a code via SMS"
        onClick={() => handleSelect(onSelectPhone)}
      />

      {/* Password sign-in */}
      <MethodRow
        icon={<PasswordIcon />}
        label="Already have an account?"
        sublabel="Sign in with email and password"
        onClick={() => handleSelect(onSelectPassword)}
      />
    </div>
  );
}
