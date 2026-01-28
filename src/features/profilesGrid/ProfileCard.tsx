import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Profile, TravelTimeResponse } from './types';
import { fetchTravelTime, type LatLng } from './travelTime';
import { useLongPress } from './useLongPress';
import { useVisibility } from './useVisibility';
import { useCursorGlow } from '@/hooks/useCursorGlow';
import { buildUberDeepLink, buildLyftDeepLink } from '@/utils/uberDeepLink';
import { Button } from '@/components/ui/button';
import { buildProfileRecText, recommendTravelModes, type TravelModeKey } from '@/utils/travelRecommendations';
import ReactBitsProfileCard from '@/components/react-bits/ProfileCard/ProfileCard';
import { MatchBreakdownCard, MatchBadge } from '@/components/match/MatchBreakdownCard';
import { SmartTravelSelector } from '@/components/travel/SmartTravelSelector';
import { cn } from '@/lib/utils';

type Props = {
  profile: Profile;
  viewerLocation: LatLng | null;
  viewerProfile?: unknown;
  onOpenProfile: (profile: Profile) => void;
  onNavigateUrl: (url: string) => void;
};

const getPhotoUrls = (profile: Profile): string[] => {
  const urls: string[] = [];

  const push = (value: unknown) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return;
    if (urls.includes(url)) return;
    urls.push(url);
  };

  // Canonical API response: profile.photos: { url, isPrimary }
  const photos = Array.isArray(profile.photos) ? profile.photos : [];
  for (const item of photos) {
    if (typeof item === 'string') push(item);
    else if (item && typeof item === 'object') push(item.url || item.file_url);
  }

  // Back-compat / older shapes.
  push(profile.avatar_url);
  push(profile.avatarUrl);

  const photoUrls = profile.photo_urls;
  if (Array.isArray(photoUrls)) {
    for (const u of photoUrls) push(u);
  }

  const images = profile.images;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === 'string') push(img);
      else if (img && typeof img === 'object') push(img.url || img.src || img.file_url);
    }
  }

  return urls.filter(Boolean).slice(0, 5);
};

const supportsHover = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(hover: hover)').matches ?? false;
};

const normalizeProfileType = (value: unknown) => String(value || '').trim().toLowerCase();

const getProfileCardStyle = () => {
  // Priority:
  // 1) URL param (?card=react-bits)
  // 2) localStorage (hm.profileCardStyle)
  // 3) Vite env (VITE_PROFILE_CARD_STYLE)
  //
  // Reason: Vite only reads .env* at server start, so env tweaks won't show
  // until restart; query/localStorage gives an instant toggle for dev.
  let style = '';

  try {
    style = String((import.meta as any)?.env?.VITE_PROFILE_CARD_STYLE || '').trim();
  } catch {
    // ignore
  }

  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search || '');
      const fromQuery = params.get('card');
      if (fromQuery && String(fromQuery).trim()) {
        style = String(fromQuery).trim();
      } else {
        const fromStorage = window.localStorage?.getItem('hm.profileCardStyle');
        if (fromStorage && String(fromStorage).trim()) {
          style = String(fromStorage).trim();
        }
      }
    }
  } catch {
    // ignore
  }

  const normalized = String(style || '').trim().toLowerCase();

  // Production default: use react-bits unless explicitly forced to legacy.
  if (import.meta.env.MODE === 'production' && !normalized) return 'react-bits';

  return normalized;
};

const emailHandle = (value: unknown) => {
  const email = String(value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return null;
  const handle = email.split('@')[0] || '';
  return handle.replace(/[^a-z0-9_\-.]/g, '').slice(0, 24) || null;
};

const initialsFromName = (name: unknown) => {
  const raw = String(name || '').trim();
  if (!raw) return 'HM';
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
  const out = `${first}${last}`.toUpperCase();
  return out || 'HM';
};

/**
 * Profile type badges per UI Design Spec
 * Seller = Purple, Creator = Pink→Purple, Organizer = Cyan→Blue, Premium = Gold→Orange (shimmer)
 */
const badgeForProfileType = (profileType: string) => {
  if (profileType === 'seller') return { 
    label: 'Seller', 
    tone: 'seller' as const, 
    icon: '🛍️',
    className: 'bg-[#B026FF] text-white'
  };
  if (profileType === 'creator') return { 
    label: 'Creator', 
    tone: 'creator' as const, 
    icon: '🎨',
    className: 'bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white'
  };
  if (profileType === 'organizer') return { 
    label: 'Organizer', 
    tone: 'organizer' as const, 
    icon: '📅',
    className: 'bg-gradient-to-r from-[#00D9FF] to-blue-500 text-white'
  };
  if (profileType === 'premium') return { 
    label: 'Premium', 
    tone: 'gold' as const, 
    icon: '👑',
    className: 'bg-gradient-to-r from-[#FFD700] to-orange-500 text-black animate-shimmer',
    glow: true
  };
  return null;
};

/**
 * Get badge color based on match probability percentage
 * Per UI Design Spec:
 * - 80%+ = Emerald gradient ("Super Match")
 * - 60-79% = Cyan gradient ("Great Match") 
 * - 40-59% = Yellow/Amber ("Good Match")
 * - <40% = Gray ("Match")
 */
const getMatchBadgeStyle = (probability: number): { bg: string; text: string; label: string; glow?: boolean } => {
  if (probability >= 80) return { 
    bg: 'bg-gradient-to-r from-emerald-400 to-[#39FF14]', 
    text: 'text-black',
    label: 'Super Match',
    glow: true
  };
  if (probability >= 60) return { 
    bg: 'bg-gradient-to-r from-[#00D9FF] to-blue-500', 
    text: 'text-white',
    label: 'Great Match'
  };
  if (probability >= 40) return { 
    bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', 
    text: 'text-black',
    label: 'Good Match'
  };
  return { 
    bg: 'bg-white/20', 
    text: 'text-white',
    label: 'Match'
  };
};

/**
 * Social proof badges - Popular, Hot Right Now, Recently Active
 */
const getSocialProofBadge = (profile: Profile): { label: string; bg: string; icon: string } | null => {
  // "Hot Right Now" - User has active Right Now status
  if (profile.rightNow || profile.right_now_active) {
    return { label: 'Right Now', bg: 'bg-gradient-to-r from-red-500 to-orange-500', icon: '🔥' };
  }
  
  // "Popular" - High view count or engagement
  const viewCount = profile.profile_views_count || profile.viewCount || 0;
  const messageCount = profile.messages_received_count || 0;
  if (viewCount >= 50 || messageCount >= 20) {
    return { label: 'Popular', bg: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '⭐' };
  }
  
  // "Recently Active" - Last seen within 5 minutes
  const lastSeen = profile.last_seen || profile.lastSeen;
  if (lastSeen) {
    const now = Date.now();
    const lastSeenTime = new Date(lastSeen).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (now - lastSeenTime < fiveMinutes) {
      return { label: 'Active Now', bg: 'bg-gradient-to-r from-green-500 to-emerald-500', icon: '●' };
    }
  }
  
  // Check online status
  if (profile.onlineNow || profile.online_now) {
    return { label: 'Online', bg: 'bg-green-500', icon: '●' };
  }
  
  return null;
};

// Badge for persona type (secondary profiles)
const badgeForPersonaType = (profile: Profile) => {
  const isSecondary = profile.isSecondaryProfile || profile.profile_kind === 'SECONDARY';
  if (!isSecondary) return null;

  const typeKey = profile.profile_type_key || '';
  const typeLabel = profile.profile_type_label || typeKey;

  switch (typeKey) {
    case 'TRAVEL':
      return { label: typeLabel || 'Travel', tone: 'purple' as const, icon: '✈️' };
    case 'WEEKEND':
      return { label: typeLabel || 'Weekend', tone: 'purple' as const, icon: '🌙' };
    default:
      return { label: typeLabel || 'Persona', tone: 'purple' as const, icon: '🎭' };
  }
};

const getProductPreviewUrls = (profile: Profile): string[] => {
  const previews = Array.isArray(profile.productPreviews) ? profile.productPreviews : [];
  const urls: string[] = [];

  for (const item of previews) {
    if (!item || typeof item !== 'object') continue;
    const url = typeof item.imageUrl === 'string' ? String(item.imageUrl).trim() : '';
    if (!url) continue;
    if (urls.includes(url)) continue;
    urls.push(url);
  }

  return urls.slice(0, 3);
};

export function ProfileCard({
  profile,
  viewerLocation,
  viewerProfile,
  onOpenProfile,
  onNavigateUrl,
}: Props) {
  const useReactBits = getProfileCardStyle() === 'react-bits';

  const photoUrls = useMemo(() => getPhotoUrls(profile), [profile]);
  const productPreviewUrls = useMemo(() => getProductPreviewUrls(profile), [profile]);

  const [isActive, setIsActive] = useState(false);

  const { ref: visibilityRef, isVisible } = useVisibility({ rootMargin: '200px', threshold: 0.2, once: true });

  const cardRef = useRef<HTMLDivElement | null>(null);

  // 🎨 SMART FEATURE: Cursor-following glow effect
  useCursorGlow(cardRef, {
    enabled: supportsHover(),
    glowColor: 'rgba(255, 20, 147, 0.15)',
    glowSize: 200,
    intensity: 1,
  });

  // 🎯 SMART FEATURE: Calculate relevance score for dynamic styling
  const relevanceScore = useMemo(() => {
    let score = 0;
    
    // Match probability (0-40 points)
    if (profile.matchProbability) score += profile.matchProbability * 0.4;
    
    // Proximity bonus (0-20 points)
    if (profile.distanceKm !== undefined) {
      if (profile.distanceKm < 1) score += 20;
      else if (profile.distanceKm < 5) score += 15;
      else if (profile.distanceKm < 10) score += 10;
    }
    
    // Active status (0-15 points)
    if (profile.rightNow || profile.right_now_active) score += 15;
    else if (profile.onlineNow || profile.online_now) score += 8;
    
    // Engagement (0-10 points)
    const views = profile.profile_views_count || profile.viewCount || 0;
    if (views >= 100) score += 10;
    else if (views >= 50) score += 5;
    
    // Premium/verified (0-5 points)
    if (profile.verified) score += 3;
    if (profile.profileType === 'premium') score += 2;
    
    return Math.min(100, score);
  }, [profile]);

  // 🔥 SMART FEATURE: Dynamic card styling based on relevance
  const smartCardClass = useMemo(() => {
    const baseClass = 'cursor-glow transition-all duration-300';
    
    if (relevanceScore >= 80) {
      // Super high relevance - animated gradient border + glow
      return cn(baseClass, 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-glow-pulse');
    }
    
    if (relevanceScore >= 60) {
      // High relevance - cyan glow
      return cn(baseClass, 'ring-2 ring-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.4)]');
    }
    
    if (profile.rightNow || profile.right_now_active) {
      // Right Now active - red glow
      return cn(baseClass, 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]');
    }
    
    return baseClass;
  }, [relevanceScore, profile.rightNow, profile.right_now_active]);

  const attachRef = useCallback(
    (node: Element | null) => {
      visibilityRef(node);
      cardRef.current = node as HTMLDivElement | null;
    },
    [visibilityRef]
  );

  const destination = useMemo<LatLng>(() => ({ lat: profile.geoLat, lng: profile.geoLng }), [profile.geoLat, profile.geoLng]);

  const viewerLocationBucket = useMemo<LatLng | null>(() => {
    if (!viewerLocation) return null;
    if (!Number.isFinite(viewerLocation.lat) || !Number.isFinite(viewerLocation.lng)) return null;
    return {
      lat: Math.round(viewerLocation.lat * 1e3) / 1e3,
      lng: Math.round(viewerLocation.lng * 1e3) / 1e3,
    };
  }, [viewerLocation]);

  const tags = useMemo(() => {
    const raw = profile.tags;
    return Array.isArray(raw) ? raw.map((t) => String(t)).filter(Boolean).slice(0, 3) : [];
  }, [profile]);

  const [travelTime, setTravelTime] = useState<TravelTimeResponse | null>(null);
  const [isTravelTimeLoading, setIsTravelTimeLoading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    if (!viewerLocationBucket) return;

    let cancelled = false;
    const controller = new AbortController();
    const refreshMs = 2 * 60 * 1000;
    const jitterMs = Math.floor(Math.random() * 15000);

    const run = () => {
      if (cancelled) return;
      if (controller.signal.aborted) return;
      setIsTravelTimeLoading(true);

      // `fetchTravelTime` may throw synchronously if passed an already-aborted signal.
      Promise.resolve()
        .then(() => fetchTravelTime({ viewer: viewerLocationBucket, destination, signal: controller.signal }))
        .then((value) => {
          if (cancelled) return;
          setTravelTime(value);
        })
        .catch((err) => {
          // Expected when the card unmounts or a refresh aborts the request.
          if (cancelled) return;
          if (controller.signal.aborted) return;
          if (err?.name === 'AbortError') return;
        })
        .finally(() => {
          if (cancelled) return;
          setIsTravelTimeLoading(false);
        });
    };

    // Prime immediately, then keep results reasonably fresh (cab traffic in particular).
    run();

    // Refresh only when the card is active (hovered/opened). Otherwise, keep the first result.
    if (!isActive) {
      return () => {
        cancelled = true;
        try {
          controller.abort();
        } catch {
          // ignore
        }
      };
    }

    const id = window.setInterval(run, refreshMs + jitterMs);
    return () => {
      window.clearInterval(id);
      cancelled = true;
      try {
        controller.abort();
      } catch {
        // ignore
      }
    };
  }, [destination, isActive, isVisible, viewerLocationBucket]);

  const toMinsLabel = (seconds: number | null | undefined) => {
    if (!Number.isFinite(seconds)) return '—';
    return `${Math.max(1, Math.round(Number(seconds) / 60))}m`;
  };

  const footMins = toMinsLabel(travelTime?.walking?.durationSeconds);
  const cabMins = toMinsLabel(travelTime?.driving?.durationSeconds);
  const bikeMins = toMinsLabel(travelTime?.bicycling?.durationSeconds);
  const uberMins = toMinsLabel(travelTime?.uber?.durationSeconds);

  const recommendations = useMemo(() => {
    const viewerText = buildProfileRecText(viewerProfile);
    const targetText = buildProfileRecText(profile);
    return recommendTravelModes({
      viewerText,
      targetText,
      seconds: {
        foot: travelTime?.walking?.durationSeconds,
        cab: travelTime?.driving?.durationSeconds,
        bike: travelTime?.bicycling?.durationSeconds,
        uber: travelTime?.uber?.durationSeconds,
      },
    });
  }, [profile, travelTime, viewerProfile]);

  const orderedModes = useMemo(() => {
    const base: TravelModeKey[] = ['foot', 'cab', 'bike', 'uber'];
    const rec = Array.isArray(recommendations?.order) ? recommendations.order : base;
    const filtered = rec.filter((k) => base.includes(k));
    for (const k of base) if (!filtered.includes(k)) filtered.push(k);
    return filtered.slice(0, 4);
  }, [recommendations]);

  const primaryMode = orderedModes[0] || null;

  const primaryLabel = useMemo(() => {
    if (!primaryMode) return null;
    if (primaryMode === 'foot') return `Recommended: Foot ${footMins}`;
    if (primaryMode === 'cab') return `Recommended: Cab ${cabMins}`;
    if (primaryMode === 'bike') return `Recommended: Bike ${bikeMins}`;
    if (primaryMode === 'uber') return `Recommended: Uber ${uberMins}`;
    return null;
  }, [bikeMins, cabMins, footMins, primaryMode, uberMins]);

  const modeLabel = (mode: TravelModeKey) => {
    if (mode === 'foot') return 'Foot';
    if (mode === 'cab') return 'Cab';
    if (mode === 'bike') return 'Bike';
    return 'Uber';
  };

  const modeMins = (mode: TravelModeKey) => {
    if (mode === 'foot') return footMins;
    if (mode === 'cab') return cabMins;
    if (mode === 'bike') return bikeMins;
    return uberMins;
  };

  const openMode = useCallback(
    (mode: TravelModeKey) => {
      // Handle ride services with deep links
      if (mode === 'uber') {
        const url = buildUberDeepLink({
          dropoffLat: profile.geoLat,
          dropoffLng: profile.geoLng,
          dropoffNickname: profile.profileName,
        });
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (mode === 'lyft') {
        const url = buildLyftDeepLink({
          dropoffLat: profile.geoLat,
          dropoffLng: profile.geoLng,
          dropoffNickname: profile.profileName,
        });
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      // Open in-app directions for other modes
      const qs = new URLSearchParams();
      qs.set('lat', String(profile.geoLat));
      qs.set('lng', String(profile.geoLng));
      if (profile.profileName) qs.set('label', String(profile.profileName));
      qs.set('mode', mode);
      onNavigateUrl(`/directions?${qs.toString()}`);
    },
    [onNavigateUrl, profile.geoLat, profile.geoLng, profile.profileName]
  );

  const headline = profile.title;
  const locationLine = profile.locationLabel;

  const { isLongPressActive, didLongPress, handlers: longPressHandlers } = useLongPress({ delayMs: 300 });

  useEffect(() => {
    if (isLongPressActive) setIsActive(true);
    else if (!supportsHover()) setIsActive(false);
  }, [isLongPressActive]);

  const openProfile = useCallback(() => {
    onOpenProfile(profile);
  }, [onOpenProfile, profile]);

  const profileType = normalizeProfileType(profile?.profileType);
  const isSeller = profileType === 'seller';
  const isCreator = profileType === 'creator' || profileType === 'organizer';
  const hasProducts = profile.hasProducts === true;

  const onShopClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const email = String(profile?.email || '').trim();
      if (!email) return;
      onNavigateUrl(`/market?created_by=${encodeURIComponent(email)}`);
    },
    [onNavigateUrl, profile?.email]
  );

  const primaryAction = useMemo(() => {
    if (isSeller && hasProducts) return { key: 'shop', label: 'Shop' } as const;
    if (isCreator) return { key: 'listen', label: 'Listen' } as const;
    const email = String(profile?.email || '').trim();
    if (email) return { key: 'message', label: 'Message' } as const;
    return { key: 'view', label: 'View' } as const;
  }, [hasProducts, isCreator, isSeller, profile?.email]);

  const onPrimaryClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (primaryAction.key === 'listen') {
        onNavigateUrl('/music/live');
        return;
      }

      if (primaryAction.key === 'shop') {
        const email = String(profile?.email || '').trim();
        if (!email) return;
        onNavigateUrl(`/market?created_by=${encodeURIComponent(email)}`);
        return;
      }

      if (primaryAction.key === 'message') {
        const email = String(profile?.email || '').trim();
        if (!email) return;
        onNavigateUrl(`/social/inbox?to=${encodeURIComponent(email)}`);
        return;
      }

      // view
      openProfile();
    },
    [onNavigateUrl, openProfile, primaryAction.key, profile]
  );

  const onViewClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openProfile();
    },
    [openProfile]
  );

  const onClick = (e: React.MouseEvent) => {
    if (isLongPressActive || didLongPress) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    openProfile();
  };

  const primaryUrl = photoUrls[0] || null;
  const currentUrl = primaryUrl;

  const typeBadge = useMemo(() => badgeForProfileType(profileType), [profileType]);
  const personaBadge = useMemo(() => badgeForPersonaType(profile), [profile]);
  const socialProofBadge = useMemo(() => getSocialProofBadge(profile), [profile]);
  const hasTravelTimes = !!travelTime;
  const primaryModeShort = useMemo(() => {
    if (!primaryMode) return null;
    const mins = modeMins(primaryMode);
    if (!mins || mins === '—') return null;
    return `${modeLabel(primaryMode)} ${mins}`;
  }, [primaryMode, modeLabel, modeMins]);

  // Match probability badge
  const matchProbability = profile.matchProbability;
  const hasMatchProbability = typeof matchProbability === 'number' && Number.isFinite(matchProbability);
  const matchBadgeStyle = hasMatchProbability ? getMatchBadgeStyle(matchProbability) : null;

  if (useReactBits) {
    const handle =
      profile.handle ||
      profile.username ||
      emailHandle(profile.email) ||
      initialsFromName(profile.profileName || profile.full_name || 'HM');

    // Build status string with match probability if available
    const matchPercent = hasMatchProbability ? `${Math.round(matchProbability!)}% Match` : '';
    const travelStatus = primaryModeShort || '';
    const onlineStatus = profile.onlineNow ? 'Online' : (profile.rightNow ? 'Right now' : '');
    
    // Prioritize: match probability > travel time > online status
    const status = matchPercent || travelStatus || onlineStatus; 

    return (
      <div
        ref={attachRef as unknown as React.Ref<HTMLDivElement>}
        className="select-none"
        onMouseEnter={() => {
          if (supportsHover()) setIsActive(true);
        }}
        onMouseLeave={() => {
          if (supportsHover()) setIsActive(false);
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement | null;
          // If the user clicked the react-bits action button, don't also open the profile.
          if (target?.closest?.('.pc-contact-btn')) return;
          onClick(e);
        }}
        {...longPressHandlers}
      >
        <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl">
          <ReactBitsProfileCard
            className="pc-grid"
            avatarUrl={currentUrl || ''}
            miniAvatarUrl={currentUrl || ''}
            iconUrl={undefined}
            grainUrl={undefined}
            innerGradient={undefined}
            enableTilt={true}
            enableMobileTilt={false}
            behindGlowEnabled={true}
            behindGlowColor={isSeller ? 'rgba(244, 63, 94, 0.55)' : 'rgba(56, 189, 248, 0.55)'}
            behindGlowSize="60%"
            name={String(profile.profileName || 'HOTMESS')}
            title={String(headline || '')}
            handle={String(handle || 'hotmess')}
            status={String(status || '')}
            contactText={primaryAction.label}
            onContactClick={() => {
              // Mirror existing primary CTA behavior.
              // We can't stopPropagation from inside react-bits button, so the wrapper click guard handles it.
              if (primaryAction.key === 'listen') {
                onNavigateUrl('/music/live');
                return;
              }

              if (primaryAction.key === 'shop') {
                const email = String(profile?.email || '').trim();
                if (!email) return;
                onNavigateUrl(`/market?created_by=${encodeURIComponent(email)}`);
                return;
              }

              if (primaryAction.key === 'message') {
                const email = String(profile?.email || '').trim();
                if (!email) return;
                onNavigateUrl(`/social/inbox?to=${encodeURIComponent(email)}`);
                return;
              }

              openProfile();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={attachRef as unknown as React.Ref<HTMLDivElement>}
      className="select-none"
      onMouseEnter={() => {
        if (supportsHover()) setIsActive(true);
      }}
      onMouseLeave={() => {
        if (supportsHover()) setIsActive(false);
      }}
      onClick={onClick}
      {...longPressHandlers}
    >
      <div className={cn("relative w-full aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm transition-all duration-200 hover:border-white/20 hover:shadow-lg", smartCardClass)}>
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={profile.profileName}
            className="h-full w-full object-cover transition-transform duration-500 will-change-transform"
            style={supportsHover() ? { transform: isActive ? 'scale(1.04)' : 'scale(1)' } : undefined}
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-white/10 to-black/40 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/80 font-black">
              {initialsFromName(profile.profileName)}
            </div>
          </div>
        )}

        {/* Global readability scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2 pointer-events-none">
          {/* Social proof badge */}
          {socialProofBadge ? (
            <div 
              className={`rounded-full ${socialProofBadge.bg} text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 shadow-lg`}
            >
              {socialProofBadge.icon} {socialProofBadge.label}
            </div>
          ) : null}

          {/* Match probability badge */}
          {hasMatchProbability && matchBadgeStyle ? (
            <div 
              className={`rounded-full ${matchBadgeStyle.bg} ${matchBadgeStyle.text} text-[10px] font-black uppercase tracking-wider px-2 py-1 shadow-lg`}
              title="Compatibility score based on your preferences"
            >
              {Math.round(matchProbability)}% Match
            </div>
          ) : null}

          {/* Persona badge for secondary profiles */}
          {personaBadge ? (
            <div className="rounded-full bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1">
              {personaBadge.icon ? `${personaBadge.icon} ` : ''}{personaBadge.label}
            </div>
          ) : null}
          {typeBadge ? (
            <div
              className={
                typeBadge.tone === 'seller'
                  ? 'rounded-full bg-[#B026FF] text-white text-[10px] font-black uppercase tracking-wider px-2 py-1'
                  : typeBadge.tone === 'gold'
                    ? 'rounded-full bg-gradient-to-r from-[#FFD700] to-[#E62020] text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
                    : typeBadge.tone === 'creator'
                      ? 'rounded-full bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white text-[10px] font-black uppercase tracking-wider px-2 py-1'
                      : 'rounded-full bg-gradient-to-r from-[#00D9FF] to-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1'
              }
            >
              {typeBadge.icon ? `${typeBadge.icon} ` : ''}{typeBadge.label}
            </div>
          ) : null}

          {viewerLocation ? (
            <div className="rounded-full bg-black/40 border border-white/15 text-white/85 text-[10px] font-black uppercase tracking-wider px-2 py-1">
              {isTravelTimeLoading ? 'Loading…' : primaryModeShort ? `Rec ${primaryModeShort}` : 'No ETA'}
            </div>
          ) : null}
        </div>

        {/* Bottom identity + CTAs (always visible) */}
        <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-auto">
          <div className="rounded-xl bg-black/40 backdrop-blur-md border border-white/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-black text-white leading-tight truncate">
                  {profile.profileName}
                </div>
                <div className="text-xs text-white/80 truncate">{headline}</div>
                <div className="mt-1 text-[11px] text-white/65 truncate">{locationLine}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Quick navigate button when travel times are available */}
                {hasTravelTimes && primaryMode && (
                  <Button
                    type="button"
                    variant="cyan"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openMode(primaryMode);
                    }}
                    className="min-w-[40px] min-h-[40px] p-0"
                    title={`Navigate (${modeMins(primaryMode)})`}
                    aria-label={`Navigate via ${modeLabel(primaryMode)}, ${modeMins(primaryMode)}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={onViewClick}
                  className="min-h-[40px] px-3 text-xs font-black uppercase tracking-wider"
                  aria-label={`View ${profile.profileName}'s profile`}
                >
                  View
                </Button>
              </div>
            </div>

            {isSeller && hasProducts && productPreviewUrls.length > 0 ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onShopClick}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 min-h-[44px] hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation"
                  aria-label={`Shop ${profile.profileName}'s products`}
                >
                  <div className="flex items-center -space-x-2">
                    {productPreviewUrls.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="Product preview"
                        className="h-8 w-8 rounded-md border border-black/60 object-cover"
                        draggable={false}
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <div className="text-xs font-black uppercase tracking-wider text-white/80">Drops</div>
                </button>
                <div className="text-[10px] font-black uppercase tracking-wider text-white/50">Tap to shop</div>
              </div>
            ) : null}

            {tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/75"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Expanded panel on hover/long-press */}
            {isActive ? (
              <div className="mt-3 space-y-3">
                {/* Match breakdown (compact) - only show if we have match data */}
                {hasMatchProbability && profile.matchBreakdown && (
                  <div className="pb-2 border-b border-white/10">
                    <MatchBreakdownCard
                      matchProbability={matchProbability}
                      matchBreakdown={profile.matchBreakdown}
                      travelTimeMinutes={profile.travelTimeMinutes}
                      distanceKm={profile.distanceKm}
                      compact
                    />
                  </div>
                )}

                {/* Smart Travel Selector */}
                {viewerLocation && Number.isFinite(profile.geoLat) && Number.isFinite(profile.geoLng) && (
                  <SmartTravelSelector
                    destination={{
                      lat: profile.geoLat,
                      lng: profile.geoLng,
                      name: profile.profileName,
                    }}
                    travelTimes={travelTime ? {
                      walking: travelTime.walking ? {
                        mode: 'walk',
                        durationSeconds: travelTime.walking.durationSeconds,
                        label: travelTime.walking.label,
                      } : null,
                      bicycling: travelTime.bicycling ? {
                        mode: 'bike',
                        durationSeconds: travelTime.bicycling.durationSeconds,
                        label: travelTime.bicycling.label,
                      } : null,
                      driving: travelTime.driving ? {
                        mode: 'drive',
                        durationSeconds: travelTime.driving.durationSeconds,
                        label: travelTime.driving.label,
                      } : null,
                      transit: travelTime.transit ? {
                        mode: 'transit',
                        durationSeconds: travelTime.transit.durationSeconds,
                        label: travelTime.transit.label,
                      } : null,
                    } : undefined}
                    onNavigate={(mode) => {
                      const modeMap: Record<string, TravelModeKey> = {
                        walk: 'foot',
                        bike: 'bike',
                        drive: 'cab',
                        transit: 'transit',
                      };
                      openMode(modeMap[mode] || 'foot');
                    }}
                    compact
                    className="w-full"
                  />
                )}

                {/* Fallback for no location */}
                {!viewerLocation && (
                  <div className="text-[11px] text-white/70 text-center py-2">
                    Enable location for smart travel suggestions
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={onPrimaryClick}
                    disabled={
                      (primaryAction.key === 'shop' || primaryAction.key === 'message') &&
                      !String(profile?.email || '').trim()
                    }
                    variant={primaryAction.key === 'message' ? 'hotGradient' : 'cyanGradient'}
                    className="flex-1 min-h-[44px]"
                  >
                    {primaryAction.label}
                  </Button>
                  <Button
                    type="button"
                    onClick={onViewClick}
                    variant="glass"
                    className="border-white/15 min-h-[44px]"
                  >
                    Open
                  </Button>
                </div>

                <div className="text-[10px] text-white/50 text-center">
                  Estimates • Ask first. Confirm yes.
                </div>

              </div>
            ) : (
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={onPrimaryClick}
                  disabled={
                    (primaryAction.key === 'shop' || primaryAction.key === 'message') &&
                    !String(profile?.email || '').trim()
                  }
                  variant={primaryAction.key === 'message' ? 'hot' : 'cyan'}
                  className="w-full"
                >
                  {primaryAction.label}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
