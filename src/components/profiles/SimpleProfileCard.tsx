/**
 * SimpleProfileCard — Clean, brutalist profile card
 * 
 * Design principles:
 * - Minimal: photo, name, status, one action
 * - Brutalist: sharp edges, high contrast
 * - HOTMESS colors: hot pink (#FF1493), cyan (#00D9FF)
 * - Mobile-first: 44px touch targets
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, MapPin } from 'lucide-react';

interface SimpleProfileCardProps {
  id: string;
  name: string;
  photoUrl?: string;
  status?: 'online' | 'away' | 'offline';
  location?: string;
  distance?: string;
  matchPercent?: number;
  isVerified?: boolean;
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
  onClick,
  onMessage,
}: SimpleProfileCardProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'HM';

  return (
    <motion.div
      className="relative w-full aspect-[3/4] overflow-hidden bg-black border border-white/10 group cursor-pointer"
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF1493]/20 to-[#00D9FF]/20 flex items-center justify-center">
          <span className="text-3xl font-black text-white/60">{initials}</span>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />

      {/* Status indicator */}
      {status !== 'offline' && (
        <div 
          className="absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-black"
          style={{ backgroundColor: STATUS_COLORS[status] }}
        />
      )}

      {/* Match badge */}
      {matchPercent && matchPercent > 0 && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-[#FF1493] to-[#00D9FF] text-black text-[10px] font-black uppercase">
          {matchPercent}% MATCH
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {/* Name + verified */}
        <div className="flex items-center gap-2">
          <h3 className="text-white font-black text-sm truncate">{name}</h3>
          {isVerified && (
            <span className="text-[#00D9FF] text-xs">✓</span>
          )}
        </div>

        {/* Location/distance */}
        {(location || distance) && (
          <div className="flex items-center gap-1 mt-1 text-white/60 text-xs">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{distance || location}</span>
          </div>
        )}

        {/* Action button */}
        {onMessage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
            className="mt-3 w-full h-10 flex items-center justify-center gap-2 bg-[#FF1493] text-white text-xs font-black uppercase tracking-wider hover:bg-[#FF1493]/80 active:scale-98 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            MESSAGE
          </button>
        )}
      </div>

      {/* Hover border effect */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#FF1493] transition-colors pointer-events-none" />
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
