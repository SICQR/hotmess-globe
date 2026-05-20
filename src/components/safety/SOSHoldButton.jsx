/**
 * SOSHoldButton — circular 168×168 hold-to-fire SOS, brief v1.0 spec.
 *
 * Distinct from SilentSOSButton (the rectangular FAB pattern still in use on
 * other surfaces). This is the centrepiece of the /safety route.
 *
 * Haptic doctrine (Phil v1.0 — 2026-05-20):
 *   - Touch:      impactMedium  — "arming, not alarming"
 *   - 1s elapsed: selectionChanged(1) — heartbeat tick (soft)
 *   - 2s elapsed: selectionChanged(2) — heartbeat tick (slightly heavier)
 *   - 3s (sent): notificationError — the ONLY strong haptic in the system
 *   - Release early: impactSoft — soft release, no shake, no warning noise
 *
 * Cadence is heartbeat, not machine-gun. Audio is sub-bass, not a siren.
 * Cancel-on-release writes nothing — no DB row, no toast, no shame copy.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSOSContext } from '@/contexts/SOSContext';
import {
  impactMedium, impactSoft, selectionChanged, notificationError,
} from '@/lib/safety/haptics';

const HOLD_MS = 3000;
const CANCEL_LABEL_AT_MS = 1500;
const SENDING_LABEL_AT_MS = 2500;

// HOTMESS visual language tokens — locked per brief v1.0.
const TOKENS = {
  gold: '#C8962C',
  orange: '#D4750A',
  red: '#8B1A1A',
  ink: '#050507',
};

/**
 * Low-frequency calm pulse (~60Hz) — Web Audio. Not a siren. Optional.
 * AudioContext is created lazy on first press so we don't burn battery idle.
 */
function useLowFreqPulse() {
  const ctxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);

  const start = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 60; // subterranean — "felt" more than heard
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.25);
      oscRef.current = osc;
      gainRef.current = gain;
    } catch { /* noop */ }
  }, []);

  const stop = useCallback(() => {
    try {
      const ctx = ctxRef.current;
      const osc = oscRef.current;
      const gain = gainRef.current;
      if (gain && ctx) gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      if (osc) setTimeout(() => { try { osc.stop(); } catch { /* noop */ } }, 200);
      oscRef.current = null;
      gainRef.current = null;
    } catch { /* noop */ }
  }, []);

  useEffect(() => () => { stop(); }, [stop]);
  return { start, stop };
}

