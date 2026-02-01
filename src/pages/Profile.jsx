/**
 * Profile - Rich, detailed profile page
 * 
 * Sections:
 * 1. Photo Hero - Swipeable gallery
 * 2. Identity - Name, username, verified, location
 * 3. Quick Actions - Follow, Message, Share
 * 4. About - Bio, basic info
 * 5. Vibe - Music, interests, looking for
 * 6. Stats - Nights out, reach, following
 * 7. Recent Activity - Check-ins, events
 * 8. Gallery - Photo grid (if multiple)
 * 9. Social Links - Instagram, Twitter, Spotify
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { 
  Camera, MapPin, MessageCircle, Edit3, Settings, 
  ChevronLeft, ChevronRight, Plus, Music, Clock,
  Calendar, Users, Share2, MoreHorizontal, Heart,
  Check, Star, Crown, Zap, Sparkles, Eye,
  Instagram, Twitter, Copy, Briefcase, Ruler,
  Ban, Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useAllUsers } from '@/components/utils/queryConfig';
import { createPageUrl } from '../utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Profile type config
const profileTypes = {
  creator: { icon: Star, color: '#FFD700', label: 'Creator' },
  seller: { icon: Sparkles, color: '#FF6B35', label: 'Seller' },
  host: { icon: Crown, color: '#B026FF', label: 'Host' },
  dj: { icon: Zap, color: '#00D9FF', label: 'DJ' },
};

// Section header component
function SectionHeader({ title, action, actionLabel }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">{title}</h2>
      {action && (
        <button onClick={action} className="text-xs text-[#FF1493] font-bold">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Tag pill component
function TagPill({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-white/5 text-white/60 border-white/10',
    music: 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30',
    interest: 'bg-[#FF1493]/10 text-[#FF1493] border-[#FF1493]/30',
    looking: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30',
  };
  
  return (
    <span className={cn('px-3 py-1.5 text-xs font-bold uppercase border rounded-full', styles[variant])}>
      {children}
    </span>
  );
}

// Stat card component
function StatCard({ value, label, color = '#FF1493', icon: Icon }) {
  return (
    <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
      {Icon && <Icon className="w-4 h-4 mx-auto mb-2" style={{ color }} />}
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

// Helper to get display name
const getDisplayName = (user) => {
  if (!user) return 'Anonymous';
  return user.display_name || user.full_name || user.username || user.email?.split('@')[0] || 'Anonymous';
};

// Helper to get username
const getUsername = (user) => {
  if (!user?.username) return null;
  return `@${user.username}`;
};

export default function Profile() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  const uidParam = searchParams.get('uid') || searchParams.get('auth_user_id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: currentUser } = useCurrentUser();
  const { data: allUsers = [] } = useAllUsers();

  // Find profile user
  const isViewingOther = !!emailParam || !!uidParam;
  const profileUser = useMemo(() => {
    if (!isViewingOther) return currentUser;
    if (emailParam) {
      return allUsers.find(u => u?.email?.toLowerCase() === emailParam.toLowerCase());
    }
    if (uidParam) {
      return allUsers.find(u => 
        u?.auth_user_id === uidParam || u?.authUserId === uidParam || u?.id === uidParam
      );
    }
    return null;
  }, [isViewingOther, emailParam, uidParam, currentUser, allUsers]);

  const isOwnProfile = currentUser?.email === profileUser?.email;
  const userEmail = profileUser?.email;

  // Photo state
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Get photos
  const photos = useMemo(() => {
    if (!profileUser) return [];
    const urls = [];
    if (profileUser.avatar_url) urls.push(profileUser.avatar_url);
    if (Array.isArray(profileUser.photos)) {
      profileUser.photos.forEach(p => {
        const url = typeof p === 'string' ? p : p?.url;
        if (url && !urls.includes(url)) urls.push(url);
      });
    }
    return urls;
  }, [profileUser]);

  // Get profile type
  const profileType = profileUser?.profile_type && profileUser.profile_type !== 'standard' 
    ? profileTypes[profileUser.profile_type] 
    : null;

  // Fetch stats
  const { data: checkIns = [] } = useQuery({
    queryKey: ['profile-checkins', userEmail],
    queryFn: () => base44.entities.BeaconCheckIn.filter({ user_email: userEmail }, '-created_date', 10),
    enabled: !!userEmail
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['profile-followers', userEmail],
    queryFn: () => base44.entities.UserFollow.filter({ following_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: following = [] } = useQuery({
    queryKey: ['profile-following', userEmail],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: profileViews = [] } = useQuery({
    queryKey: ['profile-views', userEmail],
    queryFn: () => base44.entities.ProfileView.filter({ viewed_email: userEmail }),
    enabled: !!userEmail && isOwnProfile
  });

  // Extract tags
  const musicTags = useMemo(() => profileUser?.music_taste || profileUser?.musicTags || [], [profileUser]);
  const interests = useMemo(() => profileUser?.interests || profileUser?.event_preferences || [], [profileUser]);
  const lookingFor = useMemo(() => profileUser?.looking_for || [], [profileUser]);

  // Navigate photos
  const nextPhoto = () => setPhotoIndex(i => Math.min(photos.length - 1, i + 1));
  const prevPhoto = () => setPhotoIndex(i => Math.max(0, i - 1));

  // Check if following
  const amFollowing = useMemo(() => {
    if (!currentUser || isOwnProfile) return false;
    return followers.some(f => f.follower_email === currentUser.email);
  }, [followers, currentUser, isOwnProfile]);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (amFollowing) {
        const existing = followers.find(f => f.follower_email === currentUser.email);
        if (existing) await base44.entities.UserFollow.delete(existing.id);
      } else {
        await base44.entities.UserFollow.create({
          follower_email: currentUser.email,
          following_email: userEmail
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile-followers', userEmail]);
      toast.success(amFollowing ? 'Unfollowed' : 'Following!');
    }
  });

  // Copy profile link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/social/u/${profileUser?.id || profileUser?.auth_user_id}`;
    navigator.clipboard.writeText(url);
    toast.success('Profile link copied!');
    setShowMoreActions(false);
  };

  // Share profile
  const handleShare = async () => {
    const url = `${window.location.origin}/social/u/${profileUser?.id || profileUser?.auth_user_id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${getDisplayName(profileUser)} on HOTMESS`,
          url
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  // Loading / Not found
  if (!profileUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <Camera className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-2xl font-black mb-2">Profile Not Found</h2>
          <p className="text-white/50 text-sm mb-8">This profile may be private or deleted</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Photo Hero */}
      <div className="relative aspect-[3/4] max-h-[75vh] bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
        {photos.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.img
                key={photoIndex}
                src={photos[photoIndex]}
                alt={getDisplayName(profileUser)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Photo indicators */}
            {photos.length > 1 && (
              <div className="absolute top-4 inset-x-4 flex gap-1.5 z-10">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={cn(
                      'flex-1 h-1 rounded-full transition-all',
                      i === photoIndex ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
                    )}
                  />
                ))}
              </div>
            )}

            {/* Tap zones */}
            {photos.length > 1 && (
              <>
                <button onClick={prevPhoto} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="Previous" />
                <button onClick={nextPhoto} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" aria-label="Next" />
              </>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-800 to-black">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-12 h-12 text-white/20" />
              </div>
              <p className="text-white/40 mb-4">No photos yet</p>
              {isOwnProfile && (
                <Link to={createPageUrl('EditProfile')}>
                  <Button variant="hot" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Photos
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Header buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between z-20">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex gap-2">
            {isOwnProfile ? (
              <Link to={createPageUrl('EditProfile')}>
                <Button size="icon" variant="ghost" className="bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70">
                  <Edit3 className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <div className="relative">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70"
                  onClick={() => setShowMoreActions(!showMoreActions)}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>

                {/* More actions dropdown */}
                <AnimatePresence>
                  {showMoreActions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-12 right-0 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[180px] z-50"
                    >
                      <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <Copy className="w-4 h-4 text-white/60" />
                        <span className="text-sm">Copy Link</span>
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <Share2 className="w-4 h-4 text-white/60" />
                        <span className="text-sm">Share</span>
                      </button>
                      <div className="border-t border-white/10" />
                      <button className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left text-white/50">
                        <Ban className="w-4 h-4" />
                        <span className="text-sm">Block</span>
                      </button>
                      <button className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left text-red-400">
                        <Flag className="w-4 h-4" />
                        <span className="text-sm">Report</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Identity overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          {/* Profile type badge */}
          {profileType && (
            <div 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mb-3"
              style={{ backgroundColor: `${profileType.color}20` }}
            >
              <profileType.icon className="w-4 h-4" style={{ color: profileType.color }} />
              <span className="text-xs font-bold uppercase" style={{ color: profileType.color }}>
                {profileType.label}
              </span>
            </div>
          )}

          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              {/* Name + verified */}
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-black truncate">{getDisplayName(profileUser)}</h1>
                {profileUser.verified && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#00D9FF] flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" strokeWidth={3} />
                  </div>
                )}
                {profileUser.age && (
                  <span className="text-2xl text-white/50 font-normal">{profileUser.age}</span>
                )}
              </div>

              {/* Username */}
              {getUsername(profileUser) && (
                <p className="text-white/50 text-sm font-mono mb-1">{getUsername(profileUser)}</p>
              )}

              {/* Location */}
              {profileUser.city && (
                <p className="text-white/50 text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profileUser.city}
                </p>
              )}
            </div>

            {/* Follow button */}
            {!isOwnProfile && (
              <Button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className={cn(
                  'rounded-full font-black px-6 flex-shrink-0',
                  amFollowing
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-[#FF1493] hover:bg-[#FF1493]/80 text-white'
                )}
              >
                {amFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showMoreActions && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
      )}

      {/* Content */}
      <div className="px-4 pt-6 space-y-8">
        {/* Quick actions for others */}
        {!isOwnProfile && (
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(createPageUrl(`Messages?to=${userEmail}`))}
              variant="hot"
              className="flex-1 h-12 font-black rounded-xl"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Message
            </Button>
            <Button 
              variant="outline" 
              className="h-12 px-5 border-white/20 hover:bg-white/10 rounded-xl"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* About section */}
        {(profileUser.bio || profileUser.pronouns || profileUser.height || profileUser.job) && (
          <div>
            <SectionHeader title="About" />
            {profileUser.bio && (
              <p className="text-white/80 text-sm leading-relaxed mb-4">{profileUser.bio}</p>
            )}
            {(profileUser.pronouns || profileUser.height || profileUser.job) && (
              <div className="flex flex-wrap gap-4">
                {profileUser.pronouns && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Users className="w-4 h-4" />
                    {profileUser.pronouns}
                  </div>
                )}
                {profileUser.height && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Ruler className="w-4 h-4" />
                    {profileUser.height}
                  </div>
                )}
                {profileUser.job && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Briefcase className="w-4 h-4" />
                    {profileUser.job}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vibe section - Music tags */}
        {musicTags.length > 0 && (
          <div>
            <SectionHeader title="Music" />
            <div className="flex flex-wrap gap-2">
              {musicTags.slice(0, 8).map((tag, i) => (
                <TagPill key={i} variant="music">{tag}</TagPill>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div>
            <SectionHeader title="Interests" />
            <div className="flex flex-wrap gap-2">
              {interests.slice(0, 8).map((tag, i) => (
                <TagPill key={i} variant="interest">{tag}</TagPill>
              ))}
            </div>
          </div>
        )}

        {/* Looking for */}
        {lookingFor.length > 0 && (
          <div>
            <SectionHeader title="Looking For" />
            <div className="flex flex-wrap gap-2">
              {lookingFor.map((item, i) => (
                <TagPill key={i} variant="looking">{item}</TagPill>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            value={checkIns.length} 
            label="Nights Out" 
            color="#FF1493"
            icon={Calendar}
          />
          <StatCard 
            value={isOwnProfile ? profileViews.length : followers.length} 
            label={isOwnProfile ? 'Reach' : 'Followers'} 
            color="#00D9FF"
            icon={isOwnProfile ? Eye : Users}
          />
          <StatCard 
            value={following.length} 
            label="Following" 
            color="#39FF14"
            icon={Heart}
          />
        </div>

        {/* Recent Activity */}
        <div>
          <SectionHeader 
            title="Recent" 
            action={checkIns.length > 5 ? () => {} : undefined}
            actionLabel="See All"
          />
          
          {checkIns.length > 0 ? (
            <div className="space-y-2">
              {checkIns.slice(0, 5).map((checkIn) => (
                <Link 
                  key={checkIn.id}
                  to={createPageUrl(`BeaconDetail?id=${checkIn.beacon_id}`)}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{checkIn.beacon_title || 'Check-in'}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(checkIn.created_date), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/20 flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm mb-1">
                {isOwnProfile ? 'Your story starts tonight' : 'No activity yet'}
              </p>
              {isOwnProfile && (
                <Link to={createPageUrl('Events')}>
                  <Button variant="link" className="text-[#FF1493] mt-2">
                    Find Events →
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Photo Gallery (if multiple photos) */}
        {photos.length > 1 && (
          <div>
            <SectionHeader title={`Photos (${photos.length})`} />
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={cn(
                    'aspect-square rounded-xl overflow-hidden border-2 transition-all',
                    i === photoIndex ? 'border-[#FF1493] scale-[0.98]' : 'border-transparent hover:border-white/20'
                  )}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(profileUser.social_links?.instagram || profileUser.social_links?.twitter || profileUser.social_links?.spotify) && (
          <div>
            <SectionHeader title="Social" />
            <div className="flex flex-wrap gap-3">
              {profileUser.social_links?.instagram && (
                <a 
                  href={`https://instagram.com/${profileUser.social_links.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Instagram className="w-4 h-4 text-white" />
                  <span className="text-sm font-bold text-white">@{profileUser.social_links.instagram}</span>
                </a>
              )}
              {profileUser.social_links?.twitter && (
                <a 
                  href={`https://twitter.com/${profileUser.social_links.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1DA1F2] rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Twitter className="w-4 h-4 text-white" />
                  <span className="text-sm font-bold text-white">@{profileUser.social_links.twitter}</span>
                </a>
              )}
              {profileUser.social_links?.spotify && (
                <a 
                  href={`https://open.spotify.com/user/${profileUser.social_links.spotify}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1DB954] rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Music className="w-4 h-4 text-white" />
                  <span className="text-sm font-bold text-white">Spotify</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Edit Profile button for own profile */}
        {isOwnProfile && (
          <div className="pt-4">
            <Link to={createPageUrl('EditProfile')}>
              <Button variant="outline" className="w-full h-12 font-bold rounded-xl border-white/20">
                <Settings className="w-5 h-5 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
