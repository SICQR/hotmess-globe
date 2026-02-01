/**
 * ProfileNew - Streamlined, photo-first profile page
 * 
 * Features:
 * - Photo stack hero (swipeable)
 * - Simple vibe bar (music tags + bio)
 * - 3 stats only: Nights Out, Reach, Matches
 * - Activity feed (not empty boxes)
 * - No XP/Level/Badge clutter
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { 
  Camera, MapPin, MessageCircle, Edit3, Settings, 
  ChevronLeft, ChevronRight, Plus, Music, Clock,
  Calendar, Users, Share2, MoreHorizontal, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useAllUsers } from '@/components/utils/queryConfig';
import { createPageUrl } from '../utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Helper to get display name
const getDisplayName = (user) => {
  if (!user) return 'Anonymous';
  return user.display_name || user.full_name || user.username || user.email?.split('@')[0] || 'Anonymous';
};

// Helper to get username
const getUsername = (user) => {
  if (!user) return null;
  return user.username ? `@${user.username}` : null;
};

export default function Profile() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  const uidParam = searchParams.get('uid') || searchParams.get('auth_user_id');
  const queryClient = useQueryClient();
  
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

  // Music/vibe tags
  const vibeTags = useMemo(() => {
    const tags = profileUser?.event_preferences || [];
    return tags.slice(0, 5);
  }, [profileUser]);

  // Navigate photos
  const nextPhoto = () => setPhotoIndex(i => Math.min(photos.length - 1, i + 1));
  const prevPhoto = () => setPhotoIndex(i => Math.max(0, i - 1));

  // Follow mutation
  const isFollowing = following.some(f => f.following_email === userEmail);
  const followMutation = useMutation({
    mutationFn: () => base44.entities.UserFollow.create({
      follower_email: currentUser.email,
      following_email: userEmail
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['profile-followers', userEmail]);
      toast.success('Following!');
    }
  });

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <Camera className="w-8 h-8 text-white/40" />
          </div>
          <h2 className="text-xl font-black mb-2">Profile Not Found</h2>
          <p className="text-white/60 text-sm mb-6">This profile may be private or deleted</p>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Photo Hero */}
      <div className="relative aspect-[3/4] max-h-[70vh] bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
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

            {/* Photo navigation */}
            {photos.length > 1 && (
              <>
                {/* Dots */}
                <div className="absolute top-4 inset-x-4 flex gap-1">
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 h-1 rounded-full transition-colors',
                        i === photoIndex ? 'bg-white' : 'bg-white/30'
                      )}
                    />
                  ))}
                </div>

                {/* Tap zones */}
                <button
                  onClick={prevPhoto}
                  className="absolute left-0 top-0 bottom-0 w-1/3"
                  aria-label="Previous photo"
                />
                <button
                  onClick={nextPhoto}
                  className="absolute right-0 top-0 bottom-0 w-1/3"
                  aria-label="Next photo"
                />
              </>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <p className="text-white/40">No photos yet</p>
              {isOwnProfile && (
                <Button
                  onClick={() => window.location.href = createPageUrl('Settings')}
                  className="mt-4 bg-[#FF1493] hover:bg-[#FF1493]/80"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Photos
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Actions */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {isOwnProfile ? (
            <Link to={createPageUrl('Settings')}>
              <Button size="icon" variant="ghost" className="bg-black/50 backdrop-blur-sm rounded-full">
                <Edit3 className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <Button size="icon" variant="ghost" className="bg-black/50 backdrop-blur-sm rounded-full">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Name & Info - overlaid on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black">
                {getDisplayName(profileUser)}
                {profileUser.age && <span className="text-white/60 font-normal ml-2">{profileUser.age}</span>}
              </h1>
              {getUsername(profileUser) && (
                <p className="text-white/60 text-sm font-mono">{getUsername(profileUser)}</p>
              )}
              {profileUser.city && (
                <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {profileUser.city}
                </p>
              )}
            </div>

            {!isOwnProfile && (
              <Button
                onClick={() => followMutation.mutate()}
                disabled={isFollowing || followMutation.isLoading}
                className={cn(
                  'rounded-full font-black',
                  isFollowing
                    ? 'bg-white/10 text-white'
                    : 'bg-[#FF1493] hover:bg-[#FF1493]/80 text-white'
                )}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-6 space-y-6">
        {/* Bio / Vibe Bar */}
        {(profileUser.bio || vibeTags.length > 0) && (
          <div className="space-y-3">
            {profileUser.bio && (
              <p className="text-white/80 text-sm leading-relaxed">{profileUser.bio}</p>
            )}
            {vibeTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {vibeTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-xs font-bold uppercase bg-white/5 border border-white/10 rounded-full text-white/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats - Just 3 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-[#FF1493]">{checkIns.length}</div>
            <div className="text-xs text-white/40 uppercase">Nights Out</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-[#00D9FF]">{profileViews.length || followers.length}</div>
            <div className="text-xs text-white/40 uppercase">{isOwnProfile ? 'Reach' : 'Followers'}</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <div className="text-2xl font-black text-[#39FF14]">{following.length}</div>
            <div className="text-xs text-white/40 uppercase">Following</div>
          </div>
        </div>

        {/* Action buttons for others */}
        {!isOwnProfile && (
          <div className="flex gap-3">
            <Button
              onClick={() => window.location.href = createPageUrl(`Messages?to=${userEmail}`)}
              className="flex-1 bg-white/10 hover:bg-white/20"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        )}

        {/* Activity / Recent */}
        <div>
          <h2 className="text-sm font-black uppercase text-white/40 mb-4">Recent</h2>
          
          {checkIns.length > 0 ? (
            <div className="space-y-3">
              {checkIns.slice(0, 5).map((checkIn) => (
                <Link 
                  key={checkIn.id}
                  to={createPageUrl(`BeaconDetail?id=${checkIn.beacon_id}`)}
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{checkIn.beacon_title}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(checkIn.created_date), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/20" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm mb-1">
                {isOwnProfile ? 'Your story starts tonight' : 'No activity yet'}
              </p>
              {isOwnProfile && (
                <Link to={createPageUrl('Pulse')}>
                  <Button variant="link" className="text-[#FF1493]">
                    Find Events →
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Edit Profile button for own profile */}
        {isOwnProfile && (
          <Link to={createPageUrl('Settings')}>
            <Button variant="outline" className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
