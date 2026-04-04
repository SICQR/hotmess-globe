/**
 * TacticalProfileCard — Compact profile card for RightNow/discovery overlay.
 *
 * @deprecated Legacy variant. Canonical profile card is SmartProfileCard
 * at src/features/profilesGrid/SmartProfileCard.tsx (Ring 4 OS Remap).
 * Used only by RightNowOverlay.jsx. Migrate to SmartProfileCard when
 * refactoring that component.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Flame, Users, Music } from 'lucide-react';
import OSCard, { OSCardImage, OSCardBadge } from '../ui/OSCard';

const getUserPhotoUrls = (user) => {
  const urls = [];
  const push = (value) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return;
    if (urls.includes(url)) return;
    urls.push(url);
  };

  const photos = Array.isArray(user?.photos) ? user.photos : [];
  for (const item of photos) {
    if (typeof item === 'string') push(item);
    else if (item && typeof item === 'object') push(item.url || item.file_url || item.href);
  }

  push(user?.avatar_url);
  push(user?.avatarUrl);
  return urls.filter(Boolean).slice(0, 5);
};

export default function TacticalProfileCard({ user, delay = 0, hotScore = 0 }) {
  const isHot = hotScore > 50;

  const photoUrls = getUserPhotoUrls(user);
  const primaryPhotoUrl = photoUrls[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&size=400&background=C8962C&color=000`;
  
  const getIntentIcon = () => {
    if (!user.current_intent) return null;
    const icons = {
      dancing: Music,
      hosting: Users,
      exploring: Flame
    };
    const Icon = icons[user.current_intent] || Flame;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group"
    >
      <Link to={createPageUrl(`Profile?email=${user.email}`)}>
        <OSCard 
          className={isHot ? 'animate-pulse border-[#C8962C]' : ''}
          hoverGlow={true}
        >
          {/* Grayscale Profile Photo */}
          <div className="relative aspect-square">
            <OSCardImage
              src={primaryPhotoUrl}
              alt={user.full_name}
              grayscale={true}
            />
            
            {/* Level Badge - Top Right */}
            <div className="absolute top-3 right-3">
              <OSCardBadge color="#FFEB3B">
                LVL {level}
              </OSCardBadge>
            </div>

            {/* Intent Icon - Bottom Left with Pulse */}
            {user.current_intent && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute bottom-3 left-3 w-10 h-10 bg-[#C8962C] flex items-center justify-center text-black border-2 border-white"
              >
                {getIntentIcon()}
              </motion.div>
            )}

            {/* Hot Score Indicator */}
            {isHot && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 border-4 border-[#C8962C] pointer-events-none"
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="p-4 space-y-2">
            <h3 className="font-black text-lg truncate group-hover:text-[#C8962C] transition-colors">
              {user.full_name}
            </h3>
            
            {user.bio && (
              <p className="text-xs text-white/60 line-clamp-2">
                {user.bio}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-3 text-xs">
              {user.preferred_vibes && user.preferred_vibes.length > 0 && (
                <span className="text-[#C8962C]">{user.preferred_vibes[0]}</span>
              )}
            </div>

            {/* Heat Score Debug */}
            {hotScore > 0 && (
              <div className="text-[10px] text-white/40 font-mono">
                🔥 {hotScore} views
              </div>
            )}
          </div>
        </OSCard>
      </Link>
    </motion.div>
  );
}