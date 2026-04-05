/**
 * GhostedCard — Compact grid card for proximity grid.
 *
 * Renders: photo, name, distance, context, presence indicator.
 * NEVER renders blank — always falls back to "Anonymous" / "Nearby".
 * Tap → opens preview sheet (NOT direct chat).
 * Long-press → quick action menu.
 */

import { memo, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GhostedUser } from '@/lib/ghostedUtils';
import { formatDistance } from '@/lib/ghostedUtils';

const AMBER = '#C8962C';

interface GhostedCardProps {
  user: GhostedUser;
  onTap: (user: GhostedUser) => void;
  onLongPress?: (user: GhostedUser, position: { x: number; y: number }) => void;
  isBood?: boolean;
  /** Amber ring if boosted */
  isBoosted?: boolean;
}

function GhostedCardInner({ user, onTap, onLongPress, isBood, isBoosted }: GhostedCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);
  const didLongPress = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    didLongPress.current = false;
    setPressing(true);
    const x = e.clientX;
    const y = e.clientY;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPressing(false);
      onLongPress?.(user, { x, y });
    }, 500);
  }, [user, onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    setPressing(false);
    if (!didLongPress.current) {
      onTap(user);
    }
  }, [user, onTap]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    setPressing(false);
  }, []);

  // Presence dot colour
  const dotColor = user.isMoving
    ? AMBER
    : user.isAtVenue
      ? '#8B5CF6'
      : user.isLive
        ? '#FF5500'
        : user.isOnline
          ? '#34C759'
          : 'transparent';

  const showDot = dotColor !== 'transparent';
  const distStr = formatDistance(user.distance);

  return (
    <motion.div
      className="relative aspect-[3/4] overflow-hidden select-none touch-manipulation"
      style={{
        background: '#1C1C1E',
        borderRadius: 0,
        ...(isBoosted ? { boxShadow: `inset 0 0 0 2px ${AMBER}` } : {}),
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
    >
      {/* Photo */}
      {user.avatar ? (
        <img
          src={user.avatar}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5">
          <span className="text-2xl font-black text-white/20">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Gradient overlay at bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }}
      />

      {/* Presence dot — top right */}
      {showDot && (
        <span
          className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-black/50"
          style={{ backgroundColor: dotColor }}
        />
      )}

      {/* Boo'd indicator — top left */}
      {isBood && (
        <span
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black"
          style={{ background: `${AMBER}30`, color: AMBER }}
        >
          BOO
        </span>
      )}

      {/* Bottom info strip: name, distance, context */}
      <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-6 pointer-events-none">
        <p className="text-[11px] font-bold text-white leading-tight truncate">
          {user.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {distStr && (
            <span className="text-[9px] font-semibold text-white/60">{distStr}</span>
          )}
          {distStr && user.context !== 'Nearby' && (
            <span className="text-[9px] text-white/30">·</span>
          )}
          <span className="text-[9px] font-medium text-white/50 truncate">
            {user.context}
          </span>
        </div>
      </div>

      {/* Moving arrow indicator */}
      {user.isMoving && (
        <motion.div
          className="absolute top-1.5 left-1/2 -translate-x-1/2"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <span className="text-[10px]" style={{ color: AMBER }}>→</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export const GhostedCard = memo(GhostedCardInner);
export default GhostedCard;
