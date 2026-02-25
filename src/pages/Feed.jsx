import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Activity, MapPin, ShoppingBag, Trophy, Users, Crown, Radio, TrendingUp, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Feed() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: following = [] } = useQuery({
    queryKey: ['following', currentUser?.email],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: allActivities = [] } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => base44.entities.ActivityFeed.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const followingEmails = following.map(f => f.following_email);
  const friendActivities = allActivities.filter(a => 
    followingEmails.includes(a.user_email) && a.visibility !== 'private'
  );

  const ACTIVITY_ICONS = {
    check_in: MapPin,
    purchase: ShoppingBag,
    achievement: Trophy,
    squad_join: Users,
    beacon_create: MapPin,
    king_crowned: Crown,
    war_declared: Crown,
    track_drop: Radio,
    level_up: TrendingUp,
    follow: UserPlus,
  };

  const ACTIVITY_COLORS = {
    check_in: '#00D9FF',
    purchase: '#C8962C',
    achievement: '#FFEB3B',
    squad_join: '#B026FF',
    beacon_create: '#39FF14',
    king_crowned: '#FFEB3B',
    war_declared: '#FF073A',
    track_drop: '#B026FF',
    level_up: '#39FF14',
    follow: '#00D9FF',
  };

  const renderActivity = (activity) => {
    const user = allUsers.find(u => u.email === activity.user_email);
    if (!user) return null;

    const Icon = ACTIVITY_ICONS[activity.activity_type];
    const color = ACTIVITY_COLORS[activity.activity_type];

    return (
      <motion.div
        key={activity.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
      >
        <div className="flex items-start gap-3">
          <Link to={createPageUrl(`Profile?email=${user.email}`)}>
            <div className="w-12 h-12 bg-gradient-to-br from-[#C8962C] to-[#B026FF] border border-white flex items-center justify-center flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{user.full_name?.[0]}</span>
              )}
            </div>
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link to={createPageUrl(`Profile?email=${user.email}`)}>
                <span className="font-bold hover:text-[#C8962C] transition-colors">
                  {user.full_name}
                </span>
              </Link>
              <span className="text-white/40">•</span>
              <span className="text-xs text-white/40">
                {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: color + '20', border: `1px solid ${color}` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <ActivityText activity={activity} />
            </div>


            {activity.location?.city && (
              <div className="text-xs text-white/40 mt-2">
                📍 {activity.location.city}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const ActivityText = ({ activity }) => {
    const data = activity.activity_data || {};
    
    switch (activity.activity_type) {
      case 'check_in':
        return <span className="text-sm">checked in at <span className="text-[#00D9FF]">{data.beacon_title}</span></span>;
      case 'purchase':
        return <span className="text-sm">bought <span className="text-[#C8962C]">{data.product_name}</span></span>;
      case 'achievement':
        return <span className="text-sm">unlocked <span className="text-[#FFEB3B]">{data.achievement_title}</span></span>;
      case 'squad_join':
        return <span className="text-sm">joined <span className="text-[#B026FF]">{data.squad_name}</span></span>;
      case 'beacon_create':
        return <span className="text-sm">created beacon <span className="text-[#39FF14]">{data.beacon_title}</span></span>;
      case 'king_crowned':
        return <span className="text-sm">crowned Night King at <span className="text-[#FFEB3B]">{data.venue_name}</span></span>;
      case 'war_declared':
        return <span className="text-sm">declared WAR at <span className="text-[#FF073A]">{data.venue_name}</span></span>;
      case 'track_drop':
        return <span className="text-sm">dropped track <span className="text-[#B026FF]">{data.track_title}</span></span>;
      case 'level_up':
        return <span className="text-sm">reached <span className="text-[#39FF14]">Level {data.level}</span></span>;
      case 'follow':
        return <span className="text-sm">started following <span className="text-[#00D9FF]">{data.target_name}</span></span>;
      default:
        return <span className="text-sm">{activity.activity_type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
            <span className="text-[#C8962C]">ACTIVITY</span> FEED
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            What's happening in the scene
          </p>
        </motion.div>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all">All Activity</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {allActivities.filter(a => a.visibility === 'public').map(renderActivity)}
          </TabsContent>

          <TabsContent value="following" className="space-y-3">
            {friendActivities.length === 0 ? (
              <div className="text-center py-12 border-2 border-white/10">
                <Activity className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 mb-2">No activity from people you follow</p>
                <Link to={createPageUrl('Connect')}>
                  <button className="text-[#C8962C] text-sm uppercase font-bold hover:underline">
                    Find people to follow
                  </button>
                </Link>
              </div>
            ) : (
              friendActivities.map(renderActivity)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}