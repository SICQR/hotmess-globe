/**
 * GhostedCard — Single profile card in the Ghosted grid
 *
 * Compact 3-column card: photo, name, distance, context line.
 * Tap → ghosted-preview sheet. No direct-to-chat.
 *
 * ┌──────────────────┐
 * │  [Photo 4:5]   ● │  ← online dot (green, top-right)
 * │                   │
 * │  Name · ✓         │  ← 13px bold, verified badge
 * │  340m away        │  ← 11px white/40
 * │  At Eagle  [vibe] │  ← 10px context + optional chip
 * └──────────────────┘
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GhostedCardProps {
  id: string;
  name: string;
  avatarUrl: string | null;
  distanceM: number | null;
  isOnline: boolean;
  isVerified: boolean;
  contextType: 'nearby' | 'venue' | 'radio' | 'moving' | 'live';
  contextLabel: string;
  vibe: string | null;
  intent: string | null;
}

interface GhostedCardComponentProps extends GhostedCardProps {
  index: number;
  onTap: (id: string) => void;
}

// ── Intent ring colours (rings only, not CTAs) ──────────────────────────────

const INTENT_RING: Record<string, string> = {
  hookup: '#FF5500',
  hang: '#00C2E0',
  explore: '#A899D8',
};

// ── Component ────────────────────────────────────────────────────────────────

function GhostedCardInner({
  id,
  name,
  avatarUrl,
  distanceM,
  isOnline,
  isVerified,
  contextType,
  contextLabel,
  vibe,
  intent,
  index,
  onTap,
}: GhostedCardComponentProps) {
  const intentColor = intent ? INTENT_RING[intent] : undefined;

  return (
    <motion.button
      className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-[#C8962C]/50"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.25 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onTap(id)}
      aria-label={`View ${name}'s profile`}
    >
      {/* Photo / fallback */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1C1C1E 0%, #0D0D0D 100%)',
          }}
        >
          <span className="text-2xl font-black text-white/20">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Gradient overlay at bottom for text legibility */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        }}
      />

      {/* Online dot */}
      {isOnline && (
        <span
          className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-black/30"
          style={{ backgroundColor: '#30D158' }}
          aria-label="Online"
        />
      )}

      {/* Intent ring indicator (thin border at top) */}
      {intentColor && (
        <div
          className="absolute top-0 inset-x-0 h-0.5"
          style={{ backgroundColor: intentColor }}
        />
      )}

      {/* Text content */}
      <div className="absolute inset-x-0 bottom-0 px-2 pb-2 flex flex-col gap-0.5">
        {/* Name row */}
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-bold text-white truncate leading-tight">
            {name}
          </span>
          {isVerified && (
            <BadgeCheck className="w-3 h-3 flex-shrink-0 text-[#C8962C]" />
          )}
        </div>

        {/* Distance */}
        {distanceM != null && (
          <span className="text-[11px] text-white/40 leading-tight">
            {distanceM < 1000 ? `${distanceM}m` : `${(distanceM / 1000).toFixed(1)}km`}
          </span>
        )}

        {/* Context line + vibe chip */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/50 truncate leading-tight">
            {contextLabel}
          </span>
          {vibe && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 flex-shrink-0 leading-tight">
              {vibe}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export const GhostedCard = memo(GhostedCardInner);
export default GhostedCard;
