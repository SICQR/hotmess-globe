import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Zap, Calendar, Users, Filter, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import TacticalProfileCard from '../social/TacticalProfileCard';
import { format } from 'date-fns';

export default function RightNowOverlay({ isOpen, onClose, users, onUserClick }) {
  const [activeTab, setActiveTab] = useState('people');
  const [cityFilter, setCityFilter] = useState('all');

  // Fetch real-time activity data
  const { data: recentCheckIns = [] } = useQuery({
    queryKey: ['recent-checkins'],
    queryFn: () => base44.entities.BeaconCheckIn.list('-created_date', 20),
    enabled: isOpen,
    refetchInterval: 5000
  });

  const { data: liveEvents = [] } = useQuery({
    queryKey: ['live-events'],
    queryFn: async () => {
      const now = new Date();
      const events = await base44.entities.Beacon.filter({ 
        kind: 'event', 
        active: true 
      }, '-event_date', 50);
      return events.filter(e => {
        if (!e.event_date) return false;
        const eventDate = new Date(e.event_date);
        const diffHours = (eventDate - now) / (1000 * 60 * 60);
        return diffHours >= -2 && diffHours <= 6; // Events happening now or in next 6 hours
      }).slice(0, 10);
    },
    enabled: isOpen
  });

  const { data: recentPosts = [] } = useQuery({
    queryKey: ['recent-posts'],
    queryFn: () => base44.entities.CommunityPost.filter({ 
      moderation_status: 'approved' 
    }, '-created_date', 15),
    enabled: isOpen,
    refetchInterval: 10000
  });

  const cities = [...new Set(users.map(u => u.city).filter(Boolean))];
  const filteredUsers = cityFilter === 'all' 
    ? users 
    : users.filter(u => u.city === cityFilter);

  const hotScoreByEmail = useMemo(() => {
    const nowMs = Date.now();
    const checkinsByEmail = new Map();
    const postsByEmail = new Map();

    for (const checkIn of Array.isArray(recentCheckIns) ? recentCheckIns : []) {
      const email = String(checkIn?.user_email || '').trim().toLowerCase();
      if (!email) continue;

      const createdMs = Date.parse(checkIn?.created_date || checkIn?.created_at || '');
      if (!Number.isFinite(createdMs)) continue;
      if (nowMs - createdMs > 2 * 60 * 60 * 1000) continue; // 2h window

      checkinsByEmail.set(email, (checkinsByEmail.get(email) || 0) + 1);
    }

    for (const post of Array.isArray(recentPosts) ? recentPosts : []) {
      const email = String(post?.user_email || '').trim().toLowerCase();
      if (!email) continue;

      const createdMs = Date.parse(post?.created_date || post?.created_at || '');
      if (!Number.isFinite(createdMs)) continue;
      if (nowMs - createdMs > 6 * 60 * 60 * 1000) continue; // 6h window

      postsByEmail.set(email, (postsByEmail.get(email) || 0) + 1);
    }

    const out = new Map();
    const emails = new Set([...checkinsByEmail.keys(), ...postsByEmail.keys()]);
    for (const email of emails) {
      const checkins = checkinsByEmail.get(email) || 0;
      const posts = postsByEmail.get(email) || 0;

      // Deterministic score derived from real activity.
      const score = Math.min(checkins * 18 + posts * 12, 100);
      out.set(email, score);
    }

    return out;
  }, [recentCheckIns, recentPosts]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="border-b-2 border-[#E62020] bg-black/80 backdrop-blur-xl">
            <div className="p-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase text-white tracking-tight">RIGHT NOW</h2>
                <p className="text-xs text-white/40 uppercase tracking-wider font-mono">
                  LIVE PULSE • {users.length} ACTIVE
                </p>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => setActiveTab('people')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 ${
                  activeTab === 'people'
                    ? 'bg-[#E62020] text-black border-[#E62020]'
                    : 'bg-transparent text-white/60 border-white/20 hover:border-white/40'
                }`}
              >
                <Users className="w-3 h-3 inline mr-1" />
                People ({filteredUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 ${
                  activeTab === 'events'
                    ? 'bg-[#E62020] text-black border-[#E62020]'
                    : 'bg-transparent text-white/60 border-white/20 hover:border-white/40'
                }`}
              >
                <Calendar className="w-3 h-3 inline mr-1" />
                Events ({liveEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-2 ${
                  activeTab === 'activity'
                    ? 'bg-[#E62020] text-black border-[#E62020]'
                    : 'bg-transparent text-white/60 border-white/20 hover:border-white/40'
                }`}
              >
                <Activity className="w-3 h-3 inline mr-1" />
                Activity ({recentCheckIns.length + recentPosts.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(100vh-160px)] p-6">
            {activeTab === 'people' && (
              <div>
                {/* City Filter */}
                {cities.length > 1 && (
                  <div className="mb-6 flex items-center gap-2 flex-wrap">
                    <Filter className="w-4 h-4 text-white/40" />
                    <button
                      onClick={() => setCityFilter('all')}
                      className={`px-3 py-1 text-xs font-mono uppercase border ${
                        cityFilter === 'all'
                          ? 'bg-[#00D9FF] text-black border-[#00D9FF]'
                          : 'bg-black text-white/60 border-white/20 hover:border-white/40'
                      }`}
                    >
                      ALL
                    </button>
                    {cities.map(city => (
                      <button
                        key={city}
                        onClick={() => setCityFilter(city)}
                        className={`px-3 py-1 text-xs font-mono uppercase border ${
                          cityFilter === city
                            ? 'bg-[#00D9FF] text-black border-[#00D9FF]'
                            : 'bg-black text-white/60 border-white/20 hover:border-white/40'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}

                {filteredUsers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                    {filteredUsers.map((user, idx) => (
                      <TacticalProfileCard 
                        key={user.email}
                        user={user}
                        delay={idx * 0.03}
                        hotScore={hotScoreByEmail.get(String(user.email || '').trim().toLowerCase()) || 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-center">
                    <div>
                      <div className="text-6xl mb-4 opacity-20">👻</div>
                      <p className="text-white/40 text-sm uppercase tracking-wider">No Active Users</p>
                      <p className="text-white/20 text-xs mt-2">Check back later</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="max-w-4xl mx-auto space-y-4">
                {liveEvents.length > 0 ? (
                  liveEvents.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
                        <div className="bg-black border-2 border-white hover:border-[#E62020] transition-all p-4 group">
                          <div className="flex gap-4">
                            {event.image_url && (
                              <div className="w-24 h-24 flex-shrink-0 border-2 border-white/20">
                                <img 
                                  src={event.image_url} 
                                  alt={event.title}
                                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-black uppercase text-white group-hover:text-[#E62020] transition-colors">
                                  {event.title}
                                </h3>
                                <span className="px-2 py-1 bg-[#E62020] text-black text-[10px] font-black uppercase whitespace-nowrap">
                                  LIVE
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-white/60 mb-2">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span className="uppercase font-mono">{event.city}</span>
                                </div>
                                {event.event_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span className="uppercase font-mono">
                                      {format(new Date(event.event_date), 'HH:mm')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-xs text-white/40 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-64 text-center">
                    <div>
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/40 text-sm uppercase tracking-wider">No Live Events</p>
                      <p className="text-white/20 text-xs mt-2">Check the Events page</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Recent Check-ins */}
                {recentCheckIns.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3">RECENT CHECK-INS</h3>
                    <div className="space-y-2">
                      {recentCheckIns.slice(0, 8).map((checkIn, idx) => (
                        <motion.div
                          key={checkIn.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="bg-black border-l-4 border-[#00D9FF] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <Link to={createPageUrl(`Profile?email=${checkIn.user_email}`)}>
                                <p className="font-bold text-sm hover:text-[#00D9FF] transition-colors">
                                  {checkIn.user_name}
                                </p>
                              </Link>
                              <Link to={createPageUrl(`BeaconDetail?id=${checkIn.beacon_id}`)}>
                                <p className="text-xs text-white/60 hover:text-white transition-colors">
                                  @ {checkIn.beacon_title}
                                </p>
                              </Link>
                              {checkIn.note && (
                                <p className="text-xs text-white/40 mt-1 italic">{checkIn.note}</p>
                              )}
                            </div>
                            <div className="text-[10px] text-white/30 font-mono whitespace-nowrap ml-2">
                              {format(new Date(checkIn.created_date), 'HH:mm')}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Posts */}
                {recentPosts.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3">COMMUNITY PULSE</h3>
                    <div className="space-y-2">
                      {recentPosts.slice(0, 6).map((post, idx) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="bg-black border-l-4 border-[#B026FF] p-3"
                        >
                          <Link to={createPageUrl(`Profile?email=${post.user_email}`)}>
                            <p className="font-bold text-sm mb-1 hover:text-[#B026FF] transition-colors">
                              {post.user_name}
                            </p>
                          </Link>
                          <p className="text-xs text-white/80 line-clamp-2 mb-2">{post.content}</p>
                          <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
                            <span>{format(new Date(post.created_date), 'HH:mm')}</span>
                            <span>❤️ {post.likes_count || 0}</span>
                            <span>💬 {post.comments_count || 0}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {recentCheckIns.length === 0 && recentPosts.length === 0 && (
                  <div className="flex items-center justify-center h-64 text-center">
                    <div>
                      <Zap className="w-12 h-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/40 text-sm uppercase tracking-wider">No Recent Activity</p>
                      <p className="text-white/20 text-xs mt-2">Be the first!</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}