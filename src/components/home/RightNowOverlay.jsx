import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Zap, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function RightNowOverlay({ isOpen, onClose, users, onUserClick }) {
  if (!isOpen) return null;

  const getVibeBadge = (user) => {
    if (user.preferred_vibes && user.preferred_vibes.length > 0) {
      return user.preferred_vibes[0].toUpperCase();
    }
    return 'VIBING';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="border-b-2 border-[#FF1493] bg-black/80 backdrop-blur-xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">RIGHT NOW</h2>
              <p className="text-xs text-white/40 uppercase tracking-wider font-mono">
                {users.length} ACTIVE IN CITY
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Grid */}
          <div className="overflow-y-auto h-[calc(100vh-80px)] p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {users.map((user, idx) => (
                <motion.div
                  key={user.email}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onUserClick?.(user)}
                  className="bg-white/5 border-2 border-white/10 hover:border-[#FF1493] rounded-none p-4 cursor-pointer transition-all group"
                >
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-xl font-bold overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        user.full_name?.[0] || 'U'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-white truncate">{user.full_name}</div>
                      <div className="flex items-center gap-1 text-xs text-white/60">
                        <Zap className="w-3 h-3 text-[#FFEB3B]" />
                        <span className="font-mono">LVL {Math.floor((user.xp || 0) / 1000) + 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Intent Badge */}
                  <div className="mb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-none">
                      <Music className="w-3 h-3 text-[#FF1493]" />
                      <span className="text-xs font-black text-[#FF1493] uppercase tracking-wider">
                        {getVibeBadge(user)}
                      </span>
                    </div>
                  </div>

                  {/* Bio Preview */}
                  {user.bio && (
                    <p className="text-xs text-white/60 line-clamp-2 mb-3">{user.bio}</p>
                  )}

                  {/* Location Hint */}
                  <div className="flex items-center gap-1 text-xs text-white/40">
                    <MapPin className="w-3 h-3" />
                    <span className="uppercase tracking-wider">ACTIVE NOW</span>
                  </div>

                  {/* View Profile Link */}
                  <Link
                    to={createPageUrl(`Profile?email=${user.email}`)}
                    className="mt-3 block text-center text-xs font-bold text-[#FF1493] uppercase tracking-wider hover:underline"
                  >
                    VIEW PROFILE →
                  </Link>
                </motion.div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-20">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/40 text-lg">No active users right now</p>
                <p className="text-white/20 text-sm mt-2">Check back later</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}