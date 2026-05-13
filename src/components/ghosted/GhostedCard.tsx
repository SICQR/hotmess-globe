/**
 * GhostedCard — single profile card in the Ghosted grid.
 *
 * Phil exec review 2026-05-13: this is scanning encrypted nightlife
 * signals, not browsing profiles. Presence is DETECTED not announced,
 * mutuality is quietly dangerous not celebrated, fallback art is
 * obscured silhouette not letters.
 *
 * ┌──────────────────┐
 * │  [Photo 4:5]   ° │  ← online dot — 6px, low-saturation, inset
 * │                   │
 * │  Name · ✓         │  ← 13px bold, verified
 * │  340m near Eagle  │  ← one human line, merged distance + place
 * └──────────────────┘
 *
 * Mutual = +0.5px gold edge + tiny gold glyph in corner.
 * Boo'd = tiny dim gold glyph in corner.
 * No "MATCH" / "BOO" text labels — those read dating-app reward.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Ghost } from 'lucide-react';

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
  /** User email for boo state lookups */
  email?: string | null;
  /** Whether current user has boo'd this person */
  isBood?: boolean;
  /** Whether this is a mutual boo (both boo'd each other) */
  isMutual?: boolean;
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
  isBood,
  isMutual,
  index,
  onTap,
}: GhostedCardComponentProps) {
  const intentColor = intent ? INTENT_RING[intent] : undefined;

  // Merge distance + context into one human line. Distance alone reads as
  // system copy ("340m"); context alone hides proximity. Combined feels
  // intercepted, not browsed.
  const distLabel = distanceM == null
    ? null
    : distanceM < 100  ? '<100m'
    : distanceM < 1000 ? `${distanceM}m`
    : `${(distanceM / 1000).toFixed(1)}km`;
  const mergedLine = (() => {
    if (!distLabel && !contextLabel) return null;
    if (!distLabel) return contextLabel;
    if (!contextLabel) return distLabel;
    // Prefer "at {venue}" / "near {place}" prefixes if context already
    // includes a preposition; otherwise interpose " · ".
    const ctxLower = contextLabel.toLowerCase();
    if (ctxLower.startsWith('at ') || ctxLower.startsWith('near ') ||
        ctxLower.startsWith('in ')  || ctxLower.startsWith('from ')) {
      return `${distLabel} · ${contextLabel}`;
    }
    return `${distLabel} · ${contextLabel}`;
  })();

  return (
    <motion.button
      className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#C8962C]/50"
      style={isMutual ? { boxShadow: 'inset 0 0 0 0.5px rgba(200,150,44,0.55)' } : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.25 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onTap(id)}
      aria-label={`View ${name}'s profile`}
    >
      {/* Photo or obscured silhouette — never initials, never placeholder.
          Ambient believability per Phil's hierarchy directive. */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 42%, #1a1410 0%, #0d0a08 55%, #050405 100%)',
          }}
          aria-hidden="true"
        >
          {/* Soft body mass — blurred low-light silhouette */}
          <div
            style={{
              position: 'absolute',
              top: '32%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '55%',
              height: '54%',
              borderRadius: '46% 46% 32% 32%',
              background: 'rgba(255,255,255,0.025)',
              filter: 'blur(10px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '22%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '24%',
              height: '24%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      )}

      {/* Gradient overlay at bottom for text legibility */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        }}
      />

      {/* Presence — detected, not announced. 6px, desaturated, inset. */}
      {isOnline && (
        <span
          className="absolute rounded-full"
          style={{
            top: 10, right: 10,
            width: 6, height: 6,
            background: 'rgba(48,209,88,0.55)',
            boxShadow: '0 0 4px rgba(48,209,88,0.25)',
          }}
          aria-label="Online"
        />
      )}

      {/* Mutual / Boo — tiny corner glyph, no loud labels. Mutual gets the
          inset gold edge (set on the motion.button). */}
      {(isMutual || isBood) && (
        <span
          className="absolute"
          style={{
            top: 10, left: 10,
            opacity: isMutual ? 0.95 : 0.45,
          }}
          aria-label={isMutual ? 'Mutual' : 'Booed'}
        >
          <Ghost size={11} strokeWidth={1.6} color="#C8962C" />
        </span>
      )}

      {/* Intent ring indicator (thin border at top) */}
      {intentColor && (
        <div
          className="absolute top-0 inset-x-0 h-0.5"
          style={{ backgroundColor: intentColor }}
        />
      )}

      {/* Text content — name + single merged proximity line. */}
      <div className="absolute inset-x-0 bottom-0 px-2 pb-2 flex flex-col gap-0.5">
        {/* Name row */}
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-medium text-white truncate leading-tight">
            {name}
          </span>
          {isVerified && (
            <BadgeCheck className="w-3 h-3 flex-shrink-0 text-[#C8962C]" />
          )}
        </div>

        {/* Single human proximity line — distance + place merged. */}
        {mergedLine && (
          <span className="text-[11px] text-white/50 truncate leading-tight flex items-center gap-1">
            {contextType === 'moving' && (
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block"
                style={{ color: 'rgba(200,150,44,0.55)' }}
              >
                &rarr;
              </motion.span>
            )}
            {mergedLine}
          </span>
        )}
      </div>
    </motion.button>
  );
}

export const GhostedCard = memo(GhostedCardInner);
export default GhostedCard;
