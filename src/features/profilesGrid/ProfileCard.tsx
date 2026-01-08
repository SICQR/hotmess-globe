import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Profile, TravelTimeResponse } from './types';
import { fetchTravelTime, type LatLng } from './travelTime';
import { useLongPress } from './useLongPress';
import { useVisibility } from './useVisibility';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
import { buildGoogleMapsDirectionsLink } from '@/utils/mapsDeepLink';
import { Button } from '@/components/ui/button';
import { buildProfileRecText, recommendTravelModes, type TravelModeKey } from '@/utils/travelRecommendations';

type Props = {
  profile: Profile;
  viewerLocation: LatLng | null;
  viewerProfile?: unknown;
  onOpenProfile: (profile: Profile) => void;
  onNavigateUrl: (url: string) => void;
};

const pickPrimaryPhotoUrl = (profile: Profile): string | null => {
  const photos = Array.isArray(profile.photos) ? profile.photos : [];
  const primary = photos.find((p) => p.isPrimary);
  return (primary || photos[0])?.url || null;
};

const supportsHover = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(hover: hover)').matches ?? false;
};

const normalizeProfileType = (value: unknown) => String(value || '').trim().toLowerCase();

export function ProfileCard({
  profile,
  viewerLocation,
  viewerProfile,
  onOpenProfile,
  onNavigateUrl,
}: Props) {
  const photos = Array.isArray(profile.photos) ? profile.photos : [];
  const photoUrls = photos.map((p) => p.url).filter((u) => !!u);

  const [isActive, setIsActive] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

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

  const tags = useMemo(() => {
    const raw = (profile as any)?.tags;
    return Array.isArray(raw) ? raw.map((t) => String(t)).filter(Boolean).slice(0, 3) : [];
  }, [profile]);

  const [travelTime, setTravelTime] = useState<TravelTimeResponse | null>(null);
  const [isTravelTimeLoading, setIsTravelTimeLoading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    if (!viewerLocation) return;

    let cancelled = false;
    const controller = new AbortController();
    const refreshMs = 2 * 60 * 1000;

    const run = () => {
      setIsTravelTimeLoading(true);
      fetchTravelTime({ viewer: viewerLocation, destination, signal: controller.signal })
        .then((value) => {
          if (cancelled) return;
          setTravelTime(value);
        })
        .finally(() => {
          if (cancelled) return;
          setIsTravelTimeLoading(false);
        });
    };

    // Prime immediately, then keep results reasonably fresh (cab traffic in particular).
    run();
    const id = window.setInterval(run, refreshMs);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, [destination, isVisible, viewerLocation]);

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

  const onOpenMaps = useCallback(
    (mode: 'walk' | 'cab' | 'bike') => {
      const url = buildGoogleMapsDirectionsLink({
        destinationLat: profile.geoLat,
        destinationLng: profile.geoLng,
        mode,
      });
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [profile.geoLat, profile.geoLng]
  );

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

      onOpenMaps(mode === 'foot' ? 'walk' : mode === 'cab' ? 'cab' : 'bike');
    },
    [onOpenMaps, profile.geoLat, profile.geoLng, profile.profileName]
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

  const primaryAction = useMemo(() => {
    if (isSeller) return { key: 'shop', label: 'Shop' } as const;
    if (isCreator) return { key: 'listen', label: 'Listen' } as const;
    const email = String(profile?.email || '').trim();
    if (email) return { key: 'message', label: 'Message' } as const;
    return { key: 'view', label: 'View' } as const;
  }, [isCreator, isSeller, profile?.email]);

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

  const canSwipe = isActive && photoUrls.length > 1;

  const pointerStateRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    isDown: boolean;
    hasMoved: boolean;
    wasSwipe: boolean;
    suppressClick: boolean;
  }>({
    startX: 0,
    startY: 0,
    lastX: 0,
    isDown: false,
    hasMoved: false,
    wasSwipe: false,
    suppressClick: false,
  });

  const clampIndex = (idx: number) => {
    if (!photoUrls.length) return 0;
    const m = ((idx % photoUrls.length) + photoUrls.length) % photoUrls.length;
    return m;
  };

  const advance = (delta: number) => {
    setPhotoIndex((prev) => clampIndex(prev + delta));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canSwipe) return;
    pointerStateRef.current.isDown = true;
    pointerStateRef.current.hasMoved = false;
    pointerStateRef.current.wasSwipe = false;
    pointerStateRef.current.startX = e.clientX;
    pointerStateRef.current.startY = e.clientY;
    pointerStateRef.current.lastX = e.clientX;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!canSwipe) return;
    if (!pointerStateRef.current.isDown) return;

    const dx = e.clientX - pointerStateRef.current.startX;
    const dy = e.clientY - pointerStateRef.current.startY;

    if (Math.hypot(dx, dy) > 8) {
      pointerStateRef.current.hasMoved = true;
    }

    // Horizontal intent to swipe.
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      pointerStateRef.current.wasSwipe = true;
    }

    pointerStateRef.current.lastX = e.clientX;
  };

  const onPointerUp = () => {
    if (!canSwipe) return;

    const st = pointerStateRef.current;
    if (!st.isDown) return;
    st.isDown = false;

    const dx = st.lastX - st.startX;

    if (st.wasSwipe && Math.abs(dx) > 40) {
      // Prevent click navigation after swipe.
      st.suppressClick = true;
      advance(dx < 0 ? 1 : -1);
      window.setTimeout(() => {
        st.suppressClick = false;
      }, 250);
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const st = pointerStateRef.current;
    if (st.suppressClick || st.wasSwipe || st.hasMoved || isLongPressActive || didLongPress) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    openProfile();
  };

  const primaryUrl = pickPrimaryPhotoUrl(profile);
  const currentUrl = isActive ? (photoUrls[photoIndex] || primaryUrl) : primaryUrl;

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
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg bg-black/10">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={profile.profileName}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-black/10" />
        )}

        {/* Always-visible footer scrim + View button */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-2 pointer-events-auto">
          {viewerLocation && (
            <div className="mb-1 text-[11px] text-white/80 truncate">
              {isTravelTimeLoading ? (
                <span className="text-white/70">Loading travel time…</span>
              ) : primaryLabel ? (
                <span className="text-white/90">{primaryLabel}</span>
              ) : (
                <span className="text-white/70">Travel time unavailable</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onViewClick}
            className="w-full rounded-md bg-white/10 border border-white/20 text-white text-xs font-semibold py-2"
          >
            View profile
          </button>
        </div>

        {isActive && (
          <>
            {/* Gradient scrim for readability */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Swipe capture layer */}
            <div
              className="absolute inset-0"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />

            {/* Overlay panel */}
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="rounded-md bg-black/50 backdrop-blur-sm p-2">
                <div className="text-sm font-semibold text-white leading-tight">
                  {profile.profileName}
                </div>
                <div className="text-xs text-white/80 truncate">{headline}</div>
                <div className="mt-1 text-[11px] text-white/70">{locationLine}</div>

                {tags.length > 0 && (
                  <div className="mt-1 text-[11px] text-white/70 truncate">
                    {tags.join(' • ')}
                  </div>
                )}

                <div className="mt-2">
                  {isTravelTimeLoading ? (
                    <div className="text-[11px] text-white/70">Loading travel time…</div>
                  ) : travelTime ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {orderedModes.map((mode) => {
                          const isPrimary = mode === primaryMode;
                          const isDisabled = mode === 'uber' ? !travelTime?.uber : false;

                          return (
                            <Button
                              key={mode}
                              type="button"
                              variant={isPrimary ? 'default' : 'outline'}
                              size="sm"
                              disabled={isDisabled}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openMode(mode);
                              }}
                              className={
                                isPrimary
                                  ? 'bg-white/90 text-black hover:bg-white'
                                  : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                              }
                            >
                              <span className="flex w-full items-center justify-between gap-2">
                                <span>{modeLabel(mode)}</span>
                                <span className="font-mono">{modeMins(mode)}</span>
                              </span>
                            </Button>
                          );
                        })}
                      </div>

                      <div className="mt-2 text-[11px] text-white/60">
                        Estimates • Choose what feels safest
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-white/70">Travel time unavailable</div>
                  )}
                </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onPrimaryClick}
                      disabled={
                        (primaryAction.key === 'shop' || primaryAction.key === 'message') &&
                        !String(profile?.email || '').trim()
                      }
                      className="flex-1 rounded-md bg-white/90 text-black text-xs font-semibold py-2 disabled:opacity-50"
                    >
                      {primaryAction.label}
                    </button>
                    <button
                      type="button"
                      onClick={onViewClick}
                      className="rounded-md bg-white/10 border border-white/20 text-white text-xs font-semibold px-3 py-2"
                    >
                      View
                    </button>
                  </div>

                {photoUrls.length > 1 && (
                  <div className="mt-2 flex items-center gap-1">
                    {photoUrls.map((_, idx) => (
                      <div
                        key={idx}
                        className={
                          idx === photoIndex
                            ? 'h-1.5 w-1.5 rounded-full bg-white'
                            : 'h-1.5 w-1.5 rounded-full bg-white/40'
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
