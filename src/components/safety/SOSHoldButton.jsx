/**
 * SOSHoldButton — circular 168×168 hold-to-fire SOS, brief v1.0 spec.
 *
 * Distinct from SilentSOSButton (which is the rectangular FAB pattern still
 * used on small surfaces). This is the centrepiece of the rebuilt /safety
 * route: oversized thumb target, breathing gold idle, bottom→top gold→orange
 * →red clip-path fill over 3 seconds, calm low-frequency audio pulse, soft
 * haptic per second.
 *
 * Doctrine notes:
 *  - setTimeout chain, NOT setInterval (more reliable on iOS background).
 *  - onPointerDown / onPointerUp / onPointerCancel / onPointerLeave to catch
 *    finger-slide-off — onMouseDown alone would never fire on iOS Safari.
 *  - No "Are you sure?" anywhere. No guilt language on cancel.
 *  - Idempotent: pressing while already sent is a no-op (the parent surface
 *    routes a second press through the cooldown/escalation modal).
 *  - Respects VITE_SOS_ENABLED via the useSOSContext().triggerSOS gate. While
 *    the gate is off (Glen-incident post-2026-05-17 safe state) the existing
 *    SOSContext will surface its crisis-resources sheet instead of writing
 *    to safety_events. This component does not bypass that gate.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSOSContext } from '@/contexts/SOSContext';

const HOLD_MS = 3000;
const CANCEL_LABEL_AT_MS = 1500;
const SENDING_LABEL_AT_MS = 2500;
const HAPTIC = (pattern) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* noop */ }
};

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
      // Safari requires resume on user gesture; we are in a pointerdown handler.
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 60; // subterranean — "felt" more than heard
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      // gentle ramp in
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
  const timeoutChainRef = useRef([]); // setTimeout ids — soft per-second haptics
  const completedRef = useRef(false);
  const cancelledLabelTimerRef = useRef(null);
  const { start: startPulse, stop: stopPulse } = useLowFreqPulse();

  // Clean up RAF + timers
  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    timeoutChainRef.current.forEach((id) => clearTimeout(id));
    timeoutChainRef.current = [];
  }, []);

  useEffect(() => () => { cleanup(); stopPulse(); }, [cleanup, stopPulse]);

  // Animation loop — locked to display refresh via RAF so the fill is smooth.
  const tick = useCallback(() => {
    if (startedAtRef.current == null) return;
    const elapsed = performance.now() - startedAtRef.current;
    setProgressMs(Math.min(elapsed, HOLD_MS));
    if (elapsed >= HOLD_MS) {
      // Completion — heavy haptic, lock red, trigger SOS via context.
      if (completedRef.current) return;
      completedRef.current = true;
      cleanup();
      HAPTIC([120, 40, 120]); // heavy confirmation
      stopPulse();
      setPhase('sent');
      // Idempotent: only call triggerSOS once.
      triggerSOS({ silent: false }).catch(() => { /* context surfaces its own UI */ });
      onSent?.();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [cleanup, onSent, stopPulse, triggerSOS]);

  const beginHold = useCallback(() => {
    if (disabled) return;
    if (phase === 'sent' || phase === 'holding') return; // idempotent
    // Clear any lingering "Alert cancelled." label
    if (cancelledLabelTimerRef.current) {
      clearTimeout(cancelledLabelTimerRef.current);
      cancelledLabelTimerRef.current = null;
    }
    startedAtRef.current = performance.now();
    completedRef.current = false;
    setPhase('holding');
    setProgressMs(0);
    HAPTIC(40);              // medium haptic on press
    startPulse();            // low-frequency audio pulse
    // Soft per-second haptic pulses (1s, 2s)
    timeoutChainRef.current.push(setTimeout(() => HAPTIC(20), 1000));
    timeoutChainRef.current.push(setTimeout(() => HAPTIC(20), 2000));
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
    HAPTIC(8); // tiny soft tap — acknowledgement, no shame
    // After 1.5s, return to idle.
    cancelledLabelTimerRef.current = setTimeout(() => {
      setPhase('idle');
      cancelledLabelTimerRef.current = null;
    }, 1500);
    onCancelled?.();
  }, [cleanup, onCancelled, phase, stopPulse]);

  // External: if SOS context resets (resolution elsewhere), we return to idle.
  useEffect(() => {
    if (!sosActive && phase === 'sent') {
      // Wait a beat so the "ALERT SENT" state is visible before relaxing.
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

  // ── Fill colour interpolation gold → orange → red ───────────────────────
  // 0%   gold
  // 50%  gold → orange
  // 100% orange → red
  const fillPct = phase === 'sent'
    ? 100
    : phase === 'holding'
      ? (progressMs / HOLD_MS) * 100
      : 0;

  // Pick the visible fill colour: at the "front" of the wave is the most
  // urgent colour reached so far. We blend in CSS via two stops.
  const fillColor = (() => {
    if (phase === 'sent') return TOKENS.red;
    if (fillPct < 50) return TOKENS.gold;
    if (fillPct < 85) return TOKENS.orange;
    return TOKENS.red;
  })();

  // Drain animation: when in 'idle' or 'cancelled', height transitions down.
  const showDrain = phase === 'cancelled' || phase === 'idle';

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Button — 168x168 circular thumb target */}
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
          // Breathing glow — idle only. 3s ease-in-out infinite via inline keyframes (see <style> below).
          animation: phase === 'idle' ? 'hm-sos-breathe 3s ease-in-out infinite' : 'none',
          transition: 'background 200ms ease, border-color 200ms ease',
          outlineColor: TOKENS.gold,
        }}
      >
        {/* Fill layer — rises bottom→top via height (not transform), so it's a
            true wavefront, not a ring/loader. Uses overflow-hidden + bottom anchor. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: `${fillPct}%`,
            background: fillColor,
            // When draining, animate the height shrinking. While holding, lock
            // to RAF (no transition) for crisp wavefront.
            transition: showDrain ? 'height 500ms cubic-bezier(0.4, 0, 0.2, 1), background 250ms ease' : 'background 250ms ease',
          }}
        />
        {/* Label */}
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

      {/* Sub-label under the button — condensed monospace, subtle glow */}
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

      {/* Inline keyframes — kept local so this file is self-contained */}
      <style>{`
        @keyframes hm-sos-breathe {
          0%, 100% { box-shadow: 0 0 0 0 ${TOKENS.gold}33, 0 0 32px 4px ${TOKENS.gold}22; }
          50%      { box-shadow: 0 0 0 8px ${TOKENS.gold}11, 0 0 48px 10px ${TOKENS.gold}33; }
        }
      `}</style>
    </div>
  );
}
