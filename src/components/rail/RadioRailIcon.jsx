/**
 * RadioRailIcon — Tier 4 (Page-secondary) per D16 §10.
 *
 * Phil 2026-06-02 P0.4 — radio belongs on the rail across Pulse / Ghosted /
 * Music / Shop. Tier 4 means: tap opens the local tool, state-at-rest is the
 * now-playing dot.
 *
 * Tier 4 is the first to collapse under §10.4 environmental pressure. The
 * collapse logic is owned by the rail substrate when it exists; for now this
 * icon mounts unconditionally on the four declared pages.
 *
 * Action (§10.2): tap navigates to /radio (the dedicated radio sheet/page).
 * State broadcast (§10.2): when isPlaying, gold dot with subtle glow.
 *
 * Visual: distinct from Tier 2 (Bell) — smaller halo, no atmospheric pulse
 * ring. Just the icon, with a now-playing dot when broadcasting. Per D50
 * tonal rules: clarity-first at this scale, not ambient.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Radio as RadioIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRadio } from '@/contexts/RadioContext';

const GOLD = '#C8962C';

export default function RadioRailIcon({ top = 116 }) {
  const navigate = useNavigate();
  const { isPlaying, currentShowName } = useRadio();

  const handleTap = () => {
    navigate('/radio');
  };

  const ariaLabel = isPlaying
    ? `Radio — ${currentShowName || 'live'} playing`
    : 'Radio';

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: `calc(env(safe-area-inset-top, 0px) + ${top}px)`,
        right: 12,
        zIndex: 155, // above existing Pulse rail (z:150), below Tier-2 Bell (z:160)
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: isPlaying ? 'rgba(200,150,44,0.10)' : 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isPlaying ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.10)',
        boxShadow: isPlaying
          ? `0 0 10px rgba(200,150,44,0.30), 0 4px 12px rgba(0,0,0,0.40)`
          : '0 4px 10px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        touchAction: 'manipulation',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <RadioIcon
        className="w-5 h-5"
        style={{
          color: isPlaying ? GOLD : 'rgba(255,255,255,0.7)',
          filter: isPlaying ? `drop-shadow(0 0 4px rgba(200,150,44,0.45))` : 'none',
        }}
      />

      {/* §10.2 state broadcast — now-playing dot when radio is on */}
      {isPlaying && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: GOLD,
            border: '2px solid #050507',
          }}
        />
      )}
    </button>
  );
}
