import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnhancedGlobe3D from '../components/globe/EnhancedGlobe3D';
import OSHud from '../components/home/OSHud';
import RadioTerminal from '../components/home/RadioTerminal';
import RightNowOverlay from '../components/home/RightNowOverlay';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showRightNow, setShowRightNow] = useState(false);

  const { data: recentBeacons = [] } = useQuery({
    queryKey: ['recent-beacons'],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter({ active: true }, '-created_date', 20);
      return beacons;
    }
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Simulate "active now" users - in production, this would check last_active timestamp
  const activeUsers = allUsers
    .filter(u => u.xp && u.xp > 0)
    .slice(0, 12);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleBeaconClick = (beacon) => {
    window.location.href = createPageUrl(`BeaconDetail?id=${beacon.id}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* OS HUD */}
      <OSHud user={currentUser} onModuleChange={(id) => {
        if (id === 'now') setShowRightNow(true);
      }} />

      {/* Main Content - Globe Background */}
      <div className="fixed inset-0 pt-16 pb-20">
        <EnhancedGlobe3D
          beacons={recentBeacons}
          cities={[]}
          activeLayers={['pins', 'heat', 'cities']}
          userActivities={[]}
          userIntents={[]}
          onBeaconClick={handleBeaconClick}
          highlightedIds={[]}
        />
      </div>

      {/* Overlay Content - Editorial Layout */}
      <div className="relative z-10 pt-24 pb-32 px-8 pointer-events-none">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* MAIN EDITORIAL COLUMN */}
          <div className="md:col-span-8 space-y-20 pointer-events-auto">
            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-[12vw] md:text-[8vw] font-black italic leading-[0.8] tracking-tighter uppercase text-white mb-6">
                The Night <br /> 
                <span className="text-transparent" style={{ WebkitTextStroke: '2px #FF1493' }}>
                  Is Ours.
                </span>
              </h2>
            </motion.header>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 border-l-4 border-white pl-8 bg-black/60 backdrop-blur-xl p-8"
            >
              <div className="space-y-4">
                <p className="text-2xl font-bold italic uppercase tracking-tighter text-[#FF1493]">01. Discovery</p>
                <p className="text-sm text-white/60 leading-relaxed uppercase">
                  Access the pulse of every venue in London. Real-time heatmaps, verified check-ins, and secure intelligence.
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-2xl font-bold italic uppercase tracking-tighter text-[#FF1493]">02. Status</p>
                <p className="text-sm text-white/60 leading-relaxed uppercase">
                  Earn Sweat (XP) through presence. Level up to unlock the most exclusive drops and private rooms.
                </p>
              </div>
            </motion.section>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-4"
            >
              <Link to={createPageUrl('Beacons')}>
                <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase tracking-wider rounded-none px-8 py-6 text-lg italic shadow-[0_0_30px_rgba(255,20,147,0.5)]">
                  <MapPin className="w-5 h-5 mr-2" />
                  EXPLORE BEACONS
                </Button>
              </Link>
              <Button 
                onClick={() => setShowRightNow(true)}
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white hover:text-black font-black uppercase tracking-wider rounded-none px-8 py-6 text-lg italic transition-all"
              >
                VIEW RIGHT NOW →
              </Button>
            </motion.div>
          </div>

          {/* SIDEBAR INTELLIGENCE */}
          {currentUser && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-4 space-y-8 bg-white/5 backdrop-blur-xl border border-white/10 p-6 self-start pointer-events-auto"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FF1493]">Global Intel</p>
              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40 uppercase">Active Users</span>
                  <span className="text-white font-bold">{activeUsers.length}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40 uppercase">Live Beacons</span>
                  <span className="text-white font-bold">{recentBeacons.length}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40 uppercase">Your Level</span>
                  <span className="text-white font-bold">{Math.floor((currentUser.xp || 0) / 1000) + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 uppercase">Your XP</span>
                  <span className="text-[#FFEB3B] font-bold">{currentUser.xp || 0}</span>
                </div>
              </div>
              <Button 
                onClick={() => window.location.href = createPageUrl('Globe')}
                className="w-full bg-white text-black py-4 font-black uppercase text-xs tracking-widest hover:bg-[#00D9FF] hover:text-black transition-all"
              >
                View Live Globe
              </Button>
            </motion.div>
          )}

        </div>
      </div>

      {/* Radio Terminal */}
      <RadioTerminal />

      {/* Right Now Overlay */}
      <RightNowOverlay
        isOpen={showRightNow}
        onClose={() => setShowRightNow(false)}
        users={activeUsers}
      />
    </div>
  );
}