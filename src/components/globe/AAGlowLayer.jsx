/**
 * HOTMESS v6 — AA System: Globe Glow Layer
 * src/components/globe/AAGlowLayer.jsx
 *
 * Spec: HOTMESS-AA-System.docx §9
 *
 * Globe z-axis layer order:
 *   1. Map tiles
 *   2. AA ambient glow (this component) ← HERE
 *   3. Venue beacons
 *   4. Event beacons
 *   5. User proximity dots
 *   6. Meet signals
 *   7. ESCALATED AA overlay (also rendered here when ESCALATED)
 *
 * HARD RULES:
 *   - Always renders PASSIVE (opacity 0.06) when flag is on — never invisible
 *   - ESCALATED dims layers 3–6 slightly via overlay div
 *   - Gold only — never red, never alarming
 *   - Operators cannot disable this layer
 */

import { useEffect } from 'react';
import { useAAState } from '@/hooks/useAAState';
import { useV6Flag } from '@/hooks/useV6Flag';
import { AA_PULSE_KEYFRAMES, AA_ESCALATED_OVERLAY_STYLE } from '@/lib/v6/aaSystem';

// Inject pulse keyframes once
let keyframesInjected = false;
function ensurePulseKeyframes() {
  if (keyframesInjected) return;
  const style = document.createElement('style');
  style.setAttribute('data-aa-keyframes', '1');
  style.textContent = AA_PULSE_KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

export default function AAGlowLayer({ lat, lng, radiusKm = 2.0 }) {
  const flagOn = useV6Flag('v6_aa_system');
  const { glow, isEscalated, loading } = useAAState({ lat, lng, radiusKm });

  useEffect(() => {
    if (flagOn) ensurePulseKeyframes();
  }, [flagOn]);

  // Flag off: render nothing (spec: "If not explicitly enabled it does not exist")
  if (!flagOn) return null;

  // During initial load: render PASSIVE glow immediately — never show blank Globe
  const glowStyle = loading ? {
    background: '#B8860B',
    opacity: 0.06,
    animation: 'none',
    transition: 'opacity 2s ease',
  } : glow;

  return (
    <>
      {/* Layer 2: AA ambient glow — always present when flag on */}
      <div
        aria-hidden="true"
        data-testid="aa-glow-layer"
        data-aa-state={loading ? 'PASSIVE' : undefined}
        style={{
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          zIndex:        2,
          borderRadius:  'inherit',
          ...glowStyle,
        }}
      />

      {/* Layer 7: ESCALATED overlay — dims venue/event/meet layers */}
      {isEscalated && (
        <div
          aria-hidden="true"
          data-testid="aa-escalated-overlay"
          style={{
            position:      'absolute',
            inset:         0,
            zIndex:        7,
            ...AA_ESCALATED_OVERLAY_STYLE,
          }}
        />
      )}
    </>
  );
}
