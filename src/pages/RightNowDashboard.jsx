import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Zap, TrendingUp, Users, Clock } from 'lucide-react';
import RightNowManager from '../components/discovery/RightNowManager';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function RightNowDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Zap className="w-12 h-12 text-white/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={() => navigate(createPageUrl('Connect'))}
            variant="ghost"
            className="mb-6 text-white/60 hover:text-white"
          >
            ← Back to Connect
          </Button>

          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-black uppercase mb-2">
              RIGHT <span className="text-[#FF1493]">NOW</span>
            </h1>
            <p className="text-white/60 text-sm uppercase tracking-wider">
              Real-time availability • Auto-expires • No ghost status
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 border-2 border-white/10 p-6">
              <Zap className="w-8 h-8 text-[#FF1493] mb-3" />
              <h3 className="text-xs uppercase tracking-widest text-white/40 mb-2">Quick Connect</h3>
              <p className="text-xs text-white/60">
                Show you're available right now for immediate connections
              </p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-6">
              <Clock className="w-8 h-8 text-[#00D9FF] mb-3" />
              <h3 className="text-xs uppercase tracking-widest text-white/40 mb-2">Auto-Expires</h3>
              <p className="text-xs text-white/60">
                Set 30min–Tonight, automatically ends when time's up
              </p>
            </div>

            <div className="bg-white/5 border-2 border-white/10 p-6">
              <Users className="w-8 h-8 text-[#39FF14] mb-3" />
              <h3 className="text-xs uppercase tracking-widest text-white/40 mb-2">High Visibility</h3>
              <p className="text-xs text-white/60">
                Appear at the top of Connect discovery feed
              </p>
            </div>
          </div>

          {/* Manager */}
          <RightNowManager currentUser={currentUser} />

          {/* Tips */}
          <div className="mt-8 bg-[#FF1493]/10 border-2 border-[#FF1493]/40 p-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-[#FF1493] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-black uppercase mb-2">Pro Tips</h3>
                <ul className="text-xs text-white/60 space-y-2">
                  <li>• Set clear logistics (host/travel/hotel) to increase matches</li>
                  <li>• Use "Tonight" for longer availability windows</li>
                  <li>• Check messages—Right Now profiles get priority visibility</li>
                  <li>• You can end your status early anytime</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}