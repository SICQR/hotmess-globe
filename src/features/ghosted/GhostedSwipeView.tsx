/**
 * GhostedSwipeView - Full-screen Tinder-style swipe cards
 * 
 * Swipe right = Connect/Message
 * Swipe left = Pass
 * Swipe up = Super like (priority)
 * Tap = View profile
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, 
  Heart, 
  Star, 
  MessageCircle, 
  MapPin, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Navigation2,
  Car,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '../profilesGrid/types';
import UberShareButton from './UberShareButton';

interface GhostedSwipeViewProps {
  profiles: Profile[];
  onSwipeRight?: (profile: Profile) => void;
  onSwipeLeft?: (profile: Profile) => void;
  onSwipeUp?: (profile: Profile) => void;
  onViewProfile?: (profile: Profile) => void;
  onMessage?: (profile: Profile) => void;
  viewerLocation?: { lat: number; lng: number } | null;
  viewerEmail?: string;
  viewerName?: string;
  /** Set of profile IDs that have been swiped (controlled by parent) */
  swipedIds?: Set<string>;
  className?: string;
}

interface SwipeCardProps {
  profile: Profile;
  isTop: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  onTap: () => void;
  viewerLocation?: { lat: number; lng: number } | null;
  viewerEmail?: string;
  viewerName?: string;
}

function SwipeCard({ 
  profile, 
  isTop, 
  onSwipeRight, 
  onSwipeLeft, 
  onSwipeUp,
  onTap,
  viewerLocation,
  viewerEmail,
  viewerName
}: SwipeCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Visual feedback based on drag position
  const rotateZ = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superOpacity = useTransform(y, [-100, 0], [1, 0]);
  const scale = useTransform(
    x,
    [-200, 0, 200],
    [0.95, 1, 0.95]
  );

  // Get photo URLs
  const photoUrls = useMemo(() => {
    const urls: string[] = [];
    if (profile.photoUrl) urls.push(profile.photoUrl);
    if (profile.photos) {
      profile.photos.forEach((p) => {
        const url = typeof p === 'string' ? p : p?.url;
        if (url && !urls.includes(url)) urls.push(url);
      });
    }
    if (urls.length === 0) {
      urls.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.profileName || 'U')}&size=800&background=111111&color=ffffff`);
    }
    return urls;
  }, [profile]);

  const currentPhoto = photoUrls[photoIndex] || photoUrls[0];

  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    // Super like (swipe up)
    if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
      setExitY(-1000);
      onSwipeUp();
      return;
    }

    // Like (swipe right)
    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      setExitX(1000);
      onSwipeRight();
      return;
    }

    // Nope (swipe left)
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      setExitX(-1000);
      onSwipeLeft();
      return;
    }
  };

  const nextPhoto = useCallback(() => {
    setPhotoIndex((i) => Math.min(photoUrls.length - 1, i + 1));
  }, [photoUrls.length]);

  const prevPhoto = useCallback(() => {
    setPhotoIndex((i) => Math.max(0, i - 1));
  }, []);

  // Calculate rough distance if we have locations
  const distance = useMemo(() => {
    if (!viewerLocation || !profile.geoLat || !profile.geoLng) return null;
    const R = 6371;
    const dLat = (profile.geoLat - viewerLocation.lat) * Math.PI / 180;
    const dLng = (profile.geoLng - viewerLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(viewerLocation.lat * Math.PI / 180) * Math.cos(profile.geoLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, [viewerLocation, profile.geoLat, profile.geoLng]);

  const distanceText = distance !== null 
    ? distance < 1 
      ? `${Math.round(distance * 1000)}m away`
      : `${distance.toFixed(1)}km away`
    : null;

  const walkTime = distance !== null ? Math.round((distance / 5) * 60) : null;

  return (
    <motion.div
      className={cn(
        'absolute inset-4 md:inset-8 lg:inset-12',
        isTop ? 'z-10' : 'z-0'
      )}
      style={{ x, y, rotateZ, scale }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ 
        scale: isTop ? 1 : 0.95, 
        opacity: isTop ? 1 : 0.7,
        y: isTop ? 0 : 20
      }}
      exit={{ 
        x: exitX, 
        y: exitY,
        opacity: 0,
        transition: { duration: 0.3 }
      }}
    >
      <div 
        className="relative w-full h-full rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl"
        onClick={onTap}
      >
        {/* Photo */}
        <img
          src={currentPhoto}
          alt={profile.profileName}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Photo navigation zones */}
        <div className="absolute inset-0 flex">
          <button
            type="button"
            className="w-1/3 h-full"
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            aria-label="Previous photo"
          />
          <div className="w-1/3 h-full" />
          <button
            type="button"
            className="w-1/3 h-full"
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            aria-label="Next photo"
          />
        </div>

        {/* Photo indicators */}
        {photoUrls.length > 1 && (
          <div className="absolute top-4 inset-x-4 flex gap-1">
            {photoUrls.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex-1 h-1 rounded-full transition-all',
                  idx === photoIndex ? 'bg-white' : 'bg-white/30'
                )}
              />
            ))}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {/* Swipe indicators */}
        {isTop && (
          <>
            {/* LIKE indicator */}
            <motion.div
              className="absolute top-20 right-8 px-6 py-3 border-4 border-green-500 rounded-lg rotate-12"
              style={{ opacity: likeOpacity }}
            >
              <span className="text-3xl font-black text-green-500">LIKE</span>
            </motion.div>

            {/* NOPE indicator */}
            <motion.div
              className="absolute top-20 left-8 px-6 py-3 border-4 border-red-500 rounded-lg -rotate-12"
              style={{ opacity: nopeOpacity }}
            >
              <span className="text-3xl font-black text-red-500">NOPE</span>
            </motion.div>

            {/* SUPER indicator */}
            <motion.div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 px-6 py-3 border-4 border-cyan rounded-lg"
              style={{ opacity: superOpacity }}
            >
              <span className="text-3xl font-black text-cyan">SUPER</span>
            </motion.div>
          </>
        )}

        {/* Profile info */}
        <div className="absolute bottom-0 inset-x-0 p-6">
          {/* Status badges */}
          <div className="flex items-center gap-2 mb-3">
            {profile.rightNow && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-black text-white uppercase">Right Now</span>
              </div>
            )}
            {profile.onlineNow && !profile.rightNow && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-black text-green-500 uppercase">Online</span>
              </div>
            )}
            {distanceText && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-white/20 rounded-full">
                <MapPin className="w-3 h-3 text-pink-500" />
                <span className="text-xs font-bold text-white">{distanceText}</span>
              </div>
            )}
            {walkTime !== null && walkTime <= 30 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan/20 border border-cyan/50 rounded-full">
                <Clock className="w-3 h-3 text-cyan" />
                <span className="text-xs font-bold text-cyan">{walkTime}m walk</span>
              </div>
            )}
          </div>

          {/* Name and details */}
          <div className="mb-4">
            <h2 className="text-4xl font-black text-white mb-1">
              {profile.profileName}
              {profile.age && <span className="text-3xl font-normal text-white/70 ml-2">{profile.age}</span>}
            </h2>
            {profile.title && (
              <p className="text-lg text-white/80">{profile.title}</p>
            )}
            {profile.locationLabel && (
              <p className="text-sm text-white/60 mt-1">{profile.locationLabel}</p>
            )}
          </div>

          {/* Tags */}
          {profile.tags && profile.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs font-bold text-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Quick travel actions */}
          {viewerLocation && profile.geoLat && profile.geoLng && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${profile.geoLat},${profile.geoLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
              >
                <Navigation2 className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">Directions</span>
              </a>
              <UberShareButton
                targetProfile={{
                  id: profile.id,
                  profileName: profile.profileName,
                  email: profile.email,
                  geoLat: profile.geoLat,
                  geoLng: profile.geoLng,
                  locationLabel: profile.locationLabel,
                }}
                viewerLocation={viewerLocation}
                viewerEmail={viewerEmail}
                viewerName={viewerName}
                compact
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function GhostedSwipeView({
  profiles,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  onViewProfile,
  onMessage,
  viewerLocation,
  viewerEmail,
  viewerName,
  swipedIds = new Set(),
  className
}: GhostedSwipeViewProps) {
  // Filter out swiped profiles - parent controls what's swiped via swipedIds prop
  const availableProfiles = useMemo(() => {
    return profiles.filter(p => !swipedIds.has(p.id));
  }, [profiles, swipedIds]);

  const visibleProfiles = useMemo(() => {
    return availableProfiles.slice(0, 3);
  }, [availableProfiles]);

  const currentProfile = availableProfiles[0];

  const handleSwipeRight = useCallback(() => {
    if (!currentProfile) return;
    onSwipeRight?.(currentProfile);
  }, [currentProfile, onSwipeRight]);

  const handleSwipeLeft = useCallback(() => {
    if (!currentProfile) return;
    onSwipeLeft?.(currentProfile);
  }, [currentProfile, onSwipeLeft]);

  const handleSwipeUp = useCallback(() => {
    if (!currentProfile) return;
    onSwipeUp?.(currentProfile);
  }, [currentProfile, onSwipeUp]);

  const handleTap = useCallback(() => {
    if (!currentProfile) return;
    onViewProfile?.(currentProfile);
  }, [currentProfile, onViewProfile]);

  if (profiles.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">👻</div>
          <h3 className="text-2xl font-black text-white mb-2">NO ONE AROUND</h3>
          <p className="text-white/60">Check back later or try a different location</p>
        </div>
      </div>
    );
  }

  if (availableProfiles.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-2xl font-black text-white mb-2">THAT'S EVERYONE</h3>
          <p className="text-white/60 mb-6">You've seen all {profiles.length} profiles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full', className)}>
      {/* Card stack */}
      <div className="relative h-full">
        <AnimatePresence>
          {visibleProfiles.map((profile, idx) => (
            <SwipeCard
              key={profile.id}
              profile={profile}
              isTop={idx === 0}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onSwipeUp={handleSwipeUp}
              onTap={handleTap}
              viewerLocation={viewerLocation}
              viewerEmail={viewerEmail}
              viewerName={viewerName}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-8 inset-x-0 flex items-center justify-center gap-6 z-20">
        <button
          type="button"
          onClick={handleSwipeLeft}
          className="w-16 h-16 bg-black/80 backdrop-blur-sm border-2 border-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:scale-110 transition-all"
          aria-label="Pass"
        >
          <X className="w-8 h-8 text-red-500 hover:text-white" />
        </button>

        <button
          type="button"
          onClick={handleSwipeUp}
          className="w-14 h-14 bg-black/80 backdrop-blur-sm border-2 border-cyan rounded-full flex items-center justify-center hover:bg-cyan hover:scale-110 transition-all"
          aria-label="Super like"
        >
          <Star className="w-6 h-6 text-cyan hover:text-black" />
        </button>

        <button
          type="button"
          onClick={handleSwipeRight}
          className="w-16 h-16 bg-black/80 backdrop-blur-sm border-2 border-green-500 rounded-full flex items-center justify-center hover:bg-green-500 hover:scale-110 transition-all"
          aria-label="Like"
        >
          <Heart className="w-8 h-8 text-green-500 hover:text-white" />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="absolute top-4 inset-x-4 z-20">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{swipedIds.size + 1} / {profiles.length}</span>
        </div>
      </div>
    </div>
  );
}
