/**
 * SimpleProfileCard — Clean, brutalist profile card
 *
 * @deprecated Legacy variant. Canonical profile card is SmartProfileCard
 * at src/features/profilesGrid/SmartProfileCard.tsx (Ring 4 OS Remap).
 * Used only by ProfileCard.tsx in profilesGrid. Migrate to SmartProfileCard
 * when refactoring that component.
 *
 * Design principles:
 * - Minimal: photo, name, status, one action
 * - Brutalist: sharp edges, high contrast
 * - HOTMESS colors: hot pink (#C8962C), cyan (#00C2E0)
 * - Mobile-first: 44px touch targets
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, MapPin } from 'lucide-react';
import { PresenceIndicator } from '@/components/social/PresenceIndicator';

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
  onClick?: () => void;
  onMessage?: () => void;
}

const STATUS_COLORS = {
  online: '#39FF14',
  away: '#FFEB3B', 
  offline: 'transparent',
};

export function SimpleProfileCard({
  id,
  name,
  photoUrl,
  status = 'offline',
  location,
  distance,
  matchPercent,
  isVerified,
  lookingFor,
  position,
  age,
  lastSeen,
  distanceKm,
  isOnline,
  sceneTag,
  onClick,
  onMessage,
}: SimpleProfileCardProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'HM';

  // Helper to get distance badge with color coding
  const getDist = (km?: number) => {
    if (!km && km !== 0) return null;
    const label = km < 1 ? `${Math.round(km*1000)}m` : `${km.toFixed(1)}km`;
    const color = km < 0.5 ? 'text-[#39FF14]' : km < 2 ? 'text-amber-400' : 'text-white/50';
    return <span className={`text-[10px] font-bold ${color}`}>{label}</span>;
  };

  // Check if online: is_online OR within 15 minutes
  const showOnlineDot = isOnline || (status === 'online');

  return (
    <motion.div
      className="relative w-full h-full min-h-0 overflow-hidden bg-black border border-white/10 group cursor-pointer"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {/* Photo or initials */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          draggable={false}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8962C]/20 to-[#00C2E0]/20 flex items-center justify-center">
          <span className="text-3xl font-black text-white/60">{initials}</span>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />

      {/* TOP-LEFT: Online dot (8px green if online within 15min) */}
      {showOnlineDot && (
        <div className="absolute top-2 left-2 w-2 h-2 bg-[#39FF14] rounded-full z-10" />
      )}

      {/* TOP-RIGHT: Distance badge */}
      {distanceKm !== undefined && (
        <div className="absolute top-2 right-2 z-10">
          {getDist(distanceKm)}
        </div>
      )}

      {/* Status indicator — using PresenceIndicator for gold pulsing dot */}
      {status !== 'offline' && !showOnlineDot && (
        <div className="absolute top-2 right-2 z-10">
          <PresenceIndicator isOnline={status === 'online'} size="lg" />
        </div>
      )}

      {/* Match badge */}
      {matchPercent && matchPercent > 0 && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-[#C8962C] to-[#00C2E0] text-black text-[10px] font-black uppercase">
          {matchPercent}% MATCH
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {/* Name + age (inline) */}
        <div className="flex items-baseline gap-1">
          <h3 className="text-white font-black text-sm truncate">{name}</h3>
          {age && <span className="text-white/55 text-xs flex-shrink-0">{age}</span>}
        </div>

        {/* Position + scene tag chips */}
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {position && (
            <span className="px-1.5 py-0.5 bg-[#C8962C]/20 text-[#C8962C] text-[9px] font-black rounded-full border border-[#C8962C]/30">
              {position.toUpperCase().slice(0,4)}
            </span>
          )}
          {sceneTag && (
            <span className="px-1.5 py-0.5 bg-white/10 text-white/50 text-[9px] rounded-full">
              {sceneTag.slice(0,8)}
            </span>
          )}
        </div>

        {/* Location/distance */}
        {(location || distance) && (
          <div className="flex items-center gap-1 mt-1 text-white/40 text-[11px]">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{distance || location}</span>
          </div>
        )}

        {/* Looking for tags */}
        {lookingFor && lookingFor.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lookingFor.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-[#C8962C]/20 text-[#C8962C] text-[10px] font-bold uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Last seen (when not online) */}
        {status === 'offline' && lastSeen && (
          <div className="mt-1 text-white/40 text-[10px]">
            {lastSeen}
          </div>
        )}

        {/* Action button */}
        {onMessage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
            className="mt-3 w-full h-10 flex items-center justify-center gap-2 bg-[#C8962C] text-white text-xs font-black uppercase tracking-wider hover:bg-[#C8962C]/80 active:scale-98 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            MESSAGE
          </button>
        )}
      </div>

      {/* Hover border effect */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#C8962C] transition-colors pointer-events-none" />
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

export function ProfileGrid({ children, columns = 2 }: ProfileGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-2 p-2`}>
      {children}
    </div>
  );
}

export default SimpleProfileCard;
