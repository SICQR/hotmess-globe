/**
 * ProfileSheet - Rich profile bottom sheet
 * 
 * Sections:
 * 1. Hero - Full photo gallery with dots
 * 2. Identity - Name, age, verified, location, online status
 * 3. Quick Actions - Message, Uber, Favorite
 * 4. Travel Times - Walk/Drive/Bike chips
 * 5. About - Bio, basic info (pronouns, height, job)
 * 6. Vibe - Music tags, interests, looking for
 * 7. Stats - Followers, check-ins, views
 * 8. Social - Instagram, Twitter, Spotify
 * 9. Recent Activity - Last seen, recent check-ins
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  X, MessageCircle, Heart, MapPin, 
  Car, Bike, Footprints, Train,
  Share2, Shield, Navigation, Music, Sparkles,
  Users, Calendar, Eye, Ruler, Briefcase,
  Instagram, Twitter, Check, Crown, Star, Zap,
  Clock, ExternalLink, Copy, MoreHorizontal,
  Flag, Ban, UserX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  onBlock?: (profile: GrindrProfile) => void;
  onReport?: (profile: GrindrProfile) => void;
  travelTimes?: TravelTime[];
  viewerLocation?: { lat: number; lng: number } | null;
  currentUserEmail?: string;
  currentUserName?: string;
  isFavorited?: boolean;
}

// Extended profile type
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
  verified?: boolean;
  membership?: 'free' | 'plus' | 'chrome';
  profileType?: 'standard' | 'creator' | 'seller' | 'host' | 'dj';
  lastActive?: string;
  recentCheckIns?: Array<{ title: string; date: string }>;
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
    urls.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.profileName || 'U')}&size=800&background=1a1a1a&color=fff&bold=true`);
  }
  return urls;
}

// Get display name
function getDisplayName(profile: ExtendedProfile): string {
  return profile.display_name || profile.profileName || profile.full_name || profile.username || 'Anonymous';
}

// Mode icons
const ModeIcon = ({ mode }: { mode: string }) => {
  const icons: Record<string, any> = {
    walk: Footprints,
    drive: Car,
    bike: Bike,
    transit: Train,
  };
  const Icon = icons[mode] || Footprints;
  return <Icon className="w-4 h-4" />;
};

// Profile type config
const profileTypes: Record<string, { icon: any; color: string; label: string }> = {
  creator: { icon: Star, color: '#FFD700', label: 'Creator' },
  seller: { icon: Sparkles, color: '#FF6B35', label: 'Seller' },
  host: { icon: Crown, color: '#B026FF', label: 'Host' },
  dj: { icon: Zap, color: '#00D9FF', label: 'DJ' },
};

// Section header
function SectionHeader({ title, icon: Icon }: { title: string; icon?: any }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-4 h-4 text-white/40" />}
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">{title}</h3>
    </div>
  );
}

// Tag pill
function TagPill({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'music' | 'interest' | 'looking' }) {
  const styles = {
    default: 'bg-white/10 text-white/80 border-white/10',
    music: 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30',
    interest: 'bg-[#FF1493]/10 text-[#FF1493] border-[#FF1493]/30',
    looking: 'bg-[#00D9FF]/10 text-[#00D9FF] border-[#00D9FF]/30',
  };
  
  return (
    <span className={cn('px-3 py-1.5 rounded-full text-xs font-bold border inline-flex items-center gap-1', styles[variant])}>
      {children}
    </span>
  );
}

// Stat card
function StatCard({ icon: Icon, value, label, color = '#FF1493' }: { icon: any; value: number | string; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 bg-white/5 rounded-xl">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-xl font-black">{value}</span>
      <span className="text-[9px] text-white/40 uppercase tracking-wider">{label}</span>
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
  onBlock,
  onReport,
  travelTimes = [],
  viewerLocation,
  currentUserEmail,
  currentUserName,
  isFavorited = false,
}: ProfileSheetProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showUberConfirm, setShowUberConfirm] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(isFavorited);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  const p = profile as ExtendedProfile | null;
  
  const photos = useMemo(() => (p ? getPhotos(p) : []), [p]);
  const name = useMemo(() => (p ? getDisplayName(p) : ''), [p]);
  const interests = useMemo(() => p?.interests || p?.tags || [], [p]);
  const musicTags = useMemo(() => p?.musicTags || [], [p]);
  const lookingFor = useMemo(() => p?.lookingFor || [], [p]);
  const profileType = p?.profileType && p.profileType !== 'standard' ? profileTypes[p.profileType] : null;

  // Reset state when profile changes
  React.useEffect(() => {
    setPhotoIndex(0);
    setShowUberConfirm(false);
    setShowMoreActions(false);
    setLocalFavorited(isFavorited);
  }, [p?.id, isFavorited]);

  // Photo navigation
  const nextPhoto = useCallback(() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1)), [photos.length]);
  const prevPhoto = useCallback(() => setPhotoIndex(i => Math.max(0, i - 1)), []);

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

  // Handle favorite
  const handleFavorite = () => {
    if (!p || !onFavorite) return;
    setLocalFavorited(!localFavorited);
    onFavorite(p);
  };

  // Copy profile link
  const handleCopyLink = () => {
    if (!p) return;
    const url = `${window.location.origin}/social/u/${p.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Profile link copied!');
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
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
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
              <div className="w-12 h-1 rounded-full bg-white/30" />
            </div>

            {/* Header buttons */}
            <div className="absolute top-4 right-4 z-30 flex gap-2">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* More actions dropdown */}
            <AnimatePresence>
              {showMoreActions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-16 right-4 z-40 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                >
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <Copy className="w-4 h-4 text-white/60" />
                    <span className="text-sm">Copy Profile Link</span>
                  </button>
                  <button
                    onClick={() => window.open(`/social/u/${p.id}`, '_blank')}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <ExternalLink className="w-4 h-4 text-white/60" />
                    <span className="text-sm">Open Full Profile</span>
                  </button>
                  <div className="border-t border-white/10" />
                  {onBlock && (
                    <button
                      onClick={() => { onBlock(p); setShowMoreActions(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left text-white/60"
                    >
                      <Ban className="w-4 h-4" />
                      <span className="text-sm">Block</span>
                    </button>
                  )}
                  {onReport && (
                    <button
                      onClick={() => { onReport(p); setShowMoreActions(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-colors text-left text-red-400"
                    >
                      <Flag className="w-4 h-4" />
                      <span className="text-sm">Report</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
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
                    <button onClick={prevPhoto} className="absolute left-0 top-0 bottom-0 w-1/3" aria-label="Previous" />
                    <button onClick={nextPhoto} className="absolute right-0 top-0 bottom-0 w-1/3" aria-label="Next" />
                  </>
                )}

                {/* Gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />

                {/* Identity overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      {/* Profile type badge */}
                      {profileType && (
                        <div 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md mb-2"
                          style={{ backgroundColor: `${profileType.color}20` }}
                        >
                          <profileType.icon className="w-3 h-3" style={{ color: profileType.color }} />
                          <span className="text-[10px] font-bold uppercase" style={{ color: profileType.color }}>
                            {profileType.label}
                          </span>
                        </div>
                      )}

                      {/* Name & verification */}
                      <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-white truncate">{name}</h2>
                        {p.verified && (
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00D9FF] flex items-center justify-center">
                            <Check className="w-4 h-4 text-black" strokeWidth={3} />
                          </div>
                        )}
                        {p.age && <span className="text-2xl text-white/50 font-normal">{p.age}</span>}
                      </div>

                      {/* Location & status */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {p.locationLabel && (
                          <span className="flex items-center gap-1 text-sm text-white/60">
                            <MapPin className="w-3 h-3" />
                            {p.locationLabel}
                          </span>
                        )}
                        {p.distanceMeters && (
                          <span className="text-sm text-white/40">
                            {p.distanceMeters < 1000 
                              ? `${Math.round(p.distanceMeters)}m away`
                              : `${(p.distanceMeters / 1000).toFixed(1)}km away`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Online status */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {p.onlineNow && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-[#39FF14]/20 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                          <span className="text-xs font-bold text-[#39FF14]">Online</span>
                        </div>
                      )}
                      {p.matchProbability && p.matchProbability > 70 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-[#FF1493]/20 rounded-full">
                          <Sparkles className="w-3 h-3 text-[#FF1493]" />
                          <span className="text-xs font-bold text-[#FF1493]">{p.matchProbability}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content sections */}
              <div className="p-4 space-y-6">
                {/* Travel times */}
                {travelTimes.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                    {travelTimes.map((tt) => (
                      <div
                        key={tt.mode}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-full border whitespace-nowrap flex-shrink-0',
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

                {/* Quick actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => onMessage(p)}
                    variant="hot"
                    className="flex-1 h-12 font-black rounded-xl"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Message
                  </Button>

                  <Button
                    onClick={() => setShowUberConfirm(true)}
                    variant="outline"
                    className="h-12 px-5 border-white/20 hover:bg-white/10 font-black rounded-xl"
                  >
                    <Car className="w-5 h-5" />
                  </Button>

                  {onFavorite && (
                    <Button
                      onClick={handleFavorite}
                      variant="outline"
                      className={cn(
                        'h-12 px-5 border-white/20 font-black rounded-xl transition-colors',
                        localFavorited ? 'bg-[#FF1493]/20 border-[#FF1493]/50 text-[#FF1493]' : 'hover:bg-white/10'
                      )}
                    >
                      <Heart className={cn('w-5 h-5', localFavorited && 'fill-current')} />
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
                            Opens Uber to {name}'s location
                          </li>
                          <li className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-[#00D9FF]" />
                            Trip details shared with them
                          </li>
                          <li className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#00D9FF]" />
                            Trusted contacts notified
                          </li>
                        </ul>
                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => setShowUberConfirm(false)} variant="ghost" className="flex-1">
                            Cancel
                          </Button>
                          <Button onClick={handleUberBook} className="flex-1 bg-[#00D9FF] hover:bg-[#00D9FF]/80 text-black font-black">
                            Book & Share
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* About section */}
                {(p.bio || p.title || p.pronouns || p.height || p.job) && (
                  <div>
                    <SectionHeader title="About" />
                    {(p.bio || p.title) && (
                      <p className="text-white/80 text-sm leading-relaxed mb-3">{p.bio || p.title}</p>
                    )}
                    {(p.pronouns || p.height || p.job) && (
                      <div className="flex flex-wrap gap-3">
                        {p.pronouns && (
                          <div className="flex items-center gap-2 text-sm text-white/50">
                            <Users className="w-4 h-4" />
                            {p.pronouns}
                          </div>
                        )}
                        {p.height && (
                          <div className="flex items-center gap-2 text-sm text-white/50">
                            <Ruler className="w-4 h-4" />
                            {p.height}
                          </div>
                        )}
                        {p.job && (
                          <div className="flex items-center gap-2 text-sm text-white/50">
                            <Briefcase className="w-4 h-4" />
                            {p.job}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Interests */}
                {interests.length > 0 && (
                  <div>
                    <SectionHeader title="Interests" icon={Sparkles} />
                    <div className="flex flex-wrap gap-2">
                      {interests.slice(0, 8).map((tag, i) => (
                        <TagPill key={i} variant="interest">{tag}</TagPill>
                      ))}
                    </div>
                  </div>
                )}

                {/* Music */}
                {musicTags.length > 0 && (
                  <div>
                    <SectionHeader title="Music" icon={Music} />
                    <div className="flex flex-wrap gap-2">
                      {musicTags.slice(0, 6).map((tag, i) => (
                        <TagPill key={i} variant="music">{tag}</TagPill>
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
                {(p.followers !== undefined || p.checkIns !== undefined || p.profileViews !== undefined) && (
                  <div className="grid grid-cols-3 gap-3">
                    {p.followers !== undefined && (
                      <StatCard icon={Users} value={p.followers} label="Followers" color="#FF1493" />
                    )}
                    {p.checkIns !== undefined && (
                      <StatCard icon={Calendar} value={p.checkIns} label="Check-ins" color="#00D9FF" />
                    )}
                    {p.profileViews !== undefined && (
                      <StatCard icon={Eye} value={p.profileViews} label="Views" color="#39FF14" />
                    )}
                  </div>
                )}

                {/* Social links */}
                {(p.instagram || p.twitter || p.spotify) && (
                  <div>
                    <SectionHeader title="Social" />
                    <div className="flex gap-3">
                      {p.instagram && (
                        <a 
                          href={`https://instagram.com/${p.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] rounded-lg hover:opacity-90 transition-opacity"
                        >
                          <Instagram className="w-4 h-4 text-white" />
                          <span className="text-sm font-bold text-white">@{p.instagram}</span>
                        </a>
                      )}
                      {p.twitter && (
                        <a 
                          href={`https://twitter.com/${p.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] rounded-lg hover:opacity-90 transition-opacity"
                        >
                          <Twitter className="w-4 h-4 text-white" />
                          <span className="text-sm font-bold text-white">@{p.twitter}</span>
                        </a>
                      )}
                      {p.spotify && (
                        <a 
                          href={`https://open.spotify.com/user/${p.spotify}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] rounded-lg hover:opacity-90 transition-opacity"
                        >
                          <Music className="w-4 h-4 text-white" />
                          <span className="text-sm font-bold text-white">Spotify</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Last active */}
                {p.lastActive && (
                  <div className="flex items-center gap-2 text-xs text-white/40 pt-2">
                    <Clock className="w-3 h-3" />
                    <span>Last active {p.lastActive}</span>
                  </div>
                )}

                {/* Bottom padding */}
                <div className="h-8" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
