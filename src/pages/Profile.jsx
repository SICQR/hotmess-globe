import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User, MapPin, Zap, Users, UserPlus, UserMinus, Calendar, Award, Camera, Star, Pin, Trophy, Shield, Edit, Music, Sparkles, Lock, Instagram, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import HandshakeButton from '../components/social/HandshakeButton';
import QuickActions from '../components/profile/QuickActions';
import MutualConnections from '../components/profile/MutualConnections';
import ProfileStats from '../components/profile/ProfileStats';
import PremiumContentUnlock from '../components/profile/PremiumContentUnlock';
import ReportButton from '../components/moderation/ReportButton';
import BlockButton from '../components/moderation/BlockButton';

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

  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights', userEmail],
    queryFn: () => base44.entities.UserHighlight.filter({ user_email: userEmail }, 'order'),
    enabled: !!userEmail
  });

  const { data: allAchievements = [] } = useQuery({
    queryKey: ['all-achievements'],
    queryFn: () => base44.entities.Achievement.list()
  });

  const { data: allBeacons = [] } = useQuery({
    queryKey: ['all-beacons'],
    queryFn: () => base44.entities.Beacon.list()
  });

  const { data: squadMembers = [] } = useQuery({
    queryKey: ['squad-members-profile'],
    queryFn: () => base44.entities.SquadMember.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: allSquads = [] } = useQuery({
    queryKey: ['all-squads'],
    queryFn: () => base44.entities.Squad.list()
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

  // Check if current user has handshake with profile user
  const { data: handshakeExists } = useQuery({
    queryKey: ['handshake-check', currentUser?.email, userEmail],
    queryFn: async () => {
      if (!currentUser || isOwnProfile) return true;
      const sessions = await base44.entities.BotSession.list();
      return sessions.some(s => 
        ((s.initiator_email === currentUser.email && s.target_email === userEmail) ||
         (s.initiator_email === userEmail && s.target_email === currentUser.email)) &&
        s.status === 'accepted'
      );
    },
    enabled: !!currentUser && !!userEmail,
  });

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

  const pinMutation = useMutation({
    mutationFn: (data) => base44.entities.UserHighlight.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['highlights']);
      toast.success('Pinned!');
    }
  });

  const unpinMutation = useMutation({
    mutationFn: (id) => base44.entities.UserHighlight.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['highlights']);
      toast.success('Unpinned');
    }
  });

  const userSquads = allSquads.filter(s => squadMembers.some(sm => sm.squad_id === s.id));
  const achievementDetails = achievements.map(ua => {
    const achDetail = allAchievements.find(a => a.id === ua.achievement_id);
    return { ...ua, ...achDetail };
  });

  const handlePinCheckIn = (checkIn) => {
    if (!isOwnProfile) return;
    const alreadyPinned = highlights.find(h => h.item_type === 'checkin' && h.item_id === checkIn.id);
    if (alreadyPinned) {
      unpinMutation.mutate(alreadyPinned.id);
    } else {
      pinMutation.mutate({
        user_email: currentUser.email,
        item_type: 'checkin',
        item_id: checkIn.id,
        order: highlights.length
      });
    }
  };

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
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-4xl font-bold overflow-hidden">
              {profileUser.avatar_url ? (
                <img src={profileUser.avatar_url} alt={profileUser.full_name} className="w-full h-full object-cover" />
              ) : (
                profileUser.full_name?.[0] || 'U'
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black">{profileUser.full_name}</h1>
                {isOwnProfile && (
                  <Link to={createPageUrl('EditProfile')}>
                    <Button variant="ghost" size="sm" className="text-[#FF1493]">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
              <p className="text-white/60 mb-4">{profileUser.bio || 'No bio yet'}</p>

              {/* Vibes */}
              {profileUser.preferred_vibes && profileUser.preferred_vibes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {profileUser.preferred_vibes.map(vibe => (
                    <span
                      key={vibe}
                      className="px-2 py-1 rounded-lg bg-[#FFEB3B]/20 border border-[#FFEB3B]/40 text-[#FFEB3B] text-xs font-bold uppercase"
                    >
                      {vibe}
                    </span>
                  ))}
                </div>
              )}

              {/* Music Taste */}
              {profileUser.music_taste && profileUser.music_taste.length > 0 && (
                <div className="flex items-start gap-2 mb-3 text-sm">
                  <Music className="w-4 h-4 text-[#B026FF] flex-shrink-0 mt-0.5" />
                  <p className="text-white/80">{profileUser.music_taste.join(', ')}</p>
                </div>
              )}

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
                {profileUser.activity_status && profileUser.activity_status !== 'offline' && (
                  <div className={`flex items-center gap-2 px-3 py-1 border-2 ${
                    profileUser.activity_status === 'online' ? 'bg-[#00D9FF]/20 border-[#00D9FF]' :
                    profileUser.activity_status === 'busy' ? 'bg-[#FF6B35]/20 border-[#FF6B35]' :
                    profileUser.activity_status === 'looking_for_collabs' ? 'bg-[#39FF14]/20 border-[#39FF14]' :
                    'bg-[#FF1493]/20 border-[#FF1493]'
                  }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      profileUser.activity_status === 'online' ? 'bg-[#00D9FF]' :
                      profileUser.activity_status === 'busy' ? 'bg-[#FF6B35]' :
                      profileUser.activity_status === 'looking_for_collabs' ? 'bg-[#39FF14]' :
                      'bg-[#FF1493]'
                    }`} />
                    <span className="text-xs font-black uppercase">
                      {profileUser.activity_status.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {!isOwnProfile && currentUser && (
              <div className="flex flex-col gap-2">
                <QuickActions 
                  profileUser={profileUser}
                  currentUser={currentUser}
                  isOwnProfile={isOwnProfile}
                />
                <div className="flex gap-2">
                  <BlockButton userEmail={profileUser.email} />
                  <ReportButton itemType="user" itemId={profileUser.email} variant="outline" />
                </div>
              </div>
            )}
          </div>

          {/* Social Links - Behind Handshake */}
          {profileUser.social_links && Object.values(profileUser.social_links).some(v => v) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              {handshakeExists ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-[#00D9FF]" />
                    <p className="text-xs text-white/40 uppercase">Social Links (Connected)</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {profileUser.social_links.instagram && (
                      <a
                        href={`https://instagram.com/${profileUser.social_links.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#833AB4] to-[#E1306C] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                      >
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </a>
                    )}
                    {profileUser.social_links.twitter && (
                      <a
                        href={`https://twitter.com/${profileUser.social_links.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-black rounded-lg text-white text-sm border border-white/20 hover:bg-white/10 transition-colors"
                      >
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </a>
                    )}
                    {profileUser.social_links.spotify && (
                      <a
                        href={profileUser.social_links.spotify.startsWith('http') ? profileUser.social_links.spotify : `https://open.spotify.com/user/${profileUser.social_links.spotify}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-[#1DB954] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                      >
                        <Music className="w-4 h-4" />
                        Spotify
                      </a>
                    )}
                    {profileUser.social_links.soundcloud && (
                      <a
                        href={profileUser.social_links.soundcloud.startsWith('http') ? profileUser.social_links.soundcloud : `https://soundcloud.com/${profileUser.social_links.soundcloud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-[#FF5500] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                      >
                        <Music className="w-4 h-4" />
                        SoundCloud
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Lock className="w-4 h-4" />
                  <p>Complete Telegram handshake to view social links</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <ProfileStats
            xp={profileUser.xp}
            level={level}
            followersCount={followers.length}
            followingCount={following.length}
            checkInsCount={checkIns.length}
            achievementsCount={achievements.length}
            city={profileUser.city}
          />
        </motion.div>

        {/* Mutual Connections */}
        {!isOwnProfile && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mb-6"
          >
            <MutualConnections
              profileUserEmail={profileUser.email}
              currentUserEmail={currentUser.email}
            />
          </motion.div>
        )}

        {/* Skills */}
        {profileUser.skills && profileUser.skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4">Skills & Talents</h3>
            <div className="flex flex-wrap gap-2">
              {profileUser.skills.map((skill, idx) => (
                <div key={idx} className="px-3 py-1.5 bg-[#39FF14]/20 border-2 border-[#39FF14] text-[#39FF14] text-xs font-black uppercase">
                  {skill}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Event Preferences */}
        {profileUser.event_preferences && profileUser.event_preferences.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="mb-6"
          >
            <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4">Event Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {profileUser.event_preferences.map((vibe, idx) => (
                <div key={idx} className="px-3 py-1.5 bg-[#00D9FF]/20 border-2 border-[#00D9FF] text-[#00D9FF] text-xs font-black uppercase">
                  {vibe}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Premium Content */}
        {!isOwnProfile && profileUser.has_premium_content && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mb-6"
          >
            <PremiumContentUnlock profileUser={profileUser} currentUser={currentUser} />
          </motion.div>
        )}

        {/* Portfolio / Creations */}
        {profileUser.portfolio && profileUser.portfolio.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="mb-6"
          >
            <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4">Portfolio & Creations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileUser.portfolio.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-black border-2 border-white hover:border-[#FF1493] transition-all overflow-hidden"
                >
                  {item.image_url && (
                    <div className="h-40 overflow-hidden">
                      <img 
                        src={item.image_url} 
                        alt={item.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-black text-sm">{item.title}</h4>
                      <span className="text-[10px] uppercase text-white/40 font-bold">{item.type}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-white/60 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Highlights Section */}
        {highlights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-[#FFEB3B]" />
              <h2 className="text-xl font-black uppercase">Highlights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {highlights.slice(0, 6).map((highlight, idx) => {
                const checkIn = checkIns.find(c => c.id === highlight.item_id);
                const squad = userSquads.find(s => s.id === highlight.item_id);
                const achievement = achievementDetails.find(a => a.id === highlight.item_id);
                
                return (
                  <motion.div
                    key={highlight.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-[#FFEB3B]/10 to-[#FF1493]/10 border-2 border-[#FFEB3B] rounded-none p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Star className="w-5 h-5 text-[#FFEB3B]" />
                      {highlight.item_type === 'checkin' && checkIn && (
                        <span className="text-xs text-[#00D9FF] font-bold uppercase">Check-in</span>
                      )}
                      {highlight.item_type === 'squad' && squad && (
                        <span className="text-xs text-[#B026FF] font-bold uppercase">Squad</span>
                      )}
                      {highlight.item_type === 'achievement' && achievement && (
                        <span className="text-xs text-[#FFEB3B] font-bold uppercase">Badge</span>
                      )}
                    </div>
                    {checkIn && (
                      <h3 className="font-bold text-sm">{checkIn.beacon_title}</h3>
                    )}
                    {squad && (
                      <h3 className="font-bold text-sm">{squad.name}</h3>
                    )}
                    {achievement && (
                      <h3 className="font-bold text-sm">{achievement.title}</h3>
                    )}
                    {highlight.note && (
                      <p className="text-xs text-white/60 mt-1">{highlight.note}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Badges Display */}
        {achievementDetails.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[#FF1493]" />
              <h2 className="text-xl font-black uppercase">Badges</h2>
              <span className="text-sm text-white/60">({achievementDetails.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {achievementDetails.slice(0, 12).map((ach, idx) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative group"
                  title={ach.title || 'Achievement'}
                >
                  <div 
                    className="w-16 h-16 rounded-full border-4 flex items-center justify-center"
                    style={{ 
                      borderColor: ach.color || '#FFEB3B',
                      backgroundColor: `${ach.color || '#FFEB3B'}20`
                    }}
                  >
                    <Trophy className="w-6 h-6" style={{ color: ach.color || '#FFEB3B' }} />
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border-2 border-white rounded-none text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-bold">{ach.title}</div>
                    <div className="text-white/60">{ach.description}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="checkins">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="squads">Squads</TabsTrigger>
          </TabsList>

          <TabsContent value="checkins">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checkIns.map((checkIn, idx) => {
                const isPinned = highlights.some(h => h.item_type === 'checkin' && h.item_id === checkIn.id);
                return (
                  <motion.div
                    key={checkIn.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 relative"
                  >
                    {isOwnProfile && (
                      <Button
                        onClick={() => handlePinCheckIn(checkIn)}
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                      >
                        <Pin className={`w-4 h-4 ${isPinned ? 'fill-[#FFEB3B] text-[#FFEB3B]' : 'text-white/40'}`} />
                      </Button>
                    )}
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
                );
              })}
              {checkIns.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No check-ins yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievementDetails.map((ach, idx) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-gradient-to-br from-[#FFEB3B]/10 to-[#FF6B35]/10 border-2 rounded-none p-5"
                  style={{ borderColor: ach.color || '#FFEB3B' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-full border-4 flex items-center justify-center"
                      style={{ 
                        borderColor: ach.color || '#FFEB3B',
                        backgroundColor: `${ach.color || '#FFEB3B'}20`
                      }}
                    >
                      <Trophy className="w-6 h-6" style={{ color: ach.color || '#FFEB3B' }} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm">{ach.title || 'Achievement'}</h3>
                      <p className="text-xs text-white/60">{format(new Date(ach.unlocked_date || ach.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  {ach.description && (
                    <p className="text-xs text-white/60">{ach.description}</p>
                  )}
                  {ach.xp_required && (
                    <div className="mt-2 text-xs text-[#FFEB3B] font-bold">
                      {ach.xp_required} XP
                    </div>
                  )}
                </motion.div>
              ))}
              {achievements.length === 0 && (
                <div className="col-span-3 text-center py-12 text-white/40">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No achievements unlocked yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="squads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userSquads.map((squad, idx) => (
                <motion.div
                  key={squad.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-5"
                >
                  <h3 className="font-black text-lg mb-2">{squad.name}</h3>
                  <p className="text-sm text-white/60 mb-3">{squad.description}</p>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#B026FF]">
                    <Users className="w-4 h-4" />
                    <span>{squad.interest}</span>
                  </div>
                </motion.div>
              ))}
              {userSquads.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Not in any squads yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}