import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Zap, MapPin, TrendingUp, Users, ArrowRight, Globe, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AIRecommendations from '../components/recommendations/AIRecommendations';

export default function Home() {
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

  const { data: recentBeacons = [] } = useQuery({
    queryKey: ['recent-beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }, '-created_date', 6),
  });

  const xp = user?.xp || 0;
  const level = Math.floor(xp / 1000) + 1;
  const xpToNextLevel = (level * 1000) - xp;
  const xpProgress = ((xp % 1000) / 1000) * 100;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2">
            Welcome to <span className="text-[#FF1493]">HOTMESS</span>
          </h1>
          <p className="text-white/60 text-lg">The nightlife OS for queer cities</p>
        </motion.div>

        {/* XP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/40 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-[#FF1493]" />
                <span className="text-sm text-white/60 uppercase tracking-wider">Your XP</span>
              </div>
              <div className="text-3xl font-black">{xp.toLocaleString()} XP</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60 uppercase tracking-wider mb-1">Level</div>
              <div className="text-3xl font-black text-[#FF1493]">{level}</div>
            </div>
          </div>
          <div className="mb-2">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF1493] to-[#B026FF]"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-white/40">
            {xpToNextLevel} XP to level {level + 1}
          </p>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to={createPageUrl('Globe')}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer"
            >
              <Globe className="w-8 h-8 text-[#FF1493] mb-3" />
              <div className="text-sm font-semibold uppercase tracking-wider">Explore Globe</div>
            </motion.div>
          </Link>

          <Link to={createPageUrl('Scan')}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer"
            >
              <Zap className="w-8 h-8 text-[#FFEB3B] mb-3" />
              <div className="text-sm font-semibold uppercase tracking-wider">Scan Beacon</div>
            </motion.div>
          </Link>

          <Link to={createPageUrl('Beacons')}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer"
            >
              <MapPin className="w-8 h-8 text-[#00D9FF] mb-3" />
              <div className="text-sm font-semibold uppercase tracking-wider">Browse Events</div>
            </motion.div>
          </Link>

          <Link to={createPageUrl('Marketplace')}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer"
            >
              <TrendingUp className="w-8 h-8 text-[#39FF14] mb-3" />
              <div className="text-sm font-semibold uppercase tracking-wider">Marketplace</div>
            </motion.div>
          </Link>
        </div>

        {/* AI Recommendations */}
        {user && recentBeacons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <AIRecommendations user={user} beacons={recentBeacons} limit={3} />
          </motion.div>
        )}

        {/* Recent Beacons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#FF1493]" />
              <h2 className="text-2xl font-black uppercase tracking-tight">Live Now</h2>
            </div>
            <Link to={createPageUrl('Beacons')}>
              <Button variant="ghost" className="text-white/60 hover:text-white">
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentBeacons.map((beacon, idx) => (
              <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: beacon.kind === 'hookup' ? '#FF073A' : '#FF1493',
                        color: '#000'
                      }}
                    >
                      {beacon.kind}
                    </span>
                    {beacon.xp_scan && (
                      <span className="text-xs text-[#FFEB3B] font-bold">+{beacon.xp_scan} XP</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{beacon.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span>{beacon.city}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}