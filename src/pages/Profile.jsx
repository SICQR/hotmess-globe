import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { User, Users, Calendar, Award, Camera, Star, Pin, Trophy, Shield, Music, Lock, Instagram, Twitter, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ProfileHeader from '../components/profile/ProfileHeader';
import StandardProfileView from '../components/profile/StandardProfileView';
import SellerProfileView from '../components/profile/SellerProfileView';
import ProfileStats from '../components/profile/ProfileStats';
import { sanitizeText, sanitizeURL, sanitizeSocialLinks } from '../components/utils/sanitize';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';
import ErrorBoundary from '../components/error/ErrorBoundary';
import RightNowIndicator from '../components/discovery/RightNowIndicator';
import ProfileCompleteness from '../components/profile/ProfileCompleteness';
import WelcomeTour from '../components/onboarding/WelcomeTour';
import VibeSynthesisCard from '../components/vibe/VibeSynthesisCard';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const userEmail = searchParams.get('email');
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useCurrentUser();
  const { data: allUsers = [] } = useAllUsers();

  const profileUser = userEmail ? allUsers.find(u => u.email === userEmail) : currentUser;
  const isSetupMode = !profileUser?.full_name || !profileUser?.avatar_url;

  // State for profile setup
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const { data: rightNowStatus } = useQuery({
    queryKey: ['right-now-profile', userEmail],
    queryFn: async () => {
      const statuses = await base44.entities.RightNowStatus.filter({
        user_email: userEmail,
        active: true
      });
      return statuses.find(s => new Date(s.expires_at) > new Date()) || null;
    },
    enabled: !!userEmail,
    refetchInterval: 15000
  });

  // Track profile view
  useEffect(() => {
    const trackView = async () => {
      if (!currentUser || !userEmail || isOwnProfile) return;
      
      try {
        await base44.entities.ProfileView.create({
          viewer_email: currentUser.email,
          viewed_email: userEmail,
          viewed_at: new Date().toISOString(),
        });
      } catch (error) {
        console.log('Failed to track profile view');
      }
    };
    
    trackView();
  }, [currentUser, userEmail, isOwnProfile]);

  // Fetch profile views
  const { data: profileViews = [] } = useQuery({
    queryKey: ['profile-views', userEmail],
    queryFn: () => base44.entities.ProfileView.filter({ viewed_email: userEmail }, '-viewed_at'),
    enabled: !!userEmail && isOwnProfile,
  });

  const viewCount = profileViews.length;
  const tier = currentUser?.membership_tier || 'basic';
  const level = Math.floor((profileUser.xp || 0) / 1000) + 1;
  // Chrome tier: Level 5+ can see WHO viewed their profile
  const canSeeViewers = level >= 5;

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!avatarFile) {
      toast.error('Please upload an avatar');
      return;
    }

    setSaving(true);
    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: avatarFile });
      setUploading(false);
      await base44.auth.updateMe({
        full_name: fullName.trim(),
        avatar_url: file_url
      });
      toast.success('Profile complete!');
      window.location.href = createPageUrl('Connect');
    } catch (error) {
      console.error('Profile setup failed:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!profileUser) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-white/60">Loading...</p>
        </div>
      </ErrorBoundary>
    );
  }

  // Render setup mode if profile is incomplete
  if (isSetupMode && !userEmail) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black uppercase mb-2">
              <span className="text-[#FF1493]">HOT</span>MESS
            </h1>
            <p className="text-sm text-white/60 uppercase tracking-wider">Complete Your Profile</p>
          </div>

          <form onSubmit={handleSetupSubmit} className="bg-white/5 border-2 border-white p-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 bg-gradient-to-br from-[#FF1493] to-[#B026FF] border-2 border-white flex items-center justify-center overflow-hidden">
                {avatarFile ? (
                  <img
                    src={URL.createObjectURL(avatarFile)}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                    style={{ filter: 'grayscale(100%)' }}
                  />
                ) : (
                  <User className="w-16 h-16 text-white/40" />
                )}
              </div>
              <Button
                type="button"
                onClick={() => document.getElementById('avatar-upload').click()}
                className="bg-white text-black hover:bg-[#FF1493] hover:text-white font-black"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Avatar
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-white/40 uppercase text-center">
                Avatar will be displayed in grayscale
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="bg-white/5 border-2 border-white/20 text-white"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={saving || !fullName.trim() || !avatarFile}
              className="w-full bg-[#FF1493] hover:bg-white text-white hover:text-black font-black text-lg py-6 border-2 border-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {uploading ? 'UPLOADING...' : 'SAVING...'}
                </>
              ) : (
                'COMPLETE SETUP'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  const profileType = profileUser?.profile_type || 'standard';

  return (
    <ErrorBoundary>
      <WelcomeTour />
      <div className="min-h-screen bg-black text-white">
        {/* Profile Completeness */}
        {isOwnProfile && (
          <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <ProfileCompleteness user={profileUser} />
            </div>
          </div>
        )}

        {/* Profile Header */}
        <ProfileHeader 
          user={profileUser} 
          isOwnProfile={isOwnProfile} 
          currentUser={currentUser} 
        />

        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Vibe Synthesis - AI-Generated Character Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <VibeSynthesisCard userEmail={userEmail || currentUser?.email} />
          </motion.div>

          {/* Right Now Status */}
          {rightNowStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <RightNowIndicator status={rightNowStatus} />
            </motion.div>
          )}

          {/* Social Links - Behind Handshake */}
          {profileUser.social_links && Object.values(profileUser.social_links).some(v => v) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6"
            >

              {handshakeExists ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-[#00D9FF]" />
                    <p className="text-xs text-white/40 uppercase">Social Links (Connected)</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const sanitizedLinks = sanitizeSocialLinks(profileUser.social_links || {});
                      return (
                        <>
                          {sanitizedLinks.instagram && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.instagram, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#833AB4] to-[#E1306C] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                                            >
                                              <Instagram className="w-4 h-4" />
                                              Instagram
                                            </a>
                                          )}
                                          {sanitizedLinks.twitter && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.twitter, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-black rounded-lg text-white text-sm border border-white/20 hover:bg-white/10 transition-colors"
                                            >
                                              <Twitter className="w-4 h-4" />
                                              Twitter
                                            </a>
                                          )}
                                          {sanitizedLinks.spotify && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.spotify, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-[#1DB954] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                                            >
                                              <Music className="w-4 h-4" />
                                              Spotify
                                            </a>
                                          )}
                                          {sanitizedLinks.soundcloud && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.soundcloud, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-[#FF5500] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                                            >
                                              <Music className="w-4 h-4" />
                                              SoundCloud
                                            </a>
                                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Lock className="w-4 h-4" />
                  <p>Complete Telegram handshake to view social links</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Profile Type Specific View */}
          {profileType === 'seller' ? (
            <SellerProfileView user={profileUser} />
          ) : (
            <StandardProfileView 
              user={profileUser} 
              currentUser={currentUser} 
              isHandshakeConnection={handshakeExists} 
            />
          )}

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

          {/* Profile Views */}
          {isOwnProfile && viewCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6 bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#00D9FF]" />
                  <h2 className="text-xl font-black uppercase">Profile Views</h2>
                </div>
                <span className="text-2xl font-black text-[#00D9FF]">{viewCount}</span>
              </div>
              
              {canSeeViewers ? (
                <div className="space-y-2">
                  <p className="text-xs text-white/60 uppercase mb-3">Recent Viewers (Chrome Tier - Level 5+)</p>
                  {profileViews.slice(0, 10).map((view, idx) => {
                    const viewer = allUsers.find(u => u.email === view.viewer_email);
                    if (!viewer) return null;
                    
                    return (
                      <Link key={idx} to={createPageUrl(`Profile?email=${viewer.email}`)}>
                        <div className="flex items-center gap-3 p-2 hover:bg-white/5 transition-colors">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#FF1493] to-[#B026FF] border border-white flex items-center justify-center">
                            {viewer.avatar_url ? (
                              <img src={viewer.avatar_url} alt={viewer.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold">{viewer.full_name?.[0]}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{viewer.full_name}</p>
                            <p className="text-xs text-white/40">{format(new Date(view.viewed_at), 'MMM d, h:mm a')}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-white/60 mb-2">
                    Reach Level 5 to unlock Chrome tier and see who viewed your profile
                  </p>
                  <p className="text-xs text-white/40">
                    Currently Level {level} • Need {(5 - level) * 1000} more XP
                  </p>
                </div>
              )}
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
                      <h3 className="font-bold mb-1 hover:text-[#FF1493] transition-colors">{sanitizeText(checkIn.beacon_title)}</h3>
                    </Link>
                    {checkIn.note && <p className="text-sm text-white/60 mb-2">{sanitizeText(checkIn.note)}</p>}
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
    </ErrorBoundary>
  );
}