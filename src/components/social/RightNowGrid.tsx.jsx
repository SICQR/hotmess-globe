import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Clock, MapPin, Zap, Heart } from 'lucide-react';
import { useAllUsers } from '../utils/queryConfig';

export default function RightNowGrid() {
  const [gridUsers, setGridUsers] = useState([]);

  const { data: allUsers = [] } = useAllUsers();

  const { data: rightNowStatuses = [] } = useQuery({
    queryKey: ['right-now-active'],
    queryFn: async () => {
      const statuses = await base44.entities.RightNowStatus.filter({ active: true });
      return statuses.filter(s => new Date(s.expires_at) > new Date());
    },
    refetchInterval: 15000
  });

  useEffect(() => {
    const activeUsers = rightNowStatuses.map(status => {
      const user = allUsers.find(u => u.email === status.user_email);
      return { ...user, rightNowStatus: status };
    }).filter(u => u);

    setGridUsers(activeUsers);
  }, [rightNowStatuses, allUsers]);

  if (gridUsers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm uppercase font-bold">No one Right Now</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {gridUsers.map((user, idx) => {
        const level = Math.floor((user.xp || 0) / 1000) + 1;
        const isColdVibe = user.rightNowStatus?.cold_vibe;
        const pulseColor = isColdVibe ? '#50C878' : '#39FF14';

        return (
          <motion.div
            key={user.email}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative"
          >
            <Link to={createPageUrl(`Profile?email=${user.email}`)}>
              <div className="bg-white/5 border-2 border-white/10 hover:border-[#39FF14] transition-all p-4 cursor-pointer group">
                {/* Pulse Indicator */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute top-2 right-2 w-3 h-3 rounded-full"
                  style={{ backgroundColor: pulseColor }}
                />

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-gradient-to-br from-[#FF1493] to-[#B026FF] border-2 border-white flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                        style={{ filter: 'grayscale(100%)' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-black">
                        {user.full_name?.[0] || '?'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-lg truncate group-hover:text-[#39FF14] transition-colors">
                      {user.full_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                      <span className="text-[#FFEB3B] font-mono">LVL {level}</span>
                      <span>•</span>
                      <span>{user.xp || 0} XP</span>
                    </div>

                    {/* Logistics */}
                    {user.rightNowStatus?.logistics && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {user.rightNowStatus.logistics.map((log, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 bg-white/10 text-white/60 uppercase font-bold"
                          >
                            {log}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Duration */}
                    <div className="flex items-center gap-1 text-[10px] text-white/40">
                      <Clock className="w-3 h-3" />
                      <span>
                        {user.rightNowStatus?.duration_minutes === 480
                          ? 'Tonight'
                          : `${user.rightNowStatus?.duration_minutes}min`}
                      </span>
                    </div>

                    {/* City */}
                    {user.city && (
                      <div className="flex items-center gap-1 text-[10px] text-white/40 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{user.city}</span>
                      </div>
                    )}

                    {/* Cold Vibe Badge */}
                    {isColdVibe && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-[#50C878] font-bold">
                        <Heart className="w-3 h-3" />
                        <span>CALI SOBER</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}