export default function SOSHoldButton({ onSent, onCancelled, disabled = false }) {
  const { triggerSOS, sosActive } = useSOSContext();
  const [phase, setPhase] = useState('idle'); // idle | holding | sent | cancelled
  const [progressMs, setProgressMs] = useState(0);
  const startedAtRef = useRef(null);
  const rafRef = useRef(null);
  const timeoutChainRef = useRef([]);
  const completedRef = useRef(false);
  const cancelledLabelTimerRef = useRef(null);
  const { start: startPulse, stop: stopPulse } = useLowFreqPulse();

  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    timeoutChainRef.current.forEach((id) => clearTimeout(id));
    timeoutChainRef.current = [];
  }, []);

  useEffect(() => () => { cleanup(); stopPulse(); }, [cleanup, stopPulse]);

  const tick = useCallback(() => {
    if (startedAtRef.current == null) return;
    const elapsed = performance.now() - startedAtRef.current;
    setProgressMs(Math.min(elapsed, HOLD_MS));
    if (elapsed >= HOLD_MS) {
      if (completedRef.current) return;
      completedRef.current = true;
      cleanup();
      notificationError();           // the ONE strong haptic — final + undeniable
      stopPulse();
      setPhase('sent');
      triggerSOS({ silent: false }).catch(() => { /* context surfaces its own UI */ });
      onSent?.();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [cleanup, onSent, stopPulse, triggerSOS]);

  const beginHold = useCallback(() => {
    if (disabled) return;
    if (phase === 'sent' || phase === 'holding') return; // idempotent
    if (cancelledLabelTimerRef.current) {
      clearTimeout(cancelledLabelTimerRef.current);
      cancelledLabelTimerRef.current = null;
    }
    startedAtRef.current = performance.now();
    completedRef.current = false;
    setPhase('holding');
    setProgressMs(0);
    impactMedium();              // arming, not alarming
    startPulse();
    // Heartbeat-like cadence — soft tick at 1s, slightly heavier at 2s.
    // The "1" deep confirmation pulse at 3s is rolled into notificationError
    // on completion (see tick()).
    timeoutChainRef.current.push(setTimeout(() => selectionChanged(1), 1000));
    timeoutChainRef.current.push(setTimeout(() => selectionChanged(2), 2000));
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, phase, startPulse, tick]);

  const cancelHold = useCallback(() => {
    if (phase !== 'holding') return;
    if (completedRef.current) return; // fire path already locked
    cleanup();
    stopPulse();
    startedAtRef.current = null;
    setPhase('cancelled');
    setProgressMs(0);
    impactSoft();                // soft release — acknowledgement, no shame
    cancelledLabelTimerRef.current = setTimeout(() => {
      setPhase('idle');
      cancelledLabelTimerRef.current = null;
    }, 1500);
    onCancelled?.();
  }, [cleanup, onCancelled, phase, stopPulse]);

  // External: if SOS context resets (resolution elsewhere), return to idle.
  useEffect(() => {
    if (!sosActive && phase === 'sent') {
      const t = setTimeout(() => setPhase('idle'), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, sosActive]);

  // ── Labels ───────────────────────────────────────────────────────────────
  let primaryLabel = 'HOLD FOR SOS';
  let subLabel = '';
  if (phase === 'holding') {
    primaryLabel = 'HOLD FOR SOS';
    if (progressMs < CANCEL_LABEL_AT_MS) subLabel = 'Keep holding…';
    else if (progressMs < SENDING_LABEL_AT_MS) subLabel = 'Release to cancel.';
    else subLabel = 'Sending alert…';
  } else if (phase === 'sent') {
    primaryLabel = 'ALERT SENT';
    subLabel = 'Your people know.';
  } else if (phase === 'cancelled') {
    primaryLabel = 'HOLD FOR SOS';
    subLabel = 'Alert cancelled.';
  }

  const fillPct = phase === 'sent'
    ? 100
    : phase === 'holding'
      ? (progressMs / HOLD_MS) * 100
      : 0;

  const fillColor = (() => {
    if (phase === 'sent') return TOKENS.red;
    if (fillPct < 50) return TOKENS.gold;
    if (fillPct < 85) return TOKENS.orange;
    return TOKENS.red;
  })();

  const showDrain = phase === 'cancelled' || phase === 'idle';

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <button
        type="button"
        aria-label="Hold for SOS — press and hold for 3 seconds to alert your trusted contacts"
        aria-pressed={phase === 'holding' || phase === 'sent'}
        aria-live="polite"
        disabled={disabled || phase === 'sent'}
        onPointerDown={beginHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        className="relative overflow-hidden rounded-full touch-none active:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{
          width: 168,
          height: 168,
          background: TOKENS.gold,
          border: `2px solid ${TOKENS.gold}`,
          color: TOKENS.ink,
          animation: phase === 'idle' ? 'hm-sos-breathe 3s ease-in-out infinite' : 'none',
          transition: 'background 200ms ease, border-color 200ms ease',
          outlineColor: TOKENS.gold,
        }}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: `${fillPct}%`,
            background: fillColor,
            transition: showDrain ? 'height 500ms cubic-bezier(0.4, 0, 0.2, 1), background 250ms ease' : 'background 250ms ease',
          }}
        />
        <span
          className="relative z-10 flex flex-col items-center justify-center w-full h-full font-mono uppercase tracking-[0.18em]"
          style={{
            color: phase === 'sent' ? '#fff' : TOKENS.ink,
            fontWeight: 800,
            fontSize: 14,
            textShadow: phase === 'sent' ? '0 1px 6px rgba(0,0,0,0.4)' : 'none',
            transition: 'color 250ms ease',
          }}
        >
          {primaryLabel}
        </span>
      </button>

      <p
        className="font-mono text-xs uppercase tracking-[0.16em] text-center min-h-[1.25rem]"
        style={{
          color: phase === 'sent' ? TOKENS.gold : 'rgba(255,255,255,0.55)',
          textShadow: phase === 'sent' ? `0 0 12px ${TOKENS.gold}55` : 'none',
          transition: 'color 250ms ease',
        }}
      >
        {subLabel}
      </p>

      <style>{`
        @keyframes hm-sos-breathe {
          0%, 100% { box-shadow: 0 0 0 0 ${TOKENS.gold}33, 0 0 32px 4px ${TOKENS.gold}22; }
          50%      { box-shadow: 0 0 0 8px ${TOKENS.gold}11, 0 0 48px 10px ${TOKENS.gold}33; }
        }
      `}</style>
    </div>
  );
}
