import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, UserPlus, Shield, Zap, Radio } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Network() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: allFriendships = [] } = useQuery({
    queryKey: ['friendships'],
    queryFn: () => base44.entities.UserFriendship.list()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  const { data: squadMembers = [] } = useQuery({
    queryKey: ['squad-members'],
    queryFn: () => base44.entities.SquadMember.list()
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['network-activities'],
    queryFn: () => base44.entities.UserActivity.list('-created_date', 50)
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, requester_email }) => 
      Promise.all([
        base44.entities.UserFriendship.update(id, { status: 'accepted', accepted_date: new Date().toISOString() }),
        base44.auth.me().then(me => 
          base44.entities.UserInteraction.create({
            user_email: me.email,
            interaction_type: 'like',
            beacon_id: requester_email
          })
        )
      ]),
    onSuccess: () => {
      queryClient.invalidateQueries(['friendships']);
      toast.success('Convict accepted!');
    }
  });

  const sendRequestMutation = useMutation({
    mutationFn: (receiver_email) => base44.entities.UserFriendship.create({
      requester_email: user.email,
      receiver_email,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['friendships']);
      toast.success('Handshake sent!');
    }
  });

  if (!user) return null;

  const myFriendships = allFriendships.filter(f => 
    f.requester_email === user.email || f.receiver_email === user.email
  );

  const convicts = myFriendships
    .filter(f => f.status === 'accepted')
    .map(f => {
      const friendEmail = f.requester_email === user.email ? f.receiver_email : f.requester_email;
      return allUsers.find(u => u.email === friendEmail);
    })
    .filter(Boolean);

  const pendingRequests = myFriendships.filter(f => 
    f.receiver_email === user.email && f.status === 'pending'
  );

  const mySquads = squads.filter(s => 
    squadMembers.some(sm => sm.user_email === user.email && sm.squad_id === s.id)
  );

  const convictEmails = convicts.map(c => c.email);
  const convictActivities = recentActivities.filter(a => convictEmails.includes(a.user_email));

  const SQUAD_COLORS = {
    techno: '#FF1493',
    house: '#B026FF',
    drag: '#FFEB3B',
    late_night: '#00D9FF',
    hookup: '#FF073A',
    care: '#39FF14'
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-[#39FF14]" />
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              Network
            </h1>
            <p className="text-white/60">{convicts.length} Convicts • {mySquads.length} Squads</p>
          </div>
        </div>

        <Tabs defaultValue="convicts">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="convicts">
              Convicts ({convicts.length})
            </TabsTrigger>
            <TabsTrigger value="squads">
              Squads ({mySquads.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="activity">
              Live Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convicts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {convicts.map((convict, idx) => (
                <motion.div
                  key={convict.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-gradient-to-br from-[#39FF14]/10 to-[#00D9FF]/10 border-2 border-[#39FF14] rounded-none p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#39FF14] to-[#00D9FF] flex items-center justify-center text-black text-xl font-black">
                        {convict.full_name?.[0] || 'C'}
                      </div>
                      <div>
                        <h3 className="font-black text-lg">{convict.full_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-[#39FF14]">
                          <Zap className="w-3 h-3" />
                          <span>LVL {Math.floor((convict.xp || 0) / 1000) + 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link to={createPageUrl(`Messages?to=${convict.email}`)}>
                    <Button className="w-full bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black rounded-none">
                      TERMINAL →
                    </Button>
                  </Link>
                </motion.div>
              ))}
              {convicts.length === 0 && (
                <div className="col-span-3 text-center py-20">
                  <Shield className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">No Convicts yet. Send Handshakes below.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="squads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySquads.map((squad, idx) => {
                const members = squadMembers.filter(sm => sm.squad_id === squad.id);
                return (
                  <motion.div
                    key={squad.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-2 rounded-none p-5"
                    style={{ borderColor: SQUAD_COLORS[squad.interest] }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black text-xl mb-1">{squad.name}</h3>
                        <p className="text-sm text-white/60 mb-2">{squad.description}</p>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: SQUAD_COLORS[squad.interest] }}>
                          <Radio className="w-3 h-3" />
                          <span>{squad.interest}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Users className="w-4 h-4" />
                      <span>{members.length} members</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-4">
              {pendingRequests.map((req, idx) => {
                const requester = allUsers.find(u => u.email === req.requester_email);
                if (!requester) return null;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-none p-5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-xl font-black">
                        {requester.full_name?.[0] || 'U'}
                      </div>
                      <div>
                        <h3 className="font-bold">{requester.full_name}</h3>
                        <p className="text-sm text-white/60">Wants to connect</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => acceptMutation.mutate({ id: req.id, requester_email: req.requester_email })}
                      disabled={acceptMutation.isPending}
                      className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black rounded-none"
                    >
                      ACCEPT
                    </Button>
                  </motion.div>
                );
              })}
              {pendingRequests.length === 0 && (
                <div className="text-center py-20">
                  <UserPlus className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">No pending handshakes</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-3">
              {convictActivities.slice(0, 20).map((activity, idx) => {
                const actUser = allUsers.find(u => u.email === activity.user_email);
                if (!actUser) return null;
                
                const actionText = {
                  search: 'searched the globe',
                  filter: 'filtered beacons',
                  beacon_click: 'viewed a beacon',
                  city_click: 'explored a city',
                  layer_toggle: 'toggled layers'
                }[activity.action_type] || 'took action';

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="bg-[#39FF14]/5 border border-[#39FF14]/30 rounded-none p-4 font-mono"
                  >
                    <span className="text-[#39FF14] font-black">@{actUser.full_name?.toLowerCase().replace(/\s/g, '_')}</span>
                    <span className="text-white/60 mx-2">{actionText}</span>
                    <span className="text-white/40 text-xs">• {new Date(activity.created_date).toLocaleTimeString()}</span>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}