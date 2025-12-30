import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User, MapPin, Zap, Users, UserPlus, UserMinus, Calendar, Award, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const userEmail = searchParams.get('email');
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const profileUser = allUsers.find(u => u.email === userEmail);

  const { data: checkIns = [] } = useQuery({
    queryKey: ['check-ins', userEmail],
    queryFn: () => base44.entities.BeaconCheckIn.filter({ user_email: userEmail }, '-created_date', 20),
    enabled: !!userEmail
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['user-achievements', userEmail],
    queryFn: () => base44.entities.UserAchievement.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', userEmail],
    queryFn: () => base44.entities.UserFollow.filter({ following_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', userEmail],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: userEmail }),
    enabled: !!userEmail
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const isFollowing = following.some(f => f.following_email === userEmail);
  const isOwnProfile = currentUser?.email === userEmail;

  const followMutation = useMutation({
    mutationFn: () => base44.entities.UserFollow.create({
      follower_email: currentUser.email,
      following_email: userEmail
    }),
    onSuccess: () => queryClient.invalidateQueries(['following', currentUser.email])
  });

  const unfollowMutation = useMutation({
    mutationFn: () => {
      const followRecord = following.find(f => f.following_email === userEmail);
      return base44.entities.UserFollow.delete(followRecord.id);
    },
    onSuccess: () => queryClient.invalidateQueries(['following', currentUser.email])
  });

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">User not found</p>
      </div>
    );
  }

  const level = Math.floor((profileUser.xp || 0) / 1000) + 1;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/40 rounded-2xl p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-4xl font-bold">
              {profileUser.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2">{profileUser.full_name}</h1>
              <p className="text-white/60 mb-4">{profileUser.bio || 'No bio yet'}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FFEB3B]" />
                  <span className="font-bold">{profileUser.xp || 0} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FF1493]" />
                  <span className="font-bold">Level {level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00D9FF]" />
                  <span className="font-bold">{followers.length} Followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00D9FF]" />
                  <span className="font-bold">{following.length} Following</span>
                </div>
              </div>
            </div>
            {!isOwnProfile && currentUser && (
              <Button
                onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
                className={isFollowing ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-[#FF1493] hover:bg-[#FF1493]/90 text-black'}
              >
                {isFollowing ? <UserMinus className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="checkins">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="checkins">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checkIns.map((checkIn, idx) => (
                <motion.div
                  key={checkIn.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  {checkIn.photo_url && (
                    <img src={checkIn.photo_url} alt="Check-in" className="w-full h-48 object-cover rounded-lg mb-3" />
                  )}
                  <Link to={createPageUrl(`BeaconDetail?id=${checkIn.beacon_id}`)}>
                    <h3 className="font-bold mb-1 hover:text-[#FF1493] transition-colors">{checkIn.beacon_title}</h3>
                  </Link>
                  {checkIn.note && <p className="text-sm text-white/60 mb-2">{checkIn.note}</p>}
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(checkIn.created_date), 'MMM d, yyyy')}</span>
                  </div>
                </motion.div>
              ))}
              {checkIns.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No check-ins yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((ach, idx) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-gradient-to-br from-[#FFEB3B]/10 to-[#FF6B35]/10 border border-[#FFEB3B]/30 rounded-xl p-4 flex items-center gap-4"
                >
                  <Award className="w-12 h-12 text-[#FFEB3B]" />
                  <div>
                    <h3 className="font-bold">Achievement Unlocked</h3>
                    <p className="text-xs text-white/60">{format(new Date(ach.created_date), 'MMM d, yyyy')}</p>
                  </div>
                </motion.div>
              ))}
              {achievements.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No achievements unlocked yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}