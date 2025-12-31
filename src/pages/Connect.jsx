import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Zap, Heart, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import DiscoveryCard from '../components/discovery/DiscoveryCard';
import DiscoveryFilters from '../components/discovery/DiscoveryFilters';
import RightNowModal from '../components/discovery/RightNowModal';

export default function Connect() {
  const [currentUser, setCurrentUser] = useState(null);
  const [lane, setLane] = useState('browse');
  const [showFilters, setShowFilters] = useState(false);
  const [showRightNow, setShowRightNow] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setLane(user.discovery_lane || 'browse');
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: userTags = [] } = useQuery({
    queryKey: ['user-tags'],
    queryFn: () => base44.entities.UserTag.list()
  });

  const { data: userTribes = [] } = useQuery({
    queryKey: ['user-tribes'],
    queryFn: () => base44.entities.UserTribe.list()
  });

  const { data: rightNowStatuses = [] } = useQuery({
    queryKey: ['right-now-status'],
    queryFn: () => base44.entities.RightNowStatus.filter({ active: true })
  });

  if (!currentUser) return null;

  // Filter users
  let filteredUsers = allUsers.filter(u => u.email !== currentUser.email);

  // Right Now lane - only show users with active status and not expired
  if (lane === 'right_now') {
    const now = new Date();
    const rightNowEmails = rightNowStatuses
      .filter(s => s.active && new Date(s.expires_at) > now)
      .map(s => s.user_email);
    filteredUsers = filteredUsers.filter(u => rightNowEmails.includes(u.email));
  }

  // Apply filters
  if (filters.onlineNow) {
    filteredUsers = filteredUsers.filter(u => u.activity_status === 'online' || u.activity_status === 'at_event');
  }
  if (filters.chemFree) {
    const chemFreeTagIds = ['sober', 'chem_free', 'cali_sober', 'recovery_friendly'];
    const chemFreeUsers = userTags
      .filter(t => chemFreeTagIds.includes(t.tag_id))
      .map(t => t.user_email);
    filteredUsers = filteredUsers.filter(u => chemFreeUsers.includes(u.email));
  }
  if (filters.hasFace) {
    filteredUsers = filteredUsers.filter(u => u.avatar_url);
  }
  if (filters.nearMe && currentUser.city) {
    filteredUsers = filteredUsers.filter(u => u.city === currentUser.city);
  }

  const currentUserTags = userTags.filter(t => t.user_email === currentUser.email);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Users className="w-10 h-10 text-[#FF1493]" />
              <div>
                <h1 className="text-4xl font-black uppercase">CONNECT</h1>
                <p className="text-xs text-white/40 uppercase tracking-wider">Discovery</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="border-white/20 text-white"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                onClick={() => setShowRightNow(true)}
                className="bg-[#FF1493] text-black font-black"
              >
                <Zap className="w-4 h-4 mr-2" />
                Go Right Now
              </Button>
            </div>
          </div>

          {/* Lanes */}
          <Tabs value={lane} onValueChange={setLane}>
            <TabsList className="bg-white/5 border-2 border-white/10 w-full">
              <TabsTrigger value="right_now" className="flex-1 data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Zap className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Right Now</span>
                  <span className="text-[10px] opacity-60">Available now. Auto-expires.</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="browse" className="flex-1 data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Users className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Browse</span>
                  <span className="text-[10px] opacity-60">Scroll, vibe, chat.</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="dates" className="flex-1 data-[state=active]:bg-[#B026FF] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Heart className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Dates</span>
                  <span className="text-[10px] opacity-60">Slower burn. Better outcomes.</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map((user, idx) => {
            const userTagsData = userTags.filter(t => t.user_email === user.email);
            const userTribesData = userTribes.filter(t => t.user_email === user.email);
            return (
              <DiscoveryCard
                key={user.email}
                user={user}
                userTags={userTagsData}
                userTribes={userTribesData}
                currentUserTags={currentUserTags}
                index={idx}
              />
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-20">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 mb-2">
                {lane === 'right_now' ? 'Nobody live right now.' : 'No matches found.'}
              </p>
              <p className="text-sm text-white/30">
                {lane === 'right_now' ? 'Try Browse—then go Right Now when you\'re ready.' : 'Adjust your filters or try a different lane.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RightNowModal
        isOpen={showRightNow}
        onClose={() => setShowRightNow(false)}
        currentUser={currentUser}
      />

      {showFilters && (
        <DiscoveryFilters
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}