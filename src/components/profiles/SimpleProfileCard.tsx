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
  distanceKm,
  isOnline,
  sceneTag,
  tonightVibe,
  onClick,
}: SimpleProfileCardProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'HM';

  const showOnlineDot = isOnline || status === 'online';
  const showAwayDot = !showOnlineDot && status === 'away';

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
      className={`relative w-full h-full overflow-hidden rounded-sm bg-[#1C1C1E] cursor-pointer ${ringClass ? `ring-2 ${ringClass}` : ''}`}
      style={{ aspectRatio: '3/4' }}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.08 }}
    >
      {/* Photo or branded initials fallback */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A0A20] to-[#2A0A30] flex items-center justify-center">
          <span className="text-4xl font-black text-[#C8962C]/60 select-none">{initials}</span>
        </div>
      )}

      {/* Bottom gradient — subtle, just enough for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* TOP-LEFT: Online / Away dot */}
      {showOnlineDot && (
        <div className="absolute top-2 left-2 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-[#30D158] ring-2 ring-black/50" />
        </div>
      )}
      {showAwayDot && (
        <div className="absolute top-2 left-2 z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFCC00] ring-2 ring-black/50" />
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
              <span className="px-1.5 py-[1px] bg-white/8 text-white/45 text-[8px] font-semibold rounded-full leading-none truncate max-w-[60px]">
                {sceneTag}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-sm border border-transparent group-hover:border-[#C8962C]/40 transition-colors pointer-events-none" />
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
