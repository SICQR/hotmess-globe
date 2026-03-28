/**
 * ProximityUserCard — User card with distance and travel time
 *
 * Adapted from SICQR/ghosted UserCard with HOTMESS styling:
 * - Gold (#C8962C) accents
 * - Dark theme (bg-[#1C1C1E])
 * - Lucide icons instead of Phosphor
 * - HOTMESS badge styling
 */

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatDistance, formatTravelTime } from '@/lib/locationUtils';
import { PresenceIndicator } from './PresenceIndicator';

interface ProximityUser {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string;
  distance: number; // meters
  travelTime?: number; // minutes
  online: boolean;
  lastSeen?: string | Date;
}

interface ProximityUserCardProps {
  user: ProximityUser;
  onClick: () => void;
}

export function ProximityUserCard({ user, onClick }: ProximityUserCardProps) {
  const avatarSrc = user.avatarUrl || user.avatar;
  const hasImage = avatarSrc && avatarSrc.startsWith('http');

  const getPresenceText = () => {
    if (user.online) {
      return 'Active now';
    }
    if (user.lastSeen) {
      const lastSeenDate = typeof user.lastSeen === 'string' ? new Date(user.lastSeen) : user.lastSeen;
      return `Active ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`;
    }
    return 'Offline';
  };

  return (
    <motion.div
      className="relative overflow-hidden aspect-[3/4] cursor-pointer rounded-xl bg-[#1C1C1E] border border-white/10 hover:border-[#C8962C]/50 transition-all duration-200 group"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar background */}
      {hasImage ? (
        <img
          src={avatarSrc}
          alt={user.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #C8962C 0%, #1C1C1E 100%)`,
          }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Online indicator */}
      {user.online && (
        <div className="absolute top-3 right-3">
          <PresenceIndicator isOnline={true} size="md" />
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
        <h3 className="text-white font-bold text-lg leading-tight truncate">
          {user.name}
        </h3>

        <div className="flex items-center gap-2 text-sm flex-wrap">
          {/* Distance badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white/90 text-xs font-medium border border-white/10">
            <MapPin className="w-3 h-3 text-[#C8962C]" />
            {formatDistance(user.distance)}
            {user.travelTime && ` · ${user.travelTime} min`}
          </span>

          {/* Status badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full backdrop-blur-sm text-xs font-medium border ${
              user.online
                ? 'bg-[#C8962C]/20 text-[#C8962C] border-[#C8962C]/30'
                : 'bg-black/60 text-white/50 border-white/10'
            }`}
          >
            {getPresenceText()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default ProximityUserCard;
