/**
 * ProfileSheet - Full profile bottom sheet
 * 
 * Features:
 * - Photo gallery with thumbnails
 * - Bio, tags, interests
 * - Stats (followers, check-ins)
 * - Travel time chips
 * - Uber book + share
 * - Message button
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, MessageCircle, Heart, MapPin, Clock, 
  Car, Bike, Footprints, Train, ChevronDown,
  Share2, Shield, Navigation, Music, Sparkles,
  Users, Calendar, Eye, Star, Ruler, Briefcase,
  Home, Globe, Instagram, Twitter
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

// Extended profile type for full data
interface ExtendedProfile extends GrindrProfile {
  bio?: string;
  title?: string;
  locationLabel?: string;
  interests?: string[];
  tags?: string[];
  musicTags?: string[];
  lookingFor?: string[];
  height?: string;
  pronouns?: string;
  job?: string;
  instagram?: string;
  twitter?: string;
  spotify?: string;
  followers?: number;
  following?: number;
  checkIns?: number;
  profileViews?: number;
  matchProbability?: number;
  verifiedAt?: string;
}

// Get all photos
function getPhotos(profile: ExtendedProfile): string[] {
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
function getDisplayName(profile: ExtendedProfile): string {
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

// Tag pill component
function TagPill({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'music' | 'interest' | 'looking' }) {
  const colors = {
    default: 'bg-white/10 text-white/80 border-white/10',
    music: 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30',
    interest: 'bg-[#FF1493]/10 text-[#FF1493] border-[#FF1493]/30',
    looking: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30',
  };
  
  return (
    <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', colors[variant])}>
      {children}
    </span>
  );
}

// Stat item component
function StatItem({ icon: Icon, value, label }: { icon: any; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="w-4 h-4 text-white/40" />
      <span className="text-lg font-black">{value}</span>
      <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
    </div>
  );
}

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
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  // Cast to extended profile for full data access
  const p = profile as ExtendedProfile | null;
  
  const photos = useMemo(() => (p ? getPhotos(p) : []), [p]);
  const name = useMemo(() => (p ? getDisplayName(p) : ''), [p]);
  
  // Extract tags
  const interests = useMemo(() => p?.interests || p?.tags || [], [p]);
  const musicTags = useMemo(() => p?.musicTags || [], [p]);
  const lookingFor = useMemo(() => p?.lookingFor || [], [p]);

  // Reset photo index when profile changes
  React.useEffect(() => {
    setPhotoIndex(0);
    setShowUberConfirm(false);
    setShowAllPhotos(false);
  }, [p?.id]);

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
    if (!p) return;
    setShowUberConfirm(false);
    onUber(p);
  };

  if (!p) return null;

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
            className="fixed inset-x-0 bottom-0 z-50 h-[95vh] bg-zinc-950 rounded-t-3xl overflow-hidden flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Photo gallery */}
              <div className="relative aspect-[4/5] bg-zinc-900">
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
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={cn(
                          'flex-1 h-1 rounded-full transition-colors',
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

                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

                {/* Name overlay on photo */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-3xl font-black text-white drop-shadow-lg">
                        {name}
                        {p.age && <span className="text-white/70 font-normal ml-2">{p.age}</span>}
                      </h2>
                      <div className="flex items-center gap-3 mt-1 text-white/70">
                        {p.locationLabel && (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            {p.locationLabel}
                          </span>
                        )}
                        {p.distanceMeters && (
                          <span className="text-sm">
                            {p.distanceMeters < 1000 
                              ? `${Math.round(p.distanceMeters)}m`
                              : `${(p.distanceMeters / 1000).toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Online / Match indicator */}
                    <div className="flex flex-col items-end gap-2">
                      {p.onlineNow && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                          <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                          <span className="text-xs font-bold text-[#39FF14]">Online</span>
                        </div>
                      )}
                      {p.matchProbability && p.matchProbability > 70 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-[#FF1493]/20 backdrop-blur-sm rounded-full">
                          <Sparkles className="w-3 h-3 text-[#FF1493]" />
                          <span className="text-xs font-bold text-[#FF1493]">{p.matchProbability}% Match</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo thumbnails */}
              {photos.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={cn(
                        'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                        i === photoIndex ? 'border-[#FF1493] scale-105' : 'border-transparent opacity-60'
                      )}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-6">
                {/* Travel times */}
                {travelTimes.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
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

                {/* Action buttons - sticky feel */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => onMessage(p)}
                    className="flex-1 h-12 bg-[#FF1493] hover:bg-[#FF1493]/80 text-white font-black rounded-xl"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Message
                  </Button>

                  <Button
                    onClick={() => setShowUberConfirm(true)}
                    variant="outline"
                    className="h-12 px-6 border-white/20 hover:bg-white/10 font-black rounded-xl"
                  >
                    <Car className="w-5 h-5" />
                  </Button>

                  {onFavorite && (
                    <Button
                      onClick={() => onFavorite(p)}
                      variant="outline"
                      className="h-12 px-6 border-white/20 hover:bg-white/10 font-black rounded-xl"
                    >
                      <Heart className="w-5 h-5" />
                    </Button>
                  )}
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
                        <ul className="text-sm text-white/70 space-y-2">
                          <li className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-[#00D9FF]" />
                            Open Uber to {name}'s location
                          </li>
                          <li className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-[#00D9FF]" />
                            Share trip with {name}
                          </li>
                          <li className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#00D9FF]" />
                            Notify trusted contacts
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

                {/* Bio */}
                {(p.bio || p.title) && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">About</h3>
                    <p className="text-white/90 leading-relaxed">
                      {p.bio || p.title}
                    </p>
                  </div>
                )}

                {/* Basic info */}
                {(p.pronouns || p.height || p.job) && (
                  <div className="flex flex-wrap gap-3">
                    {p.pronouns && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Users className="w-4 h-4" />
                        {p.pronouns}
                      </div>
                    )}
                    {p.height && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Ruler className="w-4 h-4" />
                        {p.height}
                      </div>
                    )}
                    {p.job && (
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Briefcase className="w-4 h-4" />
                        {p.job}
                      </div>
                    )}
                  </div>
                )}

                {/* Interests / Tags */}
                {interests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((tag, i) => (
                        <TagPill key={i} variant="interest">{tag}</TagPill>
                      ))}
                    </div>
                  </div>
                )}

                {/* Music tags */}
                {musicTags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                      <Music className="w-4 h-4 text-[#1DB954]" />
                      Music
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {musicTags.map((tag, i) => (
                        <TagPill key={i} variant="music">{tag}</TagPill>
                      ))}
                    </div>
                  </div>
                )}

                {/* Looking for */}
                {lookingFor.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Looking For</h3>
                    <div className="flex flex-wrap gap-2">
                      {lookingFor.map((item, i) => (
                        <TagPill key={i} variant="looking">{item}</TagPill>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {(p.followers !== undefined || p.checkIns !== undefined || p.profileViews !== undefined) && (
                  <div className="grid grid-cols-4 gap-4 py-4 border-t border-b border-white/10">
                    {p.followers !== undefined && (
                      <StatItem icon={Users} value={p.followers} label="Followers" />
                    )}
                    {p.following !== undefined && (
                      <StatItem icon={Heart} value={p.following} label="Following" />
                    )}
                    {p.checkIns !== undefined && (
                      <StatItem icon={Calendar} value={p.checkIns} label="Check-ins" />
                    )}
                    {p.profileViews !== undefined && (
                      <StatItem icon={Eye} value={p.profileViews} label="Views" />
                    )}
                  </div>
                )}

                {/* Social links */}
                {(p.instagram || p.twitter || p.spotify) && (
                  <div className="flex gap-4 justify-center py-2">
                    {p.instagram && (
                      <a 
                        href={`https://instagram.com/${p.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex items-center justify-center"
                      >
                        <Instagram className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {p.twitter && (
                      <a 
                        href={`https://twitter.com/${p.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center"
                      >
                        <Twitter className="w-5 h-5 text-white" />
                      </a>
                    )}
                    {p.spotify && (
                      <a 
                        href={`https://open.spotify.com/user/${p.spotify}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center"
                      >
                        <Music className="w-5 h-5 text-white" />
                      </a>
                    )}
                  </div>
                )}

                {/* Bottom padding for safe area */}
                <div className="h-8" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
