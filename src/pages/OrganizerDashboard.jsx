import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Eye, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';

export default function OrganizerDashboard() {
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

  const { data: myBeacons = [] } = useQuery({
    queryKey: ['my-beacons', user?.email],
    queryFn: () => base44.entities.Beacon.filter({ created_by: user.email }),
    enabled: !!user
  });

  const { data: allInteractions = [] } = useQuery({
    queryKey: ['beacon-interactions'],
    queryFn: () => base44.entities.UserInteraction.list()
  });

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['all-check-ins'],
    queryFn: () => base44.entities.BeaconCheckIn.list()
  });

  const myBeaconIds = myBeacons.map(b => b.id);
  const myInteractions = allInteractions.filter(i => myBeaconIds.includes(i.beacon_id));
  const myCheckIns = allCheckIns.filter(c => myBeaconIds.includes(c.beacon_id));

  const beaconStats = myBeacons.map(beacon => ({
    name: beacon.title,
    scans: myInteractions.filter(i => i.beacon_id === beacon.id && i.interaction_type === 'scan').length,
    visits: myCheckIns.filter(c => c.beacon_id === beacon.id).length,
    likes: myInteractions.filter(i => i.beacon_id === beacon.id && i.interaction_type === 'like').length
  }));

  const totalScans = myInteractions.filter(i => i.interaction_type === 'scan').length;
  const totalCheckIns = myCheckIns.length;
  const totalXpGiven = myBeacons.reduce((sum, b) => sum + (b.xp_scan || 0), 0) * totalScans;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
              Organizer Dashboard
            </h1>
            <p className="text-white/60">Track your event performance</p>
          </div>
          <Link to={createPageUrl('CreateBeacon')}>
            <Button className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#C8962C]/20 to-[#B026FF]/20 border border-[#C8962C]/40 rounded-xl p-6"
          >
            <TrendingUp className="w-8 h-8 text-[#C8962C] mb-2" />
            <div className="text-3xl font-black mb-1">{myBeacons.length}</div>
            <div className="text-sm text-white/60">Active Events</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#00D9FF]/20 to-[#39FF14]/20 border border-[#00D9FF]/40 rounded-xl p-6"
          >
            <Eye className="w-8 h-8 text-[#00D9FF] mb-2" />
            <div className="text-3xl font-black mb-1">{totalScans}</div>
            <div className="text-sm text-white/60">Total Scans</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border border-[#FFEB3B]/40 rounded-xl p-6"
          >
            <Users className="w-8 h-8 text-[#FFEB3B] mb-2" />
            <div className="text-3xl font-black mb-1">{totalCheckIns}</div>
            <div className="text-sm text-white/60">Check-ins</div>
          </motion.div>

        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-black uppercase tracking-tight mb-6">Event Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={beaconStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="scans" fill="#C8962C" />
              <Bar dataKey="visits" fill="#00D9FF" />
              <Bar dataKey="likes" fill="#FFEB3B" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* My Events List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">My Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBeacons.map((beacon, idx) => {
              const beaconInteractions = myInteractions.filter(i => i.beacon_id === beacon.id).length;
              const beaconCheckIns = myCheckIns.filter(c => c.beacon_id === beacon.id).length;
              const statusColor = beacon.status === 'draft' ? 'bg-white/20' : beacon.status === 'archived' ? 'bg-red-500/20' : 'bg-[#39FF14]/20';
              
              return (
                <motion.div
                  key={beacon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold flex-1">{beacon.title}</h3>
                    <span className={`text-[8px] uppercase tracking-wider px-2 py-1 rounded ${statusColor}`}>
                      {beacon.status || 'published'}
                    </span>
                  </div>
                  
                  {beacon.image_url && (
                    <img src={beacon.image_url} alt={beacon.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">{beacon.city}</span>
                      <span className="text-[#FFEB3B] font-bold">{beaconInteractions} scans</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Check-ins</span>
                      <span className="text-[#00D9FF] font-bold">{beaconCheckIns}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={createPageUrl(`BeaconDetail?id=${beacon.id}`)} className="flex-1">
                      <Button variant="outline" className="w-full border-white/20 text-white rounded-none text-xs">
                        VIEW
                      </Button>
                    </Link>
                    <Link to={createPageUrl(`EditBeacon?id=${beacon.id}`)} className="flex-1">
                      <Button className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black rounded-none text-xs font-bold">
                        EDIT
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}