import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Crown, Medal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Leaderboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => base44.entities.City.list(),
  });

  const { data: allSquads = [] } = useQuery({
    queryKey: ['all-squads'],
    queryFn: () => base44.entities.Squad.list(),
  });

  const { data: squadMembers = [] } = useQuery({
    queryKey: ['squad-members-all'],
    queryFn: () => base44.entities.SquadMember.list(),
  });

  const { data: venueKings = [] } = useQuery({
    queryKey: ['venue-kings'],
    queryFn: () => base44.entities.VenueKing.list(),
  });

  // Filter users by city — rank by scan_count (or fallback to created_date recency)
  let filteredUsers = allUsers.filter(u => u.scan_count > 0 || u.membership_tier);

  if (selectedCity !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.city === selectedCity);
  }

  const rankedUsers = filteredUsers
    .sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0))
    .slice(0, 100);

  // Squad rankings by member count
  const squadData = new Map();
  allSquads.forEach(squad => {
    const members = squadMembers.filter(sm => sm.squad_id === squad.id);
    const totalScans = members.reduce((sum, sm) => {
      const user = allUsers.find(u => u.email === sm.user_email);
      return sum + (user?.scan_count || 0);
    }, 0);
    squadData.set(squad.id, { squad, totalScans, memberCount: members.length });
  });

  const rankedSquads = Array.from(squadData.values())
    .sort((a, b) => b.totalScans - a.totalScans)
    .slice(0, 20);

  // Active venue kings
  const activeKings = venueKings.filter(k => new Date(k.expires_at) > new Date());

  const userRank = rankedUsers.findIndex(u => u.email === currentUser?.email);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
            <span className="text-[#C8962C]">LEADERBOARD</span>
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            Top performers. Global competition.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-48 bg-white/5 border-white/20">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="global" className="mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="squads">Squad Rankings</TabsTrigger>
            <TabsTrigger value="kings">Venue Kings</TabsTrigger>
          </TabsList>

          <TabsContent value="global">
            {/* Top 3 Podium */}
            {rankedUsers.slice(0, 3).length === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="pt-12">
              <Link to={createPageUrl(`Profile?email=${rankedUsers[1].email}`)}>
                <div className="bg-gradient-to-br from-gray-300/20 to-gray-500/20 border-2 border-gray-300 p-6 text-center hover:border-white transition-colors cursor-pointer">
                  <Medal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-6xl font-black mb-2">2</div>
                  <p className="font-bold text-sm uppercase truncate mb-2">{rankedUsers[1].full_name}</p>
                  <p className="text-xl font-black text-[#C8962C]">{(rankedUsers[1].scan_count || 0).toLocaleString()} scans</p>
                </div>
              </Link>
            </div>

            <div>
              <Link to={createPageUrl(`Profile?email=${rankedUsers[0].email}`)}>
                <div className="bg-gradient-to-br from-[#C8962C]/30 to-[#FF6B35]/30 border-4 border-[#C8962C] p-8 text-center hover:border-white transition-colors cursor-pointer">
                  <Crown className="w-20 h-20 text-[#C8962C] mx-auto mb-3" />
                  <div className="text-7xl font-black mb-2">1</div>
                  <p className="font-bold uppercase truncate mb-2">{rankedUsers[0].full_name}</p>
                  <p className="text-3xl font-black text-[#C8962C]">{(rankedUsers[0].scan_count || 0).toLocaleString()} scans</p>
                </div>
              </Link>
            </div>

            <div className="pt-12">
              <Link to={createPageUrl(`Profile?email=${rankedUsers[2].email}`)}>
                <div className="bg-gradient-to-br from-[#CD7F32]/20 to-[#8B4513]/20 border-2 border-[#CD7F32] p-6 text-center hover:border-white transition-colors cursor-pointer">
                  <Trophy className="w-12 h-12 text-[#CD7F32] mx-auto mb-3" />
                  <div className="text-6xl font-black mb-2">3</div>
                  <p className="font-bold text-sm uppercase truncate mb-2">{rankedUsers[2].full_name}</p>
                  <p className="text-xl font-black text-[#C8962C]">{(rankedUsers[2].scan_count || 0).toLocaleString()} scans</p>
                </div>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Your Rank */}
        {currentUser && userRank !== -1 && userRank >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#C8962C]/20 border-2 border-[#C8962C] p-4 mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C8962C] flex items-center justify-center font-black text-lg">
                #{userRank + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold uppercase">YOUR RANK</p>
                <p className="text-xs text-white/60">{currentUser.full_name}</p>
              </div>
              <div className="text-right">
                <div className="text-[#C8962C] font-black text-xl">
                  {(currentUser.scan_count || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/40">SCANS</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Full Rankings */}
        <div className="space-y-2">
          {rankedUsers.map((user, idx) => {
            const isCurrentUser = user.email === currentUser?.email;
            return (
              <motion.div
                key={user.email}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex items-center gap-4 p-4 border ${
                  isCurrentUser 
                    ? 'bg-[#C8962C]/20 border-[#C8962C]' 
                    : idx < 3 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-white/5 border-white/10'
                } hover:border-white/40 transition-colors`}
              >
                <div className={`w-12 h-12 flex items-center justify-center font-black text-lg ${
                  idx === 0 ? 'bg-[#C8962C] text-black' :
                  idx === 1 ? 'bg-gray-300 text-black' :
                  idx === 2 ? 'bg-[#CD7F32] text-black' :
                  'bg-white/10 text-white/60'
                }`}>
                  {idx + 1}
                </div>
                <Link to={createPageUrl(`Profile?email=${user.email}`)} className="flex-1 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#C8962C] to-[#B026FF] border border-white flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{user.full_name?.[0]}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase">{user.full_name}</p>
                    <p className="text-xs text-white/40">
                      {user.membership_tier || 'free'} • {user.city || 'Unknown'}
                    </p>
                  </div>
                </Link>
                <div className="text-right">
                  <div className="text-[#C8962C] font-black text-lg">
                    {(user.scan_count || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-white/40">SCANS</div>
                </div>
              </motion.div>
            );
          })}
        </div>
          </TabsContent>

          <TabsContent value="squads">
            <div className="space-y-3">
              {rankedSquads.map((data, idx) => (
                <motion.div
                  key={data.squad.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white/5 border border-white/10 p-4 hover:border-[#B026FF] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 flex items-center justify-center font-black text-lg ${
                      idx === 0 ? 'bg-[#C8962C] text-black' :
                      idx === 1 ? 'bg-gray-300 text-black' :
                      idx === 2 ? 'bg-[#CD7F32] text-black' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <Link to={createPageUrl(`SquadChat?id=${data.squad.id}`)}>
                        <h3 className="font-black uppercase hover:text-[#B026FF] transition-colors">{data.squad.name}</h3>
                      </Link>
                      <p className="text-xs text-white/60">
                        {data.memberCount} members • {data.squad.interest}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[#C8962C] font-black text-xl">
                        {data.totalScans.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/40">SQUAD SCANS</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="kings">
            <div className="space-y-3">
              {activeKings.length === 0 ? (
                <div className="text-center py-12 border-2 border-white/10">
                  <Crown className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">No active venue kings</p>
                </div>
              ) : (
                activeKings.map((king, idx) => (
                  <motion.div
                    key={king.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border-2 p-6 ${
                      king.war_active
                        ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500'
                        : 'bg-gradient-to-br from-[#C8962C]/10 to-[#FF6B35]/10 border-[#C8962C]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-16 h-16 flex items-center justify-center border-2 ${
                          king.war_active ? 'bg-red-500 border-red-600' : 'bg-[#C8962C] border-[#C8962C]'
                        }`}>
                          <Crown className="w-8 h-8 text-black" />
                        </div>
                        <div>
                          <h3 className="font-black uppercase text-lg">{king.venue_name}</h3>
                          <Link to={createPageUrl(`Profile?email=${king.king_email}`)}>
                            <p className="text-sm text-[#00D9FF] hover:underline">{king.king_name}</p>
                          </Link>
                        </div>
                      </div>
                      {king.war_active && (
                        <div className="bg-red-500 text-black px-3 py-1 font-black text-xs uppercase animate-pulse">
                          WAR MODE
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-white/40 text-xs uppercase mb-1">Scans</div>
                        <div className="font-bold">{king.scan_count}</div>
                      </div>
                      <div>
                        <div className="text-white/40 text-xs uppercase mb-1">Tax Collected</div>
                        <div className="font-bold text-[#C8962C]">{king.total_tax_collected || 0}</div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}