import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Crown, Palette, Heart, Navigation, ChevronDown, Calendar, Star, Sparkles, Zap, MapPin, TrendingUp } from 'lucide-react';
import QuickActions from './shared/ProfileActions';
import BadgeDisplay from './BadgeDisplay';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
import { Button } from '@/components/ui/button';
import { buildProfileRecText, recommendTravelModes } from '@/utils/travelRecommendations';
import { useNavigate } from 'react-router-dom';
import { SmartTravelSelector } from '@/components/travel/SmartTravelSelector';

/**
 * Get match probability badge style based on score
 * Per UI Design Spec: 80%+ emerald, 60-79% cyan, 40-59% yellow
 */
const getMatchBadgeStyle = (probability) => {
  if (probability >= 80) return { 
    bg: 'bg-gradient-to-r from-emerald-400 to-[#39FF14]', 
    text: 'text-black',
    glow: 'shadow-[0_0_20px_rgba(57,255,20,0.5)]',
    icon: Star
  };
  if (probability >= 60) return { 
    bg: 'bg-gradient-to-r from-[#00D9FF] to-blue-500', 
    text: 'text-white',
    glow: 'shadow-[0_0_15px_rgba(0,217,255,0.4)]',
    icon: Sparkles
  };
  if (probability >= 40) return { 
    bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', 
    text: 'text-black',
    glow: '',
    icon: Heart
  };
  return { 
    bg: 'bg-white/20', 
    text: 'text-white',
    glow: '',
    icon: Heart
  };
};

/**
 * Get human-readable label for match probability
 */
const getMatchLabel = (probability) => {
  if (probability >= 90) return 'Super Match';
  if (probability >= 75) return 'Great Match';
  if (probability >= 60) return 'Good Match';
  if (probability >= 40) return 'Match';
  return 'Low';
};

/**
 * Animated stat display component
 */
const AnimatedStat = ({ icon: Icon, value, label, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="flex items-center gap-1.5"
  >
    {Icon && <Icon className="w-4 h-4" style={{ color }} />}
    <span className="font-mono font-bold" style={{ color }}>{value}</span>
    {label && <span className="text-white/50 text-xs">{label}</span>}
  </motion.div>
);

// Get the display name for a user - shows username to other users, full name only to self
const getDisplayName = (user, isOwnProfile) => {
  // For own profile, show full name
  if (isOwnProfile) {
    return user?.full_name || user?.username || 'User';
  }
  
  // For other profiles, prefer display_name, then username, never email
  const displayName = user?.display_name || user?.username;
  if (displayName) {
    return displayName.startsWith('@') ? displayName : `@${displayName}`;
  }
  
  // Fallback - don't show full_name or email to other users
  return 'Anonymous';
};

export default function ProfileHeader({ user, isOwnProfile, currentUser, travelEtas, matchProbability, matchBreakdown }) {
  const navigate = useNavigate();
  const profileType = user?.profile_type || 'standard';
  const displayName = getDisplayName(user, isOwnProfile);
  const themeGradient = {
    'default': 'from-[#E62020] to-[#B026FF]',
    'cyber': 'from-[#00D9FF] to-[#39FF14]',
    'sunset': 'from-[#FF6B35] to-[#FFEB3B]',
    'midnight': 'from-[#1a1a2e] to-[#16213e]',
    'neon': 'from-[#E62020] to-[#00D9FF]'
  }[user?.profile_theme || 'default'];

  const profileTypeConfig = {
    'standard': { icon: null, badge: null },
    'seller': { 
      icon: <ShoppingBag className="w-5 h-5" />, 
      badge: user?.verified_seller ? '✓ VERIFIED SELLER' : 'SELLER',
      color: '#00D9FF'
    },
    'premium': { 
      icon: <Crown className="w-5 h-5" />, 
      badge: '💎 PREMIUM',
      gradient: 'from-[#FFD700] to-[#E62020]'
    },
    'creator': { 
      icon: <Palette className="w-5 h-5" />, 
      badge: '🎨 CREATOR',
      color: '#B026FF'
    },
    'organizer': {
      icon: <Calendar className="w-5 h-5" />,
      badge: '📅 ORGANIZER',
      color: '#39FF14'
    }
  };

  // Fallback to standard if profile type not found
  const config = profileTypeConfig[profileType] || profileTypeConfig['standard'];

  const formatEta = (eta) => {
    const seconds = eta?.duration_seconds;
    if (!Number.isFinite(seconds)) return null;
    return `${Math.max(1, Math.round(seconds / 60))}m`;
  };

  const walkEta = formatEta(travelEtas?.walk);
  const driveEta = formatEta(travelEtas?.drive);
  const bikeEta = formatEta(travelEtas?.bicycle);
  const hasAnyEta = !!walkEta || !!driveEta || !!bikeEta;

  const etaToSeconds = (eta) => {
    const seconds = eta?.duration_seconds;
    return Number.isFinite(seconds) ? Number(seconds) : null;
  };

  const recommendations = (() => {
    const viewerText = buildProfileRecText(currentUser);
    const targetText = buildProfileRecText(user);
    return recommendTravelModes({
      viewerText,
      targetText,
      seconds: {
        foot: etaToSeconds(travelEtas?.walk),
        cab: etaToSeconds(travelEtas?.drive),
        bike: etaToSeconds(travelEtas?.bicycle),
        uber: etaToSeconds(travelEtas?.drive),
      },
    });
  })();

  const orderedModes = (() => {
    const base = ['foot', 'cab', 'bike', 'uber'];
    const rec = Array.isArray(recommendations?.order) ? recommendations.order : base;
    const filtered = rec.filter((k) => base.includes(k));
    base.forEach((k) => {
      if (!filtered.includes(k)) filtered.push(k);
    });
    return filtered.slice(0, 4);
  })();

  const primaryMode = orderedModes[0] || null;

  const recommendedLabel = (() => {
    if (!primaryMode) return null;
    const label = primaryMode === 'foot' ? 'Foot' : primaryMode === 'cab' ? 'Cab' : primaryMode === 'bike' ? 'Bike' : 'Uber';
    const eta = primaryMode === 'foot' ? walkEta : primaryMode === 'cab' ? driveEta : primaryMode === 'bike' ? bikeEta : driveEta;
    return `Recommended: ${label}${eta ? ` ${eta}` : ''}`;
  })();

  const dropoffLat = Number.isFinite(user?.last_lat) ? user.last_lat : user?.lat;
  const dropoffLng = Number.isFinite(user?.last_lng) ? user.last_lng : user?.lng;
  // Use username for navigation, not full_name (privacy)
  const dropoffLabel = user?.username || user?.display_name || 'User';
  const uberUrl = buildUberDeepLink({
    dropoffLat,
    dropoffLng,
    dropoffNickname: dropoffLabel,
  });

  const canDirections = Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng);
  const openInAppDirections = (mode) => {
    if (!canDirections) return;
    const qs = new URLSearchParams();
    qs.set('lat', String(dropoffLat));
    qs.set('lng', String(dropoffLng));
    if (dropoffLabel) qs.set('label', String(dropoffLabel));
    qs.set('mode', mode);
    navigate(`/directions?${qs.toString()}`);
  };

  return (
    <div className={`relative h-80 border-b border-white/10 bg-gradient-to-br ${themeGradient}/20`}>
      {/* Banner for sellers */}
      {profileType === 'seller' && user?.shop_banner_url && (
        <img 
          src={user.shop_banner_url} 
          alt="Shop banner" 
          className="absolute inset-0 w-full h-full object-cover opacity-30" 
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-32 h-32 bg-gradient-to-br ${themeGradient} flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden`}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold">{(user?.username || user?.full_name)?.[0] || 'U'}</span>
            )}
          </motion.div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-6xl font-black">{displayName}</h1>
              
              {/* Profile Type Badge */}
              {config.badge && (
                <span 
                  className={`px-2 py-1 text-xs font-black uppercase ${
                    config.gradient 
                      ? `bg-gradient-to-r ${config.gradient} text-black`
                      : 'text-white'
                  }`}
                  style={config.color && !config.gradient ? { backgroundColor: config.color, color: '#000' } : {}}
                >
                  {config.badge}
                </span>
              )}

              {/* Match Probability Badge - Only show when viewing other profiles */}
              {!isOwnProfile && typeof matchProbability === 'number' && Number.isFinite(matchProbability) && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="group relative"
                >
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 text-sm font-black uppercase shadow-lg ${getMatchBadgeStyle(matchProbability).bg} ${getMatchBadgeStyle(matchProbability).text}`}
                    title="Compatibility score based on your preferences"
                  >
                    <Heart className="w-4 h-4" />
                    <span>{Math.round(matchProbability)}% {getMatchLabel(matchProbability)}</span>
                  </span>
                  
                  {/* Tooltip with breakdown */}
                  {matchBreakdown && (
                    <div className="absolute left-0 top-full mt-2 z-50 hidden group-hover:block">
                      <div className="bg-black/95 border border-white/20 rounded-lg p-4 text-left min-w-[220px] shadow-2xl">
                        <p className="text-xs text-white/60 uppercase tracking-wider mb-3">Match Breakdown</p>
                        <div className="space-y-2 text-sm">
                          {matchBreakdown.travelTime !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Travel Time</span>
                              <span className="text-cyan-400 font-mono">{matchBreakdown.travelTime}/20</span>
                            </div>
                          )}
                          {matchBreakdown.roleCompat !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Role Compatibility</span>
                              <span className="text-cyan-400 font-mono">{matchBreakdown.roleCompat}/15</span>
                            </div>
                          )}
                          {matchBreakdown.kinkOverlap !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Interests</span>
                              <span className="text-cyan-400 font-mono">{matchBreakdown.kinkOverlap}/15</span>
                            </div>
                          )}
                          {matchBreakdown.intent !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Intent Alignment</span>
                              <span className="text-cyan-400 font-mono">{matchBreakdown.intent}/12</span>
                            </div>
                          )}
                          {matchBreakdown.lifestyle !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Lifestyle</span>
                              <span className="text-cyan-400 font-mono">{matchBreakdown.lifestyle}/10</span>
                            </div>
                          )}
                          {matchBreakdown.activity !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-white/70">Activity</span>
                              <span className="text-cyan-400 font-mono">{matchBreakdown.activity}/8</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40 mt-3 border-t border-white/10 pt-2">
                          Score based on your preferences
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Badges */}
            <div className="mb-3">
              <BadgeDisplay userEmail={user?.email} />
            </div>

            {/* Seller Tagline */}
            {profileType === 'seller' && user?.seller_tagline && (
              <p className="text-[#00D9FF] text-lg font-bold mb-2">{user.seller_tagline}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
              <span className="text-white/60">{user?.city}</span>

              {/* Smart Travel Selector - Compact mode for profile header */}
              {!isOwnProfile && canDirections && (
                <SmartTravelSelector
                  destination={{
                    lat: dropoffLat,
                    lng: dropoffLng,
                    name: dropoffLabel,
                  }}
                  travelTimes={{
                    walking: travelEtas?.walk ? { 
                      mode: 'walk', 
                      durationSeconds: travelEtas.walk.duration_seconds, 
                      label: walkEta || '—' 
                    } : null,
                    bicycling: travelEtas?.bicycle ? { 
                      mode: 'bike', 
                      durationSeconds: travelEtas.bicycle.duration_seconds, 
                      label: bikeEta || '—' 
                    } : null,
                    driving: travelEtas?.drive ? { 
                      mode: 'drive', 
                      durationSeconds: travelEtas.drive.duration_seconds, 
                      label: driveEta || '—' 
                    } : null,
                  }}
                  onNavigate={(mode) => {
                    const modeMap = { walk: 'foot', bike: 'bike', drive: 'cab' };
                    openInAppDirections(modeMap[mode] || mode);
                  }}
                  compact
                  className="w-full sm:w-auto min-w-[280px]"
                />
              )}
              
              {profileType === 'seller' ? (
                <>
                  <span className="text-[#39FF14] font-mono">
                    ★ {user?.seller_rating?.toFixed(1) || 'New'}
                  </span>
                  <span className="text-white/60">{user?.total_sales || 0} sales</span>
                </>
              ) : (
                <>
                  <span className="text-[#FFEB3B] font-mono">
                    LVL {Math.floor((user?.xp || 0) / 1000) + 1}
                  </span>
                  <span className="text-[#39FF14] font-mono">{user?.xp || 0} XP</span>
                </>
              )}

              {user?.availability_status && user.availability_status !== 'offline' && (
                <span className={`px-2 py-1 text-xs font-bold uppercase ${
                  user.availability_status === 'available' ? 'bg-[#39FF14] text-black' :
                  user.availability_status === 'busy' ? 'bg-[#FF6B35] text-black' :
                  user.availability_status === 'away' ? 'bg-[#FFEB3B] text-black' :
                  'bg-[#E62020] text-black'
                }`}>
                  {user.availability_status.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Actions */}
            <QuickActions profileUser={user} isOwnProfile={isOwnProfile} currentUser={currentUser} />
          </div>
        </div>
      </div>
    </div>
  );
}