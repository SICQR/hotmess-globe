import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Crown, Music, Calendar, Users, Award, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BadgeDisplay({ userEmail }) {
  const { data: badges = [] } = useQuery({
    queryKey: ['profile-badges', userEmail],
    queryFn: async () => {
      try {
        const result = await base44.entities.ProfileBadge.filter({ user_email: userEmail });
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: !!userEmail,
  });

  // Defensive: ensure badges is an array
  const badgesList = Array.isArray(badges) ? badges : [];
  const activeBadges = badgesList.filter(b => !b.expires_at || new Date(b.expires_at) > new Date());

  const BADGE_ICONS = {
    verified: Shield,
    og: Crown,
    king: Crown,
    artist: Music,
    organizer: Calendar,
    crew: Users,
    supporter: Award,
    legend: Zap,
  };

  if (activeBadges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {activeBadges.map((badge, idx) => {
        const Icon = BADGE_ICONS[badge.badge_type] || Shield;
        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative"
          >
            <div 
              className="px-3 py-1 flex items-center gap-2 font-black text-xs uppercase border-2"
              style={{ 
                backgroundColor: badge.badge_color + '20',
                borderColor: badge.badge_color,
                color: badge.badge_color
              }}
            >
              <Icon className="w-3 h-3" />
              {badge.badge_label}
            </div>
            {badge.reason && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border-2 border-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-xs">
                {badge.reason}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}