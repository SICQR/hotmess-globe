import React from 'react';
import type { Profile } from '../types';

/**
 * Get badge for profile type (seller, creator, organizer, premium)
 */
export const badgeForProfileType = (profileType: string) => {
  if (profileType === 'seller') return { label: 'Seller', tone: 'hot' as const, icon: '🛍️' };
  if (profileType === 'creator') return { label: 'Creator', tone: 'cyan' as const, icon: '🎨' };
  if (profileType === 'organizer') return { label: 'Organizer', tone: 'cyan' as const, icon: '📅' };
  if (profileType === 'premium') return { label: 'Premium', tone: 'gold' as const, icon: '💎' };
  return null;
};

/**
 * Get badge color based on match probability percentage
 */
export const getMatchBadgeStyle = (probability: number): { bg: string; text: string } => {
  if (probability >= 80) return { bg: 'bg-gradient-to-r from-emerald-500 to-green-400', text: 'text-black' };
  if (probability >= 60) return { bg: 'bg-gradient-to-r from-cyan-500 to-blue-400', text: 'text-black' };
  if (probability >= 40) return { bg: 'bg-gradient-to-r from-yellow-500 to-orange-400', text: 'text-black' };
  return { bg: 'bg-white/20', text: 'text-white' };
};

/**
 * Social proof badges - Popular, Hot Right Now, Recently Active
 */
export const getSocialProofBadge = (profile: Profile): { label: string; bg: string; icon: string } | null => {
  const p = profile as any;
  
  // "Hot Right Now" - User has active Right Now status
  if (p?.rightNow || p?.right_now_active) {
    return { label: 'Right Now', bg: 'bg-gradient-to-r from-red-500 to-orange-500', icon: '🔥' };
  }
  
  // "Popular" - High view count or engagement
  const viewCount = p?.profile_views_count || p?.viewCount || 0;
  const messageCount = p?.messages_received_count || 0;
  if (viewCount >= 50 || messageCount >= 20) {
    return { label: 'Popular', bg: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '⭐' };
  }
  
  // "Recently Active" - Last seen within 5 minutes
  const lastSeen = p?.last_seen || p?.lastSeen;
  if (lastSeen) {
    const now = Date.now();
    const lastSeenTime = new Date(lastSeen).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - lastSeenTime < fiveMinutes) {
      return { label: 'Active Now', bg: 'bg-gradient-to-r from-green-500 to-emerald-500', icon: '●' };
    }
  }
  
  // Check online status
  if (p?.onlineNow || p?.online_now) {
    return { label: 'Online', bg: 'bg-green-500', icon: '●' };
  }
  
  return null;
};

/**
 * Badge for persona type (secondary profiles)
 */
export const badgeForPersonaType = (profile: Profile) => {
  const isSecondary = (profile as any)?.isSecondaryProfile || (profile as any)?.profile_kind === 'SECONDARY';
  if (!isSecondary) return null;

  const typeKey = (profile as any)?.profile_type_key || '';
  const typeLabel = (profile as any)?.profile_type_label || typeKey;

  switch (typeKey) {
    case 'TRAVEL':
      return { label: typeLabel || 'Travel', tone: 'purple' as const, icon: '✈️' };
    case 'WEEKEND':
      return { label: typeLabel || 'Weekend', tone: 'purple' as const, icon: '🌙' };
    default:
      return { label: typeLabel || 'Persona', tone: 'purple' as const, icon: '🎭' };
  }
};

type BadgesProps = {
  profile: Profile;
  profileType: string;
  viewerLocation: { lat: number; lng: number } | null;
  isTravelTimeLoading: boolean;
  primaryModeShort: string | null;
};

/**
 * Renders all badge types for a profile card
 */
export function ProfileCardBadges({
  profile,
  profileType,
  viewerLocation,
  isTravelTimeLoading,
  primaryModeShort,
}: BadgesProps) {
  const typeBadge = badgeForProfileType(profileType);
  const personaBadge = badgeForPersonaType(profile);
  const socialProofBadge = getSocialProofBadge(profile);
  
  const matchProbability = (profile as any)?.matchProbability;
  const hasMatchProbability = typeof matchProbability === 'number' && Number.isFinite(matchProbability);
  const matchBadgeStyle = hasMatchProbability ? getMatchBadgeStyle(matchProbability) : null;

  return (
    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2 pointer-events-none">
      {/* Social proof badge */}
      {socialProofBadge && (
        <div 
          className={`rounded-full ${socialProofBadge.bg} text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 shadow-lg`}
        >
          {socialProofBadge.icon} {socialProofBadge.label}
        </div>
      )}

      {/* Match probability badge */}
      {hasMatchProbability && matchBadgeStyle && (
        <div 
          className={`rounded-full ${matchBadgeStyle.bg} ${matchBadgeStyle.text} text-[10px] font-black uppercase tracking-wider px-2 py-1 shadow-lg`}
          title="Compatibility score based on your preferences"
        >
          {Math.round(matchProbability)}% Match
        </div>
      )}

      {/* Persona badge for secondary profiles */}
      {personaBadge && (
        <div className="rounded-full bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1">
          {personaBadge.icon ? `${personaBadge.icon} ` : ''}{personaBadge.label}
        </div>
      )}
      
      {/* Profile type badge */}
      {typeBadge && (
        <div
          className={
            typeBadge.tone === 'hot'
              ? 'rounded-full bg-[#E62020] text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
              : typeBadge.tone === 'gold'
                ? 'rounded-full bg-gradient-to-r from-[#FFD700] to-[#E62020] text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
                : 'rounded-full bg-[#00D9FF] text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
          }
        >
          {typeBadge.icon ? `${typeBadge.icon} ` : ''}{typeBadge.label}
        </div>
      )}

      {/* Travel time indicator */}
      {viewerLocation && (
        <div className="rounded-full bg-black/40 border border-white/15 text-white/85 text-[10px] font-black uppercase tracking-wider px-2 py-1">
          {isTravelTimeLoading ? 'Loading…' : primaryModeShort ? `Rec ${primaryModeShort}` : 'No ETA'}
        </div>
      )}
    </div>
  );
}
