/**
 * BetaBadge — small gold "BETA" pill.
 *
 * Phil 2026-05-28. Manages user expectations: HOTMESS is live but pre-release-quality.
 * Pair with PulseFeedbackButton so users have a place to send signal back.
 *
 * Doctrine: Sacred Invariant #6 — "system never pretends activity that isn't there".
 * Saying BETA out loud is the honest move during the observation phase.
 */
import React from 'react';

export default function BetaBadge({ className = '', size = 'sm' }) {
  const sizeClasses = size === 'lg'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-[9px] px-1.5 py-0.5';
  return (
    <span
      className={`inline-flex items-center font-black tracking-widest rounded-full uppercase
                  bg-[#C8962C]/15 text-[#C8962C] border border-[#C8962C]/30 ${sizeClasses} ${className}`}
      aria-label="HOTMESS is in beta"
    >
      BETA
    </span>
  );
}
