/**
 * VibeSelector — one-tap vibe pills.
 *
 * 5 branded vibes: RAW, HUNG, HIGH, LOOKING, CHILLING
 * Horizontal row, bold, minimal. Tap to set, tap again to clear.
 * Shows after check-in or in VenuePanel.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { VIBES, VIBE_CONFIG, type Vibe } from '@/hooks/useVenueVibes';

interface VibeSelectorProps {
  selected: Vibe | null;
  onSelect: (vibe: Vibe) => void;
  loading?: boolean;
  compact?: boolean;
}

export default function VibeSelector({ selected, onSelect, loading, compact }: VibeSelectorProps) {
  return (
    <div className={`flex gap-2 ${compact ? 'justify-center' : 'justify-start overflow-x-auto no-scrollbar'}`}>
      {VIBES.map((vibe, i) => {
        const cfg = VIBE_CONFIG[vibe];
        const isActive = selected === vibe;

        return (
          <motion.button
            key={vibe}
            onClick={() => onSelect(vibe)}
            disabled={loading}
            className={`flex-shrink-0 rounded-full font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 ${
              compact ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2 text-xs'
            }`}
            style={{
              background: isActive ? `${cfg.color}30` : 'rgba(255,255,255,0.04)',
              color: isActive ? cfg.color : 'rgba(255,255,255,0.4)',
              border: `1px solid ${isActive ? `${cfg.color}50` : 'rgba(255,255,255,0.06)'}`,
              boxShadow: isActive ? `0 0 12px ${cfg.color}20` : undefined,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
            whileTap={{ scale: 0.92 }}
          >
            <span className="mr-1">{cfg.emoji}</span>
            {cfg.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * VibeMixBar — horizontal dot bar showing vibe composition at a venue.
 * Used in VenuePanel and GhostedOverlay.
 */
export function VibeMixBar({
  vibes,
  total,
}: {
  vibes: Record<Vibe, number>;
  total: number;
}) {
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {VIBES.map(vibe => {
        const count = vibes[vibe];
        if (count === 0) return null;
        const pct = Math.round((count / total) * 100);
        const cfg = VIBE_CONFIG[vibe];

        return (
          <motion.div
            key={vibe}
            className="flex items-center gap-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}60` }}
            />
            <span className="text-[10px] font-semibold" style={{ color: `${cfg.color}CC` }}>
              {pct}%
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * VibeChip — small inline badge showing a user's current vibe.
 * Used on PresenceCards in GhostedOverlay.
 */
export function VibeChip({ vibe }: { vibe: Vibe }) {
  const cfg = VIBE_CONFIG[vibe];

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
      style={{
        background: `${cfg.color}20`,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
      }}
    >
      <span className="text-[8px]">{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}
