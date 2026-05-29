/**
 * ArrivalSignal — quiet one-shot confirmation surface for Pulse.
 *
 * Reads hm_arrival_signal from sessionStorage (written by
 * src/lib/beta/claimPendingBetaCode.ts) and renders ONE small gold-tinted
 * line near the top of the Pulse view. No modal. No confetti. No emoji.
 * Operational confidence (Phil 2026-05-29 PR 4 — Doctrine 11).
 *
 * Auto-dismisses after 4 seconds; can also be tapped to dismiss.
 * The signal is consumed on read so it never repeats. Reload won't show it.
 *
 * Copy:
 *   founding_access_confirmed → "Founding access confirmed"
 *   founding_access_failed    → "Beta code didn't land. Try /redeem again."
 *
 * Both copies are short, dignified, and resolve user intent visibly.
 */
import React, { useEffect, useState } from 'react';
import { consumeArrivalSignal } from '@/lib/beta/claimPendingBetaCode';

const GOLD = '#C8962C';
const CREAM = '#F4ECD8';

export default function ArrivalSignal(): React.ReactElement | null {
  const [signal, setSignal] = useState<ReturnType<typeof consumeArrivalSignal>>(null);

  useEffect(() => {
    const v = consumeArrivalSignal();
    if (v) setSignal(v);
  }, []);

  useEffect(() => {
    if (!signal) return;
    const t = setTimeout(() => setSignal(null), 4000);
    return () => clearTimeout(t);
  }, [signal]);

  if (!signal) return null;

  const isConfirmed = signal === 'founding_access_confirmed';
  const label = isConfirmed
    ? 'Founding access confirmed'
    : "Beta code didn't land. Try /redeem again.";
  const color = isConfirmed ? GOLD : CREAM;

  return (
    <div
      onClick={() => setSignal(null)}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0) + 14px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 130,
        padding: '6px 14px',
        borderRadius: '999px',
        background: 'rgba(0,0,0,0.55)',
        border: `1px solid ${color}33`,
        color,
        fontSize: '11px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 600,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
}
