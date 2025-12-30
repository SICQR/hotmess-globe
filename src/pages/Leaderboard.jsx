import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Medal, Award, TrendingUp, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Leaderboard() {
  const { data: users = [] } = useQuery({
    queryKey: ['users-leaderboard'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }
  });

  const getRankIcon = (rank) => {
    if (rank === 0) return <Trophy className="w-6 h-6 text-[#FFEB3B]" />;
    if (rank === 1) return <Medal className="w-6 h-6 text-[#C0C0C0]" />;
    if (rank === 2) return <Award className="w-6 h-6 text-[#CD7F32]" />;
    return <div className="w-6 h-6 flex items-center justify-center text-white/40 font-bold">#{rank + 1}</div>;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-[#FFEB3B]" />
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                Leaderboard
              </h1>
              <p className="text-white/60">Top performers in the HOTMESS community</p>
            </div>
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        {users.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {/* 2nd Place */}
            <div className="pt-8">
              <div className="bg-gradient-to-br from-[#C0C0C0]/20 to-[#808080]/20 border border-[#C0C0C0]/40 rounded-xl p-6 text-center">
                <Medal className="w-12 h-12 text-[#C0C0C0] mx-auto mb-3" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C0C0C0] to-[#808080] mx-auto mb-3 flex items-center justify-center">
                  <span className="text-xl font-bold">{users[1]?.full_name?.[0] || 'U'}</span>
                </div>
                <p className="font-bold truncate mb-1">{users[1]?.full_name || 'User'}</p>
                <p className="text-2xl font-black text-[#C0C0C0]">{(users[1]?.xp || 0).toLocaleString()} XP</p>
              </div>
            </div>

            {/* 1st Place */}
            <div>
              <div className="bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border-2 border-[#FFEB3B]/60 rounded-xl p-6 text-center">
                <Trophy className="w-16 h-16 text-[#FFEB3B] mx-auto mb-3" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFEB3B] to-[#FF6B35] mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl font-bold text-black">{users[0]?.full_name?.[0] || 'U'}</span>
                </div>
                <p className="font-bold truncate mb-1">{users[0]?.full_name || 'User'}</p>
                <p className="text-3xl font-black text-[#FFEB3B]">{(users[0]?.xp || 0).toLocaleString()} XP</p>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="pt-8">
              <div className="bg-gradient-to-br from-[#CD7F32]/20 to-[#8B4513]/20 border border-[#CD7F32]/40 rounded-xl p-6 text-center">
                <Award className="w-12 h-12 text-[#CD7F32] mx-auto mb-3" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#CD7F32] to-[#8B4513] mx-auto mb-3 flex items-center justify-center">
                  <span className="text-xl font-bold">{users[2]?.full_name?.[0] || 'U'}</span>
                </div>
                <p className="font-bold truncate mb-1">{users[2]?.full_name || 'User'}</p>
                <p className="text-2xl font-black text-[#CD7F32]">{(users[2]?.xp || 0).toLocaleString()} XP</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rankings List */}
        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              All Time
            </TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              This Week
            </TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              This Month
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2">
            {users.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`
                  bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4
                  ${idx < 3 ? 'bg-white/10' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  {getRankIcon(idx)}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                  <span className="font-bold">{user.full_name?.[0] || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{user.full_name || 'User'}</p>
                  <p className="text-xs text-white/40">Level {Math.floor((user.xp || 0) / 1000) + 1}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[#FFEB3B] font-bold">
                    <Zap className="w-4 h-4" />
                    <span>{(user.xp || 0).toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="week">
            <div className="text-center py-20">
              <TrendingUp className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Weekly leaderboard coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="month">
            <div className="text-center py-20">
              <TrendingUp className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Monthly leaderboard coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}