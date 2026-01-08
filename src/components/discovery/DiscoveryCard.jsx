import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { MapPin, Zap, Crown } from 'lucide-react';
import CompatibilityBadge, { calculateCompatibility } from './CompatibilityBadge';
import ReportButton from '../moderation/ReportButton';
import LazyImage from '../ui/LazyImage';
import AIMatchExplanation from './AIMatchExplanation';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={createPageUrl(`Profile?email=${user.email}`)}>
        <div 
          className="group relative overflow-hidden border-2 border-white/10 hover:border-[#FF1493] transition-all"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Avatar/Photo */}
          <div className="aspect-square bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-6xl font-black overflow-hidden relative">
            {(() => {
              const primaryPhoto = user.photos?.find(p => p.is_primary)?.url;
              const firstPhoto = user.photos?.[0]?.url;
              const photoUrl = primaryPhoto || firstPhoto || user.avatar_url;
              
              return photoUrl ? (
                <LazyImage
                  src={photoUrl}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full absolute inset-0"
                />
              ) : (
                user.full_name?.[0] || 'U'
              );
            })()}
            {(user.video_intro_url || user.has_premium_content) && (
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {user.video_intro_url && (
                  <div className="px-2 py-1 bg-black/80 border border-[#FF1493] flex items-center gap-1">
                    <div className="w-2 h-2 bg-[#FF1493] rounded-full animate-pulse" />
                    <span className="text-[9px] font-bold text-white uppercase">Video</span>
                  </div>
                )}
                {user.has_premium_content && (
                  <div className="px-2 py-1 bg-[#FFD700]/90 text-black flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase">XXX</span>
                  </div>
                )}
              </div>
            )}
            {user.photos && user.photos.length > 1 && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 text-[9px] font-bold text-white uppercase">
                +{user.photos.length - 1}
              </div>
            )}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* AI Match Explanation on Hover */}
          {isHovering && aiMatchExplanation && (
            <AIMatchExplanation explanation={aiMatchExplanation} />
          )}

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
            <div className="mb-2">
              <CompatibilityBadge badge={compatibility} size="small" />
            </div>
            
            <h3 className="text-lg font-black mb-1">{user.full_name}</h3>
            
            {user.city && (
              <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
                <MapPin className="w-3 h-3" />
                <span>
                  {user.city}
                  {(distanceLabel || etaLabel) && (
                    <span className="text-white/50">
                      {' '}• {etaLabel ? `~${etaLabel}` : distanceLabel}
                      {etaLabel && etaMode ? ` ${etaMode}` : ''}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Tribes */}
            {topTribes.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {topTribes.map(tribe => (
                  <span
                    key={tribe.tribe_id}
                    className="px-2 py-0.5 bg-[#00D9FF] text-black text-[10px] font-bold uppercase"
                  >
                    {tribe.tribe_label}
                  </span>
                ))}
              </div>
            )}

            {/* Interests preview */}
            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {user.interests.slice(0, 2).map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-[9px] font-bold uppercase border border-[#39FF14]/40"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}

            {/* Looking For */}
            {lookingFor.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {lookingFor.slice(0, 3).map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="px-2 py-0.5 bg-[#FF1493]/20 text-[#FF1493] text-[9px] font-bold uppercase border border-[#FF1493]/40"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* Meet At */}
            {meetAt.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {meetAt.slice(0, 2).map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="px-2 py-0.5 bg-[#B026FF]/20 text-white text-[9px] font-bold uppercase border border-white/20"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* Communication Style */}
            {communicationStyle.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {communicationStyle.slice(0, 2).map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="px-2 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] text-[9px] font-bold uppercase border border-[#00D9FF]/40"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* Essentials preview */}
            {(essentials.length > 0 || dealbreakerTags.length > 0 || nonEssentialTags.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {dealbreakerTags.slice(0, 2).map(tag => (
                  <span
                    key={tag.tag_id}
                    className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[9px] font-bold uppercase border border-red-500/40"
                  >
                    {tag.tag_label}
                  </span>
                ))}
                {essentials.slice(0, 4).map(tag => (
                  <span
                    key={tag.tag_id}
                    className="px-2 py-0.5 bg-white/10 text-white text-[9px] font-bold uppercase"
                  >
                    {tag.tag_label}
                  </span>
                ))}
                {nonEssentialTags.slice(0, 4).map(tag => (
                  <span
                    key={tag.tag_id}
                    className="px-2 py-0.5 bg-white/5 text-white/80 text-[9px] font-bold uppercase border border-white/10"
                  >
                    {tag.tag_label}
                  </span>
                ))}
              </div>
            )}

            {/* XP & Report */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-black/80 border border-[#FFEB3B]">
                <Zap className="w-3 h-3 text-[#FFEB3B]" />
                <span className="text-[10px] font-bold text-[#FFEB3B]">{user.xp || 0}</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ReportButton itemType="user" itemId={user.email} variant="ghost" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}