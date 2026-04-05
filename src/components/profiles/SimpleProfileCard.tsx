/**
 * SimpleProfileCard — HOTMESS OS profile card
 *
 * Grindr-style: photo-forward, minimal text overlay, data-dense but clean.
 * Aspect ratio 3:4. Dark gradient overlay. Gold accent only.
 *
 * Shows: photo (or branded initials), online dot, distance badge,
 * name + age, position chip, first scene tag, tonight-vibe ring.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface SimpleProfileCardProps {
  id: string;
  name: string;
  photoUrl?: string;
  status?: 'online' | 'away' | 'offline';
  location?: string;
  distance?: string;
  matchPercent?: number;
  isVerified?: boolean;
  lookingFor?: string[];
  position?: string;
  age?: number;
  lastSeen?: string;
  distanceKm?: number;
  isOnline?: boolean;
  sceneTag?: string;
  tonightVibe?: string; // hookup | hang | explore
  onClick?: () => void;
  onMessage?: () => void;
  onVibeTagClick?: (tag: string) => void;
}

const INTENT_RING: Record<string, string> = {
  hookup: 'ring-[#FF5500]',
  hang: 'ring-[#00C2E0]',
  explore: 'ring-[#A899D8]',
};

export function SimpleProfileCard({
  name,
  photoUrl,
  status = 'offline',
  distance,
  isVerified,
  position,
  age,
  lastSeen,
  distanceKm,
  isOnline,
  sceneTag,
  tonightVibe,
  onClick,
  onVibeTagClick,
}: SimpleProfileCardProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'HM';

  // Presence: online (green), away (amber), offline (grey)
  // status prop is already computed by ProfileCard from last_seen timestamps
  const computedStatus: 'online' | 'away' | 'offline' = (() => {
    if (isOnline || status === 'online') return 'online';
    if (status === 'away') return 'away';
    return 'offline';
  })();

  const PRESENCE_DOT: Record<string, { color: string; glow?: string }> = {
    online: { color: '#30D158', glow: '0 0 4px #30D158' },
    away: { color: '#EAB308' },
    offline: { color: '#8E8E93' },
  };

  const showPresenceDot = computedStatus !== 'offline';

  // Distance label with color coding
  const distLabel = distanceKm !== undefined && distanceKm !== null
    ? distanceKm < 1
      ? `${Math.round(distanceKm * 1000)}m`
      : `${distanceKm.toFixed(1)}km`
    : distance || null;

  const distColor = distanceKm !== undefined
    ? distanceKm < 0.5 ? '#30D158' : distanceKm < 2 ? '#FF9F0A' : 'rgba(255,255,255,0.4)'
    : 'rgba(255,255,255,0.4)';

  // Position shorthand
  const posLabel = position
    ? position.length <= 4
      ? position.toUpperCase()
      : position.slice(0, 4).toUpperCase()
    : null;

  // Tonight vibe ring class
  const ringClass = tonightVibe ? INTENT_RING[tonightVibe] || '' : '';

  return (
    <motion.div
      className={`relative w-full overflow-hidden rounded-xl bg-[#1C1C1E] cursor-pointer ${ringClass ? `ring-2 ${ringClass}` : ''}`}
      style={{ aspectRatio: '3/4' }}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.08 }}
    >
      {/* Photo or ghost silhouette fallback */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1E] to-[#0D0D0D] flex flex-col items-center justify-center gap-1.5">
          <svg className="w-10 h-10 text-white/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v1a7 7 0 0 0 3 5.75V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.25A7 7 0 0 0 20 11v-1a8 8 0 0 0-8-8z" />
          </svg>
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-wider select-none">{initials}</span>
        </div>
      )}

      {/* Bottom gradient — subtle, just enough for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* TOP-LEFT: Presence dot (green=online, amber=away, hidden=offline) */}
      {showPresenceDot && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className="w-2.5 h-2.5 rounded-full ring-2 ring-black/50"
            style={{
              background: PRESENCE_DOT[computedStatus].color,
              boxShadow: PRESENCE_DOT[computedStatus].glow,
            }}
          />
        </div>
      )}

      {/* TOP-RIGHT: Distance badge */}
      {distLabel && (
        <div
          className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md text-[9px] font-black"
          style={{ background: 'rgba(0,0,0,0.6)', color: distColor, backdropFilter: 'blur(4px)' }}
        >
          {distLabel}
        </div>
      )}

      {/* Verified badge */}
      {isVerified && (
        <div className="absolute top-2 left-7 z-10">
          <div className="w-3.5 h-3.5 rounded-full bg-[#C8962C] flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
      )}

      {/* Bottom content overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6 z-10">
        {/* Name + age */}
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-white font-black text-[13px] truncate">{name}</span>
          {age && <span className="text-white/55 text-[11px] font-semibold flex-shrink-0">{age}</span>}
        </div>

        {/* Position chip + scene tag — single row */}
        {(posLabel || sceneTag) && (
          <div className="flex items-center gap-1 mt-1">
            {posLabel && (
              <span className="px-1.5 py-[1px] bg-[#C8962C]/25 text-[#C8962C] text-[8px] font-black rounded-full border border-[#C8962C]/40 leading-none">
                {posLabel}
              </span>
            )}
            {sceneTag && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVibeTagClick?.(sceneTag);
                }}
                className="px-1.5 py-[1px] bg-white/8 text-white/45 text-[8px] font-semibold rounded-full leading-none truncate max-w-[60px] active:bg-[#C8962C]/30 active:text-[#C8962C] transition-colors"
              >
                {sceneTag}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-[#C8962C]/40 transition-colors pointer-events-none" />
    </motion.div>
  );
}

/**
 * ProfileGrid — Container for profile cards
 */
interface ProfileGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function ProfileGrid({ children, columns = 3 }: ProfileGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-1 px-1`}>
      {children}
    </div>
  );
}

export default SimpleProfileCard;
