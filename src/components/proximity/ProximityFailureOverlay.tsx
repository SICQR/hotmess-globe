/**
 * src/components/proximity/ProximityFailureOverlay.tsx — Chunk 14
 *
 * Visual overlay that reflects the current ProximityFailureState.
 * Mounts as a transparent layer over the existing meet/route view.
 *
 * Flag-off: renders nothing.
 * Flag-on:
 *   - FULL:     transparent (existing UI shows through)
 *   - REDUCED:  "Bit rough." header, dims underlying dots/route via opacity
 *   - MINIMAL:  hides dots + route, shows proximity text
 *   - PRESENCE: full-screen black + "You're close." + "I found you." CTA
 *
 * Props:
 *   state        — current ProximityFailureState (from useProximityFailure)
 *   onFoundYou   — called when user taps "I found you." (triggers MET state)
 *   targetName   — display name for "I found you." button context
 */

import React, { useEffect, useState } from 'react';
import { DEGRADED_COPY, hapticFire, HAPTIC } from '@/lib/proximity/failureSystem';
import type { ProximityFailureState } from '@/lib/proximity/failureSystem';

interface Props {
  state:       ProximityFailureState | null;
  onFoundYou:  () => void;
  targetName?: string;
}

export default function ProximityFailureOverlay({ state, onFoundYou, targetName }: Props) {
  const [flashCooldown, setFlashCooldown] = useState(false);
  const [cooldownSecs,  setCooldownSecs]  = useState(0);

  // Auto-surface FLASH button in micro-confusion handled by parent via state.headerCopy
  const isPresence = state?.state === 'presence';
  const isMinimal  = state?.state === 'minimal';
  const isReduced  = state?.state === 'reduced';

  // Flash cooldown timer
  useEffect(() => {
    if (!flashCooldown) return;
    setCooldownSecs(60);
    const tick = setInterval(() => {
      setCooldownSecs(s => {
        if (s <= 1) { clearInterval(tick); setFlashCooldown(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [flashCooldown]);

  if (!state || state.state === 'full') return null;

  // ── PRESENCE: full-screen language-only mode ──────────────────────────────
  if (isPresence) {
    return (
      <div
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          9999,
          backgroundColor: '#000000',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '32px 24px',
        }}
      >
        {/* Main presence copy */}
        <p
          style={{
            color:        '#C8962C',
            fontSize:     '28px',
            fontFamily:   'Oswald, sans-serif',
            fontWeight:   700,
            textAlign:    'center',
            letterSpacing: '0.02em',
            marginBottom: '48px',
          }}
        >
          {state.headerCopy || DEGRADED_COPY.presence0}
        </p>

        {/* "I found you." override — always visible in PRESENCE */}
        <button
          onClick={() => {
            hapticFire(HAPTIC.foundEachOther);
            onFoundYou();
          }}
          style={{
            padding:         '18px 32px',
            borderRadius:    '16px',
            backgroundColor: 'rgba(200, 150, 44, 0.15)',
            border:          '1px solid rgba(200, 150, 44, 0.4)',
            color:           '#C8962C',
            fontSize:        '16px',
            fontFamily:      'Oswald, sans-serif',
            fontWeight:      700,
            letterSpacing:   '0.05em',
            cursor:          'pointer',
          }}
        >
          {DEGRADED_COPY.foundYou}
        </button>

        {targetName && (
          <p
            style={{
              color:      'rgba(255,255,255,0.3)',
              fontSize:   '12px',
              marginTop:  '12px',
              textAlign:  'center',
            }}
          >
            {targetName}
          </p>
        )}
      </div>
    );
  }

  // ── MINIMAL / REDUCED: inline overlay bar at top of view ─────────────────
  return (
    <div
      style={{
        position:        'absolute',
        top:             0,
        left:            0,
        right:           0,
        zIndex:          100,
        padding:         '10px 16px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        backgroundColor: isMinimal
          ? 'rgba(0,0,0,0.85)'
          : 'rgba(0,0,0,0.60)',
        backdropFilter:  'blur(8px)',
      }}
    >
      <span
        style={{
          color:       isMinimal ? '#C8962C' : 'rgba(255,255,255,0.7)',
          fontSize:    '13px',
          fontFamily:  'Oswald, sans-serif',
          fontWeight:  600,
          letterSpacing: '0.04em',
        }}
      >
        {state.proximityText || state.headerCopy}
      </span>

      {/* "I found you." override — always accessible per spec §6 */}
      <button
        onClick={() => {
          hapticFire(HAPTIC.foundEachOther);
          onFoundYou();
        }}
        style={{
          padding:         '6px 14px',
          borderRadius:    '20px',
          backgroundColor: 'rgba(200, 150, 44, 0.15)',
          border:          '1px solid rgba(200, 150, 44, 0.35)',
          color:           '#C8962C',
          fontSize:        '12px',
          fontFamily:      'Oswald, sans-serif',
          fontWeight:      700,
          cursor:          'pointer',
        }}
      >
        {DEGRADED_COPY.foundYou}
      </button>
    </div>
  );
}

// ── Stall nudge component — mounts on top of route view ──────────────────────

interface StallNudgeProps {
  stallSeconds: number;
}

export function StallNudge({ stallSeconds }: StallNudgeProps) {
  if (stallSeconds < 60) return null;

  return (
    <div
      style={{
        position:        'absolute',
        bottom:          120,
        left:            16,
        right:           16,
        padding:         '10px 16px',
        borderRadius:    '12px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        border:          '1px solid rgba(255,255,255,0.1)',
        backdropFilter:  'blur(8px)',
        zIndex:          50,
      }}
    >
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 }}>
        {DEGRADED_COPY.stall60}
      </p>
      {stallSeconds >= 70 && (
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '4px 0 0' }}>
          {DEGRADED_COPY.stall70}
        </p>
      )}
    </div>
  );
}

// ── Micro-confusion sequence — surfaces "Look up." and FLASH button ───────────

interface MicroConfusionProps {
  elapsedSeconds: number;
  onFlash:        () => void;
  flashCooldown?: boolean;
  cooldownSecs?:  number;
}

export function MicroConfusionSequence({
  elapsedSeconds,
  onFlash,
  flashCooldown = false,
  cooldownSecs  = 0,
}: MicroConfusionProps) {
  if (elapsedSeconds < 1) return null;

  return (
    <div
      style={{
        position:        'absolute',
        top:             '40%',
        left:            16,
        right:           16,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        gap:             '12px',
        zIndex:          80,
      }}
    >
      <p
        style={{
          color:      '#C8962C',
          fontSize:   '22px',
          fontFamily: 'Oswald, sans-serif',
          fontWeight: 700,
          textAlign:  'center',
        }}
      >
        {elapsedSeconds >= 3 ? DEGRADED_COPY.microLookUp : DEGRADED_COPY.microClose}
      </p>

      {/* FLASH button auto-surfaces at T+15s per spec §4 */}
      {elapsedSeconds >= 15 && (
        <button
          onClick={() => {
            if (!flashCooldown) onFlash();
          }}
          disabled={flashCooldown}
          style={{
            padding:         '12px 28px',
            borderRadius:    '14px',
            backgroundColor: flashCooldown
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(200, 150, 44, 0.2)',
            border:          `1px solid ${flashCooldown ? 'rgba(255,255,255,0.1)' : 'rgba(200,150,44,0.4)'}`,
            color:           flashCooldown ? 'rgba(255,255,255,0.3)' : '#C8962C',
            fontSize:        '14px',
            fontFamily:      'Oswald, sans-serif',
            fontWeight:      700,
            cursor:          flashCooldown ? 'default' : 'pointer',
          }}
        >
          {flashCooldown
            ? `${cooldownSecs}s`
            : 'Flash?'}
        </button>
      )}
    </div>
  );
}
