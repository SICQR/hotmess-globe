import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LiveGlobe3D from '../components/globe/LiveGlobe3D';
import OSHud from '../components/home/OSHud';
import RadioPlayer from '../components/home/RadioPlayer';
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
        <LiveGlobe3D
          beacons={recentBeacons}
          onBeaconClick={handleBeaconClick}
          layers={{ pins: true, heat: true, trails: false, cities: true }}
        />
      </div>

      {/* Overlay Content */}
      <div className="relative z-10 pt-24 pb-32 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/60 backdrop-blur-xl border-2 border-[#FF1493] rounded-none p-8 mb-6 max-w-2xl pointer-events-auto"
          >
            <div className="text-sm text-[#FF1493] font-mono uppercase tracking-wider mb-2">
              NIGHT PULSE CONTROL
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tight mb-4">
              LONDON<br />
              <span className="text-[#FF1493]">AFTER DARK</span>
            </h1>
            <p className="text-white/80 mb-6 leading-relaxed">
              Real-time nightlife intelligence. Track events, connect with your tribe, 
              and navigate the city's underground pulse. Industrial brutalism meets 
              nocturnal connectivity.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={createPageUrl('Beacons')}>
                <Button className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase tracking-wider rounded-none">
                  <MapPin className="w-4 h-4 mr-2" />
                  EXPLORE BEACONS
                </Button>
              </Link>
              <Button 
                onClick={() => setShowRightNow(true)}
                variant="outline"
                className="border-2 border-white/20 text-white hover:bg-white/10 font-black uppercase tracking-wider rounded-none"
              >
                VIEW RIGHT NOW →
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          {currentUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl pointer-events-auto"
            >
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-none p-4">
                <div className="text-xs text-white/40 uppercase tracking-wider font-mono mb-1">ACTIVE</div>
                <div className="text-2xl font-black text-[#FF1493]">{activeUsers.length}</div>
              </div>
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-none p-4">
                <div className="text-xs text-white/40 uppercase tracking-wider font-mono mb-1">LIVE BEACONS</div>
                <div className="text-2xl font-black text-[#FF1493]">{recentBeacons.length}</div>
              </div>
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-none p-4 col-span-2 md:col-span-1">
                <div className="text-xs text-white/40 uppercase tracking-wider font-mono mb-1">YOUR XP</div>
                <div className="text-2xl font-black text-[#FFEB3B]">{currentUser.xp || 0}</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Radio Player */}
      <RadioPlayer />

      {/* Right Now Overlay */}
      <RightNowOverlay
        isOpen={showRightNow}
        onClose={() => setShowRightNow(false)}
        users={activeUsers}
      />
    </div>
  );
}