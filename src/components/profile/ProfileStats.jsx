import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Award, Users, MapPin, Trophy } from 'lucide-react';

export default function ProfileStats({ 
  xp, 
  level, 
  followersCount, 
  followingCount, 
  checkInsCount,
  achievementsCount,
  city 
}) {
  const stats = [
    { icon: Zap, label: 'XP', value: xp || 0, color: '#FFEB3B' },
    { icon: Award, label: 'Level', value: level || 1, color: '#FF1493' },
    { icon: Users, label: 'Followers', value: followersCount, color: '#00D9FF' },
    { icon: Users, label: 'Following', value: followingCount, color: '#00D9FF' },
    { icon: MapPin, label: 'Check-ins', value: checkInsCount, color: '#39FF14' },
    { icon: Trophy, label: 'Badges', value: achievementsCount, color: '#B026FF' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          whileHover={{ 
            scale: 1.05,
            borderColor: stat.color,
            transition: { duration: 0.2 }
          }}
          className="bg-black border-2 border-white p-4 hover:border-[#FF1493] transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ 
                scale: 1.2,
                rotate: [0, -10, 10, 0],
                transition: { duration: 0.3 }
              }}
            >
              <stat.icon 
                className="w-6 h-6 transition-transform" 
                style={{ color: stat.color }} 
              />
            </motion.div>
            <div>
              <motion.p 
                className="text-2xl font-black"
                style={{ color: stat.color }}
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
              >
                {stat.value}
              </motion.p>
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