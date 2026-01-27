import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { MapPin, Zap, Crown, Sparkles, Play, ChevronLeft, ChevronRight, Heart, MessageCircle, Navigation } from 'lucide-react';
import CompatibilityBadge, { calculateCompatibility } from './CompatibilityBadge';
import ReportButton from '../moderation/ReportButton';
import LazyImage from '../ui/LazyImage';
import AIMatchExplanation from './AIMatchExplanation';
import { useRecordInteraction, getScoreExplanation, getDistanceLabel } from '@/hooks/useRecommendations';
import { MatchBadge, OnlineIndicator } from '@/components/ui/StatusBadge';
import { MatchBreakdownCard } from '@/components/match/MatchBreakdownCard';
import { SmartTravelSelector } from '@/components/travel/SmartTravelSelector';
import { buildUberDeepLink, buildLyftDeepLink } from '@/utils/uberDeepLink';
import { Button } from '@/components/ui/button';

const getUserPhotoUrls = (user) => {
  const urls = [];
  const push = (value) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return;
    if (urls.includes(url)) return;
    urls.push(url);
  };

  const photos = Array.isArray(user?.photos) ? user.photos : [];
  for (const item of photos) {
    if (typeof item === 'string') push(item);
    else if (item && typeof item === 'object') push(item.url || item.file_url || item.href);
  }

  push(user?.avatar_url);
  push(user?.avatarUrl);

  const more = Array.isArray(user?.photo_urls) ? user.photo_urls : [];
  for (const u of more) push(u);

  return urls.filter(Boolean).slice(0, 5);
};

const formatDistance = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return null;
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
  return `${Math.round(distanceKm)}km`;
};

