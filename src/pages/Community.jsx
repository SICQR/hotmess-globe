import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, MessageCircle, Heart, Share2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIRecommendations from '../components/recommendations/AIRecommendations';

const FEED_POSTS = [
  { id: 1, user: 'Alex', content: 'Just hit level 10! 🎉', likes: 24, comments: 5, time: '2h ago' },
  { id: 2, user: 'Sam', content: 'Best event last night at Shoreditch! Who else was there?', likes: 42, comments: 12, time: '4h ago' },
  { id: 3, user: 'Jordan', content: 'New beacon spotted in Camden! 📍', likes: 18, comments: 3, time: '6h ago' },
  { id: 4, user: 'Casey', content: 'Looking for squad to hit the next drop 🔥', likes: 31, comments: 8, time: '8h ago' },
];

export default function Community() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons-community'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }, '-created_date', 20),
  });

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
            Community
          </h1>
          <p className="text-white/60">Connect with the HOTMESS crew</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/40 rounded-xl p-4 text-center"
          >
            <Users className="w-6 h-6 text-[#FF1493] mx-auto mb-2" />
            <div className="text-2xl font-black">2.4K</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Members</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-[#00D9FF]/20 to-[#39FF14]/20 border border-[#00D9FF]/40 rounded-xl p-4 text-center"
          >
            <TrendingUp className="w-6 h-6 text-[#00D9FF] mx-auto mb-2" />
            <div className="text-2xl font-black">156</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Active Now</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border border-[#FFEB3B]/40 rounded-xl p-4 text-center"
          >
            <Heart className="w-6 h-6 text-[#FFEB3B] mx-auto mb-2" />
            <div className="text-2xl font-black">892</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Posts Today</div>
          </motion.div>
        </div>

        {/* AI Recommendations in Community */}
        {user && beacons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <AIRecommendations user={user} beacons={beacons} limit={4} />
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="feed" className="mb-8">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="feed" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              Feed
            </TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              Trending
            </TabsTrigger>
            <TabsTrigger value="friends" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              Friends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {FEED_POSTS.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                    <span className="font-bold">{post.user[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{post.user}</span>
                      <span className="text-xs text-white/40">{post.time}</span>
                    </div>
                    <p className="text-white/80">{post.content}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                  <button className="flex items-center gap-2 text-sm text-white/60 hover:text-[#FF1493] transition-colors">
                    <Heart className="w-4 h-4" />
                    <span>{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-sm text-white/60 hover:text-[#00D9FF] transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 text-sm text-white/60 hover:text-[#FFEB3B] transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="trending">
            <div className="text-center py-20">
              <TrendingUp className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Trending posts coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="friends">
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Friends feature coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}