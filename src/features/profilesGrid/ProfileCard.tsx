import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Profile, TravelTimeResponse } from './types';
import { fetchTravelTime, type LatLng } from './travelTime';
import { useLongPress } from './useLongPress';
import { useVisibility } from './useVisibility';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
import { Button } from '@/components/ui/button';
import { buildProfileRecText, recommendTravelModes, type TravelModeKey } from '@/utils/travelRecommendations';
import ReactBitsProfileCard from '@/components/react-bits/ProfileCard/ProfileCard';
import { SimpleProfileCard } from '@/components/profiles/SimpleProfileCard';
import type { TapType } from '@/hooks/useTaps';

type Props = {
  profile: Profile;
  viewerLocation: LatLng | null;
  viewerProfile?: unknown;
  onOpenProfile: (profile: Profile) => void;
  onNavigateUrl: (url: string) => void;
  /** Check if current user has already tapped a profile email with a given tap type */
  isTapped?: (email: string, tapType: TapType) => boolean;
  /** Send or toggle a tap/woof */
  onSendTap?: (email: string, name: string, tapType: TapType) => Promise<boolean>;
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
  const photos = Array.isArray((profile as any)?.photos) ? (profile as any).photos : [];
  for (const item of photos) {
    if (typeof item === 'string') push(item);
    else if (item && typeof item === 'object') push((item as any).url || (item as any).file_url);
  }

  // Back-compat / older shapes.
  push((profile as any)?.avatar_url);
  push((profile as any)?.avatarUrl);

  const photoUrls = (profile as any)?.photo_urls;
  if (Array.isArray(photoUrls)) {
    for (const u of photoUrls) push(u);
  }

  const images = (profile as any)?.images;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === 'string') push(img);
      else if (img && typeof img === 'object') push((img as any).url || (img as any).src || (img as any).file_url);
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

  // Production default: use simple brutalist style
  if (!normalized) return 'simple';

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

const badgeForProfileType = (profileType: string) => {
  if (profileType === 'seller') return { label: 'Seller', tone: 'hot' as const };
  if (profileType === 'creator') return { label: 'Creator', tone: 'cyan' as const };
  if (profileType === 'organizer') return { label: 'Organizer', tone: 'cyan' as const };
  return null;
};

const getProductPreviewUrls = (profile: Profile): string[] => {
  const raw = (profile as any)?.productPreviews;
  const previews = Array.isArray(raw) ? raw : [];
  const urls: string[] = [];

  for (const item of previews) {
    if (!item || typeof item !== 'object') continue;
    const url = typeof (item as any).imageUrl === 'string' ? String((item as any).imageUrl).trim() : '';
    if (!url) continue;
    if (urls.includes(url)) continue;
    urls.push(url);
  }

  return urls.slice(0, 3);
};

// Memoize ProfileCard to prevent re-renders when parent updates
function ProfileCardInner({
  profile,
  viewerLocation,
  viewerProfile,
  onOpenProfile,
  onNavigateUrl,
  isTapped,
  onSendTap,
}: Props) {
  const cardStyle = getProfileCardStyle();
  const useReactBits = cardStyle === 'react-bits';
  const useSimple = cardStyle === 'simple';

  const photoUrls = useMemo(() => getPhotoUrls(profile), [profile]);
  const productPreviewUrls = useMemo(() => getProductPreviewUrls(profile), [profile]);

  const [isActive, setIsActive] = useState(false);

  const { ref: visibilityRef, isVisible } = useVisibility({ rootMargin: '200px', threshold: 0.2, once: true });

  const cardRef = useRef<HTMLDivElement | null>(null);

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
    const raw = (profile as any)?.tags;
    return Array.isArray(raw) ? raw.map((t) => String(t)).filter(Boolean).slice(0, 3) : [];
  }, [profile]);

  const [travelTime, setTravelTime] = useState<TravelTimeResponse | null>(null);
  const [isTravelTimeLoading, setIsTravelTimeLoading] = useState(false);

  // Tap / Woof animation state (hoisted to avoid hook-in-conditional violation)
  const [tapAnim, setTapAnim] = useState(false);
  const [woofAnim, setWoofAnim] = useState(false);

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
  const hasProducts = (profile as any)?.hasProducts === true;

  const onShopClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const userId = String(profile?.userId || profile?.authUserId || '').trim();
      if (!userId) return;
      onNavigateUrl(`/market?seller_id=${encodeURIComponent(userId)}`);
    },
    [onNavigateUrl, profile?.userId, profile?.authUserId]
  );

  const primaryAction = useMemo(() => {
    if (isSeller && hasProducts) return { key: 'shop', label: 'Shop' } as const;
    if (isCreator) return { key: 'listen', label: 'Listen' } as const;
    const userId = String(profile?.userId || profile?.authUserId || '').trim();
    if (userId) return { key: 'message', label: 'Message' } as const;
    return { key: 'view', label: 'View' } as const;
  }, [hasProducts, isCreator, isSeller, profile?.userId, profile?.authUserId]);

  const onPrimaryClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (primaryAction.key === 'listen') {
        onNavigateUrl('/music/live');
        return;
      }

      if (primaryAction.key === 'shop') {
        const userId = String(profile?.userId || profile?.authUserId || '').trim();
        if (!userId) return;
        onNavigateUrl(`/market?seller_id=${encodeURIComponent(userId)}`);
        return;
      }

      if (primaryAction.key === 'message') {
        const userId = String(profile?.userId || profile?.authUserId || '').trim();
        if (!userId) return;
        onNavigateUrl(`/social/inbox?user=${encodeURIComponent(userId)}`);
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
  const hasTravelTimes = !!travelTime;
  const primaryModeShort = useMemo(() => {
    if (!primaryMode) return null;
    const mins = modeMins(primaryMode);
    if (!mins || mins === '—') return null;
    return `${modeLabel(primaryMode)} ${mins}`;
  }, [primaryMode, modeLabel, modeMins]);

  // Simple brutalist card (default)
  if (useSimple) {
    const matchPercent = typeof profile.matchProbability === 'number'
      ? Math.round(profile.matchProbability)
      : undefined;

    const status: 'online' | 'away' | 'offline' =
      (profile as any)?.is_online || (profile as any)?.onlineNow ? 'online' :
      (profile as any)?.rightNow ? 'away' : 'offline';

    // Parse looking_for tags
    const lookingFor = Array.isArray((profile as any)?.looking_for)
      ? (profile as any).looking_for.filter((t: unknown) => typeof t === 'string')
      : [];

    // Format last_seen
    const formatLastSeen = (ts: string | null | undefined): string | undefined => {
      if (!ts) return undefined;
      try {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 5) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
      } catch {
        return undefined;
      }
    };
    const lastSeen = formatLastSeen((profile as any)?.last_seen);

    const profileEmail = String((profile as any)?.email || '');
    const profileName = String(profile.profileName || 'HOTMESS');
    const hasTapSupport = !!onSendTap && !!profileEmail && !!isTapped;

    const tappedTap = hasTapSupport ? isTapped!(profileEmail, 'tap') : false;
    const tappedWoof = hasTapSupport ? isTapped!(profileEmail, 'woof') : false;

    const handleTapClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasTapSupport) return;
      setTapAnim(true);
      setTimeout(() => setTapAnim(false), 400);
      await onSendTap!(profileEmail, profileName, 'tap');
    };

    const handleWoofClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasTapSupport) return;
      setWoofAnim(true);
      setTimeout(() => setWoofAnim(false), 400);
      await onSendTap!(profileEmail, profileName, 'woof');
    };

    return (
      <div ref={attachRef as unknown as React.Ref<HTMLDivElement>} className="relative">
        <SimpleProfileCard
          id={String(profile.id)}
          name={profileName}
          photoUrl={primaryUrl || undefined}
          status={status}
          distance={primaryModeShort || undefined}
          matchPercent={matchPercent}
          isVerified={(profile as any)?.isVerified}
          lookingFor={lookingFor}
          lastSeen={lastSeen}
          onClick={openProfile}
          onMessage={
            (profile as any)?.userId || (profile as any)?.authUserId
              ? () => onNavigateUrl(`/social/inbox?user=${encodeURIComponent(String((profile as any).userId || (profile as any).authUserId))}`)
              : undefined
          }
        />
        {/* Tap / Woof overlay buttons */}
        {hasTapSupport && (
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 pointer-events-auto z-10">
            {/* Tap button */}
            <button
              type="button"
              aria-label="Tap"
              onClick={handleTapClick}
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 ${
                tappedTap || tapAnim
                  ? 'bg-[#C8962C] border-[#C8962C] text-black'
                  : 'bg-[#1C1C1E]/80 border-white/20 text-white/60'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Hand / wave icon */}
                <path d="M18 11V6a2 2 0 0 0-4 0v5" />
                <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                <path d="M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6v-3a2 2 0 0 0-4 0" />
              </svg>
            </button>
            {/* Woof button */}
            <button
              type="button"
              aria-label="Woof"
              onClick={handleWoofClick}
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-90 ${
                tappedWoof || woofAnim
                  ? 'bg-[#C8962C] border-[#C8962C] text-black'
                  : 'bg-[#1C1C1E]/80 border-white/20 text-white/60'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Paw / dog icon */}
                <circle cx="11" cy="4" r="2" />
                <circle cx="18" cy="8" r="2" />
                <circle cx="20" cy="16" r="2" />
                <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (useReactBits) {
    const handle =
      (profile as any)?.handle ||
      (profile as any)?.username ||
      initialsFromName((profile as any)?.profileName || (profile as any)?.full_name || 'HM');

    const matchLabel = typeof profile.matchProbability === 'number' 
      ? `${Math.round(profile.matchProbability)}% match`
      : null;
    
    const status =
      matchLabel || primaryModeShort || ((profile as any)?.onlineNow ? 'Online' : ((profile as any)?.rightNow ? 'Right now' : '')); 

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
            behindGlowColor={isSeller ? 'rgba(255, 20, 147, 0.55)' : 'rgba(0, 217, 255, 0.55)'}
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
                const userId = String((profile as any)?.userId || (profile as any)?.authUserId || '').trim();
                if (!userId) return;
                onNavigateUrl(`/market?seller_id=${encodeURIComponent(userId)}`);
                return;
              }

              if (primaryAction.key === 'message') {
                const userId = String((profile as any)?.userId || (profile as any)?.authUserId || '').trim();
                if (!userId) return;
                onNavigateUrl(`/social/inbox?user=${encodeURIComponent(userId)}`);
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
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl border border-glass-border bg-glass shadow-sm transition-all duration-200 hover:border-white/20 hover:shadow-lg">
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
          {/* Match probability badge */}
          {typeof profile.matchProbability === 'number' && (
            <div className="rounded-full bg-gradient-to-r from-hot to-cyan text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 shadow-lg">
              {Math.round(profile.matchProbability)}% match
            </div>
          )}

          {typeBadge ? (
            <div
              className={
                typeBadge.tone === 'hot'
                  ? 'rounded-full bg-hot text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
                  : 'rounded-full bg-cyan text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
              }
            >
              {typeBadge.label}
            </div>
          ) : null}

          {viewerLocation ? (
            <div className="rounded-full bg-black/40 border border-white/10 text-white/85 text-[10px] font-black uppercase tracking-wider px-2 py-1">
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
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={onViewClick}
                className="h-8 px-3 text-[10px] font-black uppercase tracking-wider"
              >
                View
              </Button>
            </div>

            {isSeller && hasProducts && productPreviewUrls.length > 0 ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onShopClick}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
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
                  <div className="text-[10px] font-black uppercase tracking-wider text-white/80">Drops</div>
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
              <div className="mt-3">
                <div className="text-[11px] text-white/70">
                  {viewerLocation ? (
                    isTravelTimeLoading ? (
                      'Loading travel time…'
                    ) : primaryLabel ? (
                      primaryLabel
                    ) : (
                      'Travel time unavailable'
                    )
                  ) : (
                    'Enable location for ETAs'
                  )}
                </div>

                {hasTravelTimes ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {orderedModes.map((mode) => {
                      const isPrimary = mode === primaryMode;
                      const isDisabled = mode === 'uber' ? !travelTime?.uber : false;

                      return (
                        <Button
                          key={mode}
                          type="button"
                          variant={isPrimary ? 'cyan' : 'glass'}
                          size="sm"
                          disabled={isDisabled}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openMode(mode);
                          }}
                          className={
                            isPrimary
                              ? 'justify-between'
                              : 'justify-between border-glass-border'
                          }
                        >
                          <span>{modeLabel(mode)}</span>
                          <span className="font-mono">{modeMins(mode)}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={onPrimaryClick}
                    disabled={
                      (primaryAction.key === 'shop' || primaryAction.key === 'message') &&
                      !String((profile as any)?.userId || (profile as any)?.authUserId || '').trim()
                    }
                    variant={primaryAction.key === 'message' ? 'hot' : 'cyan'}
                    className="flex-1"
                  >
                    {primaryAction.label}
                  </Button>
                  <Button
                    type="button"
                    onClick={onViewClick}
                    variant="glass"
                    className="border-glass-border"
                  >
                    Open
                  </Button>
                </div>

                <div className="mt-2 text-[11px] text-white/55">
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
                    !String((profile as any)?.userId || (profile as any)?.authUserId || '').trim()
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

// Export memoized version for performance
export const ProfileCard = React.memo(ProfileCardInner);
