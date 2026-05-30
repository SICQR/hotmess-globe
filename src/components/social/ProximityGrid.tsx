/**
 * ProximityGrid — 3-column grid of nearby users
 *
 * Adapted from SICQR/ghosted DiscoveryGrid with HOTMESS styling:
 * - Gold accents, dark theme
 * - Empty state with HOTMESS branding
 * - Staggered animation on load
 */

import { motion } from 'framer-motion';
import { Globe, Users } from 'lucide-react';
import { ProximityUserCard } from './ProximityUserCard';

interface ProximityUser {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string;
  distance: number;
  travelTime?: number;
  online: boolean;
  lastSeen?: string | Date;
}

interface ProximityGridProps {
  users: ProximityUser[];
  onUserClick: (userId: string) => void;
  onlineCount?: number;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ProximityGrid({
  users,
  onUserClick,
  onlineCount = 0,
  isLoading = false,
  emptyMessage = 'No one nearby right now',
}: ProximityGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Globe className="w-16 h-16 text-[#C8962C]" />
        </motion.div>
        <p className="text-white/40 mt-4">Finding people nearby...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-[60vh] px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Users className="w-20 h-20 text-white/20 mb-4" />
        <p className="text-lg text-white/40 text-center">{emptyMessage}</p>
        <p className="text-sm text-white/20 mt-2">
          Check back later or expand your radius
        </p>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white relative overflow-hidden">
      {/* Online count header */}
      {onlineCount > 0 && (
        <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5">
          <div className="w-2 h-2 rounded-full bg-[#C8962C] animate-pulse" />
          <span className="text-xs text-white/60 font-mono uppercase tracking-wider">
            {onlineCount} online nearby
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: 'easeOut',
              }}
            >
              <ProximityUserCard
                user={user}
                onClick={() => onUserClick(user.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProximityGrid;