const formatEta = (etaSeconds) => {
  if (!Number.isFinite(etaSeconds) || etaSeconds <= 0) return null;
  const minutes = Math.round(etaSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
};

export default function DiscoveryCard({ user, userTags = [], userTribes = [], currentUserTags = [], index, aiMatchExplanation }) {
  const [isHovering, setIsHovering] = useState(false);
  const [viewStartTime, setViewStartTime] = useState(null);
  const recordInteraction = useRecordInteraction();
  const navigate = useNavigate();

  // Travel navigation handlers
  const hasLocation = Number.isFinite(user?.last_lat || user?.lat) && Number.isFinite(user?.last_lng || user?.lng);
  const lat = user?.last_lat || user?.lat;
  const lng = user?.last_lng || user?.lng;
  const userName = user?.username || user?.display_name || 'User';

  const openDirections = useCallback((mode = 'foot') => {
    if (!hasLocation) return;
    const qs = new URLSearchParams();
    qs.set('lat', String(lat));
    qs.set('lng', String(lng));
    qs.set('label', userName);
    qs.set('mode', mode);
    navigate(`/directions?${qs.toString()}`);
  }, [hasLocation, lat, lng, userName, navigate]);

  const openUber = useCallback(() => {
    if (!hasLocation) return;
    const url = buildUberDeepLink({ dropoffLat: lat, dropoffLng: lng, dropoffNickname: userName });
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, [hasLocation, lat, lng, userName]);

  const openLyft = useCallback(() => {
    if (!hasLocation) return;
    const url = buildLyftDeepLink({ dropoffLat: lat, dropoffLng: lng, dropoffNickname: userName });
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, [hasLocation, lat, lng, userName]);
  
  // Track view interactions
  useEffect(() => {
    if (isHovering && !viewStartTime) {
      setViewStartTime(Date.now());
    } else if (!isHovering && viewStartTime) {
      const durationSeconds = Math.round((Date.now() - viewStartTime) / 1000);
      if (durationSeconds > 2) { // Only record if viewed for more than 2 seconds
        recordInteraction.mutate({
          targetEmail: user?.email,
          interactionType: 'view',
          metadata: { durationSeconds, distanceKm: user?.distanceKm },
        });
      }
      setViewStartTime(null);
    }
  }, [isHovering]);
  
  // Recommendation score from enhanced API - prefer matchProbability from match-probability API
  const matchScore = user?.matchProbability ?? user?.scores?.overall ?? user?.match_percentage;
  const matchBreakdown = user?.matchBreakdown ?? null;
  const scoreExplanation = user?.scores ? getScoreExplanation(user.scores) : null;
  const compatibility = useMemo(() => calculateCompatibility(currentUserTags, userTags), [currentUserTags, userTags]);
  const essentials = useMemo(() => userTags.filter(t => t.is_essential), [userTags]);
  const nonEssentialTags = useMemo(() => userTags.filter(t => !t.is_essential && !t.is_dealbreaker), [userTags]);
  const dealbreakerTags = useMemo(() => userTags.filter(t => t.is_dealbreaker), [userTags]);
  const topTribes = useMemo(() => userTribes.slice(0, 2), [userTribes]);

  const lookingFor = useMemo(() => {
    const raw = user?.lookingFor ?? user?.looking_for;
    return Array.isArray(raw) ? raw : [];
  }, [user?.lookingFor, user?.looking_for]);

  const meetAt = useMemo(() => {
    const raw = user?.meetAt ?? user?.meet_at;
    return Array.isArray(raw) ? raw : [];
  }, [user?.meetAt, user?.meet_at]);

  const communicationStyle = useMemo(() => {
    const raw = user?.communicationStyle ?? user?.preferred_communication;
    return Array.isArray(raw) ? raw : [];
  }, [user?.communicationStyle, user?.preferred_communication]);

  const distanceLabel = useMemo(() => formatDistance(user?.distanceKm), [user?.distanceKm]);
  const etaLabel = useMemo(() => formatEta(user?.etaSeconds), [user?.etaSeconds]);
  const etaMode = user?.etaMode ? String(user.etaMode).toLowerCase() : null;

  const photoUrls = useMemo(() => getUserPhotoUrls(user), [user]);
  const primaryPhotoUrl = photoUrls[0] || null;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const hasMultiplePhotos = photoUrls.length > 1;

  // Reset photo index when not hovering
  useEffect(() => {
    if (!isHovering) setCurrentPhotoIndex(0);
  }, [isHovering]);

  const nextPhoto = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % photoUrls.length);
  }, [photoUrls.length]);

  const prevPhoto = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length);
  }, [photoUrls.length]);

  const isOnline = user?.online_now || user?.onlineNow;
  const isRightNow = user?.right_now_active || user?.rightNow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ y: -4 }}
      className="relative"
    >
      <Link to={getProfileUrl(user)}>
        <div 
          className={`
            group relative overflow-hidden rounded-xl
            border-2 transition-all duration-300
            ${isRightNow ? 'border-[#E62020] glow-hot' : 'border-white/10 hover:border-white/30'}
            ${user.has_premium_content ? 'shadow-lg shadow-yellow-500/10' : ''}
          `}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Photo Area with Carousel */}
          <div className="aspect-[4/5] bg-gradient-to-br from-[#E62020]/20 to-[#B026FF]/20 flex items-center justify-center text-6xl font-black overflow-hidden relative">
            <AnimatePresence mode="wait">
              {photoUrls[currentPhotoIndex] ? (
                <motion.div
                  key={currentPhotoIndex}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <LazyImage
                    src={photoUrls[currentPhotoIndex]}
                    alt={user.username || user.display_name || 'User'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    containerClassName="w-full h-full absolute inset-0"
                  />
                </motion.div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center text-2xl font-black text-white">
                  {(user.username || user.display_name)?.[0] || 'U'}
                </div>
              )}
            </AnimatePresence>

            {/* Photo Navigation Dots */}
            {hasMultiplePhotos && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {photoUrls.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentPhotoIndex(idx);
                    }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === currentPhotoIndex 
                        ? 'w-6 bg-white' 
                        : 'w-1.5 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Photo Navigation Arrows (on hover) */}
            {hasMultiplePhotos && isHovering && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 active:bg-black/90 touch-manipulation"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 active:bg-black/90 touch-manipulation"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}

            {/* Top Left Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              {/* Right Now Badge */}
              {isRightNow && (
                <motion.div 
                  initial={{ scale: 0, x: -10 }}
                  animate={{ scale: 1, x: 0 }}
                  className="px-2 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center gap-1.5 rounded-md shadow-lg"
                >
                  <Zap className="w-3 h-3 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-wide">Right Now</span>
                </motion.div>
              )}
              
              {/* Video Intro */}
              {user.video_intro_url && (
                <div className="px-2 py-1 glass-card flex items-center gap-1.5 rounded-md">
                  <Play className="w-3 h-3 text-[#E62020]" fill="currentColor" />
                  <span className="text-[9px] font-bold text-white uppercase">Video</span>
                </div>
              )}
              
              {/* Premium */}
              {user.has_premium_content && (
                <motion.div 
                  className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black flex items-center gap-1.5 rounded-md shadow-lg animate-shimmer"
                  style={{ backgroundSize: '200% 100%' }}
                >
                  <Crown className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase">Premium</span>
                </motion.div>
              )}
            </div>

            {/* Top Right - Match Score & Online Status */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
              {/* Online Indicator */}
              {isOnline && (
                <div className="flex items-center gap-1.5 px-2 py-1 glass-card rounded-md">
                  <OnlineIndicator size="sm" pulse />
                  <span className="text-[9px] font-bold text-green-400 uppercase">Online</span>
                </div>
              )}
              
              {/* Match Score */}
              {matchScore > 0 && (
                <MatchBadge percentage={matchScore} size="sm" showLabel={matchScore >= 75} />
              )}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
          </div>

          {/* AI Match Explanation on Hover */}
          <AnimatePresence>
            {isHovering && (aiMatchExplanation || scoreExplanation) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <AIMatchExplanation explanation={aiMatchExplanation || scoreExplanation} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Section - Glassmorphism */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Glass Card Container */}
            <motion.div 
              className="glass-card rounded-xl p-3 space-y-2"
              initial={false}
              animate={{ 
                height: isHovering ? 'auto' : 'auto',
              }}
            >
              {/* Name & Location Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black truncate">
                      {user.username ? `@${user.username}` : (user.display_name || 'Anonymous')}
                    </h3>
                    {user.xp > 0 && (
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-400">
                        <Zap className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-bold">{user.xp}</span>
                      </div>
                    )}
                  </div>
                  
                  {user.city && (
                    <div className="flex items-center gap-1 text-xs text-white/60 mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {user.city}
                        {(distanceLabel || etaLabel) && (
                          <span className="text-[#00D9FF]">
                            {' '}• {etaLabel ? `~${etaLabel}` : distanceLabel}
                            {etaLabel && etaMode ? ` ${etaMode}` : ''}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Actions (visible on hover) */}
                <div className={`flex gap-2 transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="w-11 h-11 rounded-full bg-[#E62020]/20 hover:bg-[#E62020] active:bg-[#E62020]/80 flex items-center justify-center transition-colors touch-manipulation"
                    aria-label="Like profile"
                  >
                    <Heart className="w-5 h-5 text-[#E62020] hover:text-white" />
                  </button>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="w-11 h-11 rounded-full bg-[#00D9FF]/20 hover:bg-[#00D9FF] active:bg-[#00D9FF]/80 flex items-center justify-center transition-colors touch-manipulation"
                    aria-label="Message user"
                  >
                    <MessageCircle className="w-5 h-5 text-[#00D9FF] hover:text-black" />
                  </button>
                </div>
              </div>

              {/* Compatibility Badge */}
              {compatibility && (
                <div className="flex items-center gap-2">
                  <CompatibilityBadge badge={compatibility} size="small" />
                </div>
              )}

              {/* Tribes */}
              {topTribes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {topTribes.map(tribe => (
                    <span
                      key={tribe.tribe_id}
                      className="px-2 py-0.5 bg-gradient-to-r from-[#00D9FF] to-[#3B82F6] text-white text-[9px] font-black uppercase rounded-full shadow-sm"
                    >
                      {tribe.tribe_label}
                    </span>
                  ))}
                </div>
              )}

              {/* Tags Section - Compact */}
              <div className="flex flex-wrap gap-1">
                {/* Looking For - Hot Pink */}
                {lookingFor.slice(0, 2).map((item, idx) => (
                  <span
                    key={`lf-${item}-${idx}`}
                    className="px-1.5 py-0.5 bg-[#E62020]/20 text-[#E62020] text-[8px] font-bold uppercase rounded border border-[#E62020]/30"
                  >
                    {item}
                  </span>
                ))}
                
                {/* Interests - Green */}
                {(user.interests || []).slice(0, 2).map((interest, idx) => (
                  <span
                    key={`int-${interest}-${idx}`}
                    className="px-1.5 py-0.5 bg-[#39FF14]/15 text-[#39FF14] text-[8px] font-bold uppercase rounded border border-[#39FF14]/30"
                  >
                    {interest}
                  </span>
                ))}
                
                {/* Dealbreakers - Red */}
                {dealbreakerTags.slice(0, 1).map(tag => (
                  <span
                    key={tag.tag_id}
                    className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-bold uppercase rounded border border-red-500/30"
                  >
                    ⚠ {tag.tag_label}
                  </span>
                ))}
                
                {/* Essentials */}
                {essentials.slice(0, 2).map(tag => (
                  <span
                    key={tag.tag_id}
                    className="px-1.5 py-0.5 bg-white/10 text-white/80 text-[8px] font-bold uppercase rounded"
                  >
                    {tag.tag_label}
                  </span>
                ))}
              </div>

              {/* Expanded Content on Hover */}
              <AnimatePresence>
                {isHovering && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 pt-2 border-t border-white/10"
                  >
                    {/* Meet At */}
                    {meetAt.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[8px] text-white/40 uppercase mr-1">Vibes:</span>
                        {meetAt.slice(0, 3).map((item, idx) => (
                          <span
                            key={`ma-${item}-${idx}`}
                            className="px-1.5 py-0.5 bg-[#B026FF]/20 text-[#B026FF] text-[8px] font-bold uppercase rounded"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Communication Style */}
                    {communicationStyle.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[8px] text-white/40 uppercase mr-1">Comms:</span>
                        {communicationStyle.slice(0, 2).map((item, idx) => (
                          <span
                            key={`cs-${item}-${idx}`}
                            className="px-1.5 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] text-[8px] font-bold uppercase rounded"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* More Tags */}
                    {nonEssentialTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {nonEssentialTags.slice(0, 4).map(tag => (
                          <span
                            key={tag.tag_id}
                            className="px-1.5 py-0.5 bg-white/5 text-white/60 text-[8px] font-bold uppercase rounded border border-white/10"
                          >
                            {tag.tag_label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Smart Travel Selector */}
                    {hasLocation && (
                      <div 
                        className="pt-2 border-t border-white/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SmartTravelSelector
                          destination={{
                            lat: lat,
                            lng: lng,
                            name: userName,
                          }}
                          travelTimes={user?.etaSeconds ? {
                            walking: { mode: 'walk', durationSeconds: user.etaSeconds, label: etaLabel || '—' },
                            driving: user?.driveEtaSeconds ? { mode: 'drive', durationSeconds: user.driveEtaSeconds, label: '—' } : null,
                          } : undefined}
                          onNavigate={(mode) => {
                            const modeMap = { walk: 'foot', bike: 'bike', drive: 'cab', transit: 'transit' };
                            openDirections(modeMap[mode] || mode);
                          }}
                          compact
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Match Breakdown - only show if we have match data */}
                    {matchBreakdown && (
                      <div className="pt-2 border-t border-white/10">
                        <MatchBreakdownCard
                          matchProbability={matchScore}
                          matchBreakdown={matchBreakdown}
                          travelTimeMinutes={user?.travelTimeMinutes}
                          distanceKm={user?.distanceKm}
                          compact
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Report Button */}
            <div className="absolute -top-10 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ReportButton itemType="user" itemId={user.email} variant="ghost" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}