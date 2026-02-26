import React from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Trophy } from 'lucide-react';
import { isGamificationEnabled } from '@/lib/featureFlags';

export default function ProfileStats({
  followersCount,
  followingCount,
  checkInsCount,
  achievementsCount,
  city
}) {
  const stats = [
    { icon: Users, label: 'Followers', value: followersCount, color: '#00D9FF' },
    { icon: Users, label: 'Following', value: followingCount, color: '#00D9FF' },
    { icon: MapPin, label: 'Check-ins', value: checkInsCount, color: '#39FF14' },
    // Only show badges/achievements when gamification is enabled
    ...(isGamificationEnabled() ? [{ icon: Trophy, label: 'Badges', value: achievementsCount, color: '#B026FF' }] : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="bg-black border-2 border-white p-4 hover:border-[#C8962C] transition-all group"
        >
          <div className="flex items-center gap-3">
            <stat.icon 
              className="w-6 h-6 group-hover:scale-110 transition-transform" 
              style={{ color: stat.color }} 
            />
            <div>
              <p className="text-2xl font-black" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                {stat.label}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}