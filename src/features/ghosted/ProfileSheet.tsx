/**
 * ProfileSheet - Bottom sheet profile view
 * 
 * Features:
 * - Swipe down to dismiss
 * - Swipeable photo gallery
 * - Travel time chips
 * - Uber book + share button
 * - Message button
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, MessageCircle, Heart, MapPin, Clock, 
  Car, Bike, Footprints, Train, ChevronLeft, ChevronRight,
  Share2, Shield, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GrindrProfile } from './GrindrCard';

interface TravelTime {
  mode: 'walk' | 'drive' | 'bike' | 'transit';
  minutes: number;
}

interface ProfileSheetProps {
  profile: GrindrProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onMessage: (profile: GrindrProfile) => void;
  onUber: (profile: GrindrProfile) => void;
  onFavorite?: (profile: GrindrProfile) => void;
  travelTimes?: TravelTime[];
  viewerLocation?: { lat: number; lng: number } | null;
  currentUserEmail?: string;
  currentUserName?: string;
}

// Get all photos
function getPhotos(profile: GrindrProfile): string[] {
  const urls: string[] = [];
  if (profile.photoUrl) urls.push(profile.photoUrl);
  if (profile.avatar_url && !urls.includes(profile.avatar_url)) urls.push(profile.avatar_url);
  if (profile.photos) {
    profile.photos.forEach(p => {
      const url = typeof p === 'string' ? p : p?.url;
      if (url && !urls.includes(url)) urls.push(url);
    });
  }
  if (urls.length === 0) {
    urls.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.profileName || 'U')}&size=800&background=111&color=fff`);
  }
  return urls;
}

// Get display name
function getDisplayName(profile: GrindrProfile): string {
  return profile.display_name || profile.profileName || profile.full_name || profile.username || 'Anonymous';
}

// Mode icons
const ModeIcon = ({ mode }: { mode: string }) => {
  switch (mode) {
    case 'walk': return <Footprints className="w-4 h-4" />;
    case 'drive': return <Car className="w-4 h-4" />;
    case 'bike': return <Bike className="w-4 h-4" />;
    case 'transit': return <Train className="w-4 h-4" />;
    default: return <Footprints className="w-4 h-4" />;
  }
};

export default function ProfileSheet({
  profile,
  isOpen,
  onClose,
  onMessage,
  onUber,
  onFavorite,
  travelTimes = [],
  viewerLocation,
  currentUserEmail,
  currentUserName,
}: ProfileSheetProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showUberConfirm, setShowUberConfirm] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  const photos = useMemo(() => (profile ? getPhotos(profile) : []), [profile]);
  const name = useMemo(() => (profile ? getDisplayName(profile) : ''), [profile]);

  // Reset photo index when profile changes
  React.useEffect(() => {
    setPhotoIndex(0);
    setShowUberConfirm(false);
  }, [profile?.id]);

  // Photo navigation
  const nextPhoto = useCallback(() => {
    setPhotoIndex(i => Math.min(photos.length - 1, i + 1));
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    setPhotoIndex(i => Math.max(0, i - 1));
  }, []);

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 200) {
      onClose();
    }
  };

  // Handle Uber book
  const handleUberBook = () => {
    if (!profile) return;
    setShowUberConfirm(false);
    onUber(profile);
  };

  if (!profile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y, opacity }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-black rounded-t-3xl overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo gallery */}
            <div className="relative aspect-square bg-zinc-900">
              <AnimatePresence mode="wait">
                <motion.img
                  key={photoIndex}
                  src={photos[photoIndex]}
                  alt={name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Photo indicators */}
              {photos.length > 1 && (
                <div className="absolute top-3 inset-x-3 flex gap-1">
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 h-0.5 rounded-full transition-colors',
                        i === photoIndex ? 'bg-white' : 'bg-white/30'
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Tap zones for photo navigation */}
              {photos.length > 1 && (
                <>
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

              {/* Online indicator */}
              {profile.onlineNow && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                  <span className="text-xs font-bold text-[#39FF14]">Online</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto pb-8">
              {/* Name & basic info */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black">
                    {name}
                    {profile.age && <span className="text-white/50 font-normal ml-2">{profile.age}</span>}
                  </h2>
                  {profile.geoLat && (
                    <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {profile.distanceMeters ? `${Math.round(profile.distanceMeters)}m away` : 'Nearby'}
                    </p>
                  )}
                </div>

                {/* Favorite button */}
                {onFavorite && (
                  <button
                    onClick={() => onFavorite(profile)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <Heart className="w-6 h-6 text-white/60 hover:text-[#FF1493]" />
                  </button>
                )}
              </div>

              {/* Travel times */}
              {travelTimes.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  {travelTimes.map((tt) => (
                    <div
                      key={tt.mode}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-full border whitespace-nowrap',
                        tt.mode === 'walk' ? 'bg-[#39FF14]/10 border-[#39FF14]/30 text-[#39FF14]' :
                        tt.mode === 'drive' ? 'bg-[#00D9FF]/10 border-[#00D9FF]/30 text-[#00D9FF]' :
                        tt.mode === 'bike' ? 'bg-[#FF6B35]/10 border-[#FF6B35]/30 text-[#FF6B35]' :
                        'bg-[#B026FF]/10 border-[#B026FF]/30 text-[#B026FF]'
                      )}
                    >
                      <ModeIcon mode={tt.mode} />
                      <span className="text-sm font-bold">{tt.minutes} min</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => onMessage(profile)}
                  className="flex-1 h-12 bg-[#FF1493] hover:bg-[#FF1493]/80 text-white font-black rounded-xl"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message
                </Button>

                <Button
                  onClick={() => setShowUberConfirm(true)}
                  variant="outline"
                  className="flex-1 h-12 border-white/20 hover:bg-white/10 font-black rounded-xl"
                >
                  <Car className="w-5 h-5 mr-2" />
                  Uber
                </Button>
              </div>

              {/* Uber confirmation */}
              <AnimatePresence>
                {showUberConfirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-[#00D9FF]">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold">Safe Trip</span>
                      </div>
                      <p className="text-sm text-white/70">Booking will:</p>
                      <ul className="text-sm text-white/70 space-y-1">
                        <li className="flex items-center gap-2">
                          <Navigation className="w-3 h-3 text-[#00D9FF]" />
                          Open Uber with {name}'s location
                        </li>
                        <li className="flex items-center gap-2">
                          <Share2 className="w-3 h-3 text-[#00D9FF]" />
                          Share trip details with {name}
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-[#00D9FF]" />
                          Notify your trusted contacts
                        </li>
                      </ul>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => setShowUberConfirm(false)}
                          variant="ghost"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUberBook}
                          className="flex-1 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-black"
                        >
                          Book & Share
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
