/**
 * GoldPulseLoader — HOTMESS-branded route transition state.
 *
 * Drops in as a Suspense fallback (replaces the bare black screen that
 * Phil's 18:24 Mon Samui recording showed at every nav transition).
 *
 * Reinforces the "Pulse" brand language by literally pulsing a gold ring.
 * Only renders when a transition takes longer than ~100ms (handled at the
 * caller — wrap whichever Suspense boundary you want to brand).
 *
 * Polish-sweep 2026-05-18 Issue 3.
 */
import React from 'react';

export default function GoldPulseLoader({ label }) {
  return (
    <div role="status" aria-live="polite" aria-label={label || 'Loading'}
         className="fixed inset-0 bg-black flex items-center justify-center z-[55]">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Outer pulsing ring (matches Pulse brand language) */}
        <span className="absolute inset-0 rounded-full border border-[#C8962C]/50 animate-ping" />
        {/* Inner static ring */}
        <span className="absolute inset-2 rounded-full border-2 border-[#C8962C]/85" />
        {/* Centre dot */}
        <span className="absolute w-1.5 h-1.5 rounded-full bg-[#C8962C]" />
      </div>
      {label ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="sr-only">Loading the next surface…</span>
      )}
    </div>
  );
}
