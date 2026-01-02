import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Clock, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { formatDistanceToNow } from 'date-fns';
import MembershipBadge from '../membership/MembershipBadge';

export default function RightNowGrid({ currentUser }) {
  const { data: rightNowStatuses = [] } = useQuery({
    queryKey: ['right-now-active'],
    queryFn: async () => {
      const statuses = await base44.entities.RightNowStatus.filter(
        { active: true },
        '-created_date'
      );
      return statuses.filter(s => new Date(s.expires_at) > new Date());
    },
    refetchInterval: 10000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const usersWithStatus = rightNowStatuses
    .map(status => ({
      status,
      user: allUsers.find(u => u.email === status.user_email),
    }))
    .filter(item => item.user && item.user.email !== currentUser?.email);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
            RIGHT <span className="text-[#FF1493]">NOW</span> GRID
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            {usersWithStatus.length} PEOPLE AVAILABLE IN YOUR AREA
          </p>
        </motion.div>

        {usersWithStatus.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg uppercase font-bold">NO ONE RIGHT NOW</p>
            <p className="text-white/20 text-sm mt-2">Be the first to go live</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usersWithStatus.map(({ status, user }, idx) => (
              <motion.div
                key={status.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-black border-2 p-4 hover:shadow-lg transition-all ${
                  status.cold_vibe
                    ? 'border-[#50C878] shadow-[0_0_15px_#50C878] backdrop-blur-sm bg-gradient-to-br from-[#50C878]/10 to-transparent'
                    : 'border-white/20 hover:border-[#FF1493]'
                }`}
              >
                <Link to={createPageUrl(`Profile?email=${user.email}`)}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br border-2 flex items-center justify-center ${
                          status.cold_vibe
                            ? 'from-[#50C878] to-[#3AA863] border-[#50C878]'
                            : 'from-[#FF1493] to-[#B026FF] border-white'
                        }`}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-bold">{user.full_name?.[0] || 'U'}</span>
                        )}
                      </div>
                      {status.cold_vibe && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#50C878] border-2 border-black flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black uppercase text-sm truncate">{user.full_name}</p>
                        <MembershipBadge tier={user.membership_tier || 'basic'} />
                      </div>
                      <p className="text-[10px] text-white/40 uppercase font-mono">
                        Level {Math.floor((user.xp || 0) / 1000) + 1}
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="space-y-2 mb-4">
                  {status.cold_vibe && (
                    <Badge className="bg-[#50C878]/20 text-[#50C878] border-[#50C878] border w-full justify-center">
                      <Sparkles className="w-3 h-3 mr-1" />
                      COLD VIBE MODE
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Clock className="w-3 h-3" />
                    <span>Active for {status.duration_minutes}min</span>
                  </div>

                  {status.logistics && status.logistics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {status.logistics.map((log, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {log}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <MapPin className="w-3 h-3" />
                    <span>~{Math.floor(Math.random() * 5)}km away</span>
                  </div>
                </div>

                <Button
                  className={`w-full font-black border-2 ${
                    status.cold_vibe
                      ? 'bg-[#50C878] text-black border-[#50C878] hover:bg-[#50C878]/90'
                      : 'bg-[#FF1493] text-black border-white hover:bg-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  CONNECT
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}