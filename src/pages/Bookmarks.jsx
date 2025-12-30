import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bookmark, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Bookmarks() {
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

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['bookmarks', user?.email],
    queryFn: () => base44.entities.BeaconBookmark.filter({ user_email: user.email }),
    enabled: !!user
  });

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.list()
  });

  const bookmarkedBeacons = beacons.filter(b => bookmarks.some(bm => bm.beacon_id === b.id));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-8 h-8 text-[#FFEB3B]" />
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Bookmarks</h1>
            <p className="text-white/60">{bookmarkedBeacons.length} saved events</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarkedBeacons.map((beacon, idx) => (
            <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
              >
                <h3 className="font-bold mb-2">{beacon.title}</h3>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <MapPin className="w-4 h-4" />
                  <span>{beacon.city}</span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {bookmarkedBeacons.length === 0 && (
          <div className="text-center py-20">
            <Bookmark className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No bookmarks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}