import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Profile, TravelTimeResponse } from './types';
import { fetchTravelTime, type LatLng } from './travelTime';
import { useLongPress } from './useLongPress';
import { useVisibility } from './useVisibility';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
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
      if (cancelled) return;
      if (controller.signal.aborted) return;
      setIsTravelTimeLoading(true);

      // `fetchTravelTime` may throw synchronously if passed an already-aborted signal.
      Promise.resolve()
        .then(() => fetchTravelTime({ viewer: viewerLocation, destination, signal: controller.signal }))
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
    const id = window.setInterval(run, refreshMs);
    return () => {
      window.clearInterval(id);
      cancelled = true;
      try {
        controller.abort();
      } catch {
        // ignore
      }
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

  const typeBadge = useMemo(() => badgeForProfileType(profileType), [profileType]);
  const hasTravelTimes = !!travelTime;
  const primaryModeShort = useMemo(() => {
    if (!primaryMode) return null;
    const mins = modeMins(primaryMode);
    if (!mins || mins === '—') return null;
    return `${modeLabel(primaryMode)} ${mins}`;
  }, [primaryMode, modeLabel, modeMins]);

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
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm transition-all duration-200 hover:border-white/20 hover:shadow-lg">
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
          {typeBadge ? (
            <div
              className={
                typeBadge.tone === 'hot'
                  ? 'rounded-full bg-[#FF1493] text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
                  : 'rounded-full bg-[#00D9FF] text-black text-[10px] font-black uppercase tracking-wider px-2 py-1'
              }
            >
              {typeBadge.label}
            </div>
          ) : null}

          {viewerLocation ? (
            <div className="rounded-full bg-black/40 border border-white/15 text-white/85 text-[10px] font-black uppercase tracking-wider px-2 py-1">
              {isTravelTimeLoading ? 'Loading…' : primaryModeShort ? `Rec ${primaryModeShort}` : 'No ETA'}
            </div>
          ) : null}
        </div>

        {isActive && (
          <>
            {/* Swipe capture layer */}
            <div
              className="absolute inset-0"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </>
        )}

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
                              : 'justify-between border-white/15'
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
                      !String(profile?.email || '').trim()
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
                    className="border-white/15"
                  >
                    Open
                  </Button>
                </div>

                <div className="mt-2 text-[11px] text-white/55">
                  Estimates • Ask first. Confirm yes.
                </div>

                {photoUrls.length > 1 ? (
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
                ) : null}
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
