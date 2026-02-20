import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from './ProfileCard';
import { useInfiniteProfiles } from './useInfiniteProfiles';
import { useVisibility } from './useVisibility';
import type { ViewerLocationResponse } from './types';
import type { Profile } from './types';
import type { LatLng } from './travelTime';
import { base44 } from '@/api/base44Client';
import { createUserProfileUrl } from '@/utils';
import { toast } from 'sonner';
import TelegramPanel from './TelegramPanel';
import useLiveViewerLocation from '@/hooks/useLiveViewerLocation';

const SkeletonCard = () => {
  return (
    <div className="w-full aspect-[4/5] rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
  );
};

export type ProfilesGridProps = {
  showHeader?: boolean;
  showTelegramFeedButton?: boolean;
  headerTitle?: string;
  filterProfiles?: (profile: Profile) => boolean;
  maxItems?: number;
  hideWhenEmpty?: boolean;
  containerClassName?: string;
  onOpenProfile?: (profile: Profile) => void;
  onNavigateUrl?: (url: string) => void;
};

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

const prioritizeViewerFirst = (profiles: Profile[], viewerEmail: string | null): Profile[] => {
  const target = normalizeEmail(viewerEmail);
  if (!target) return profiles;

  let viewer: Profile | null = null;
  const out: Profile[] = [];
  const seenEmails = new Set<string>();

  for (const profile of profiles) {
    const email = normalizeEmail(profile?.email);
    if (email) {
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);
    }

    if (email && email === target) {
      viewer = profile;
      continue;
    }

    out.push(profile);
  }

  return viewer ? [viewer, ...out] : out;
};


export default function ProfilesGrid({
  showHeader = true,
  showTelegramFeedButton = showHeader,
  headerTitle = 'People',
  filterProfiles,
  maxItems,
  hideWhenEmpty = false,
  containerClassName = 'mx-auto max-w-6xl p-4',
  onOpenProfile,
  onNavigateUrl,
}: ProfilesGridProps) {
  const navigate = useNavigate();
  const { items, nextCursor, isLoadingInitial, isLoadingMore, error, loadMore } = useInfiniteProfiles();
  const { ref: sentinelRef, isVisible: sentinelVisible } = useVisibility({ rootMargin: '600px', threshold: 0.1 });

  const prevSentinelVisibleRef = useRef(false);

  const [viewerLocation, setViewerLocation] = useState<LatLng | null>(null);
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<any>(null);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);

  const [gpsEnabled, setGpsEnabled] = useState(false);

  const { location: liveLocation } = useLiveViewerLocation({
    enabled: gpsEnabled,
    enableHighAccuracy: false,
    timeoutMs: 10_000,
    maximumAgeMs: 15_000,
    minUpdateMs: 10_000,
    minDistanceM: 25,
  });

  useEffect(() => {
    setViewerLocation(liveLocation);
  }, [liveLocation]);

  useEffect(() => {
    let cancelled = false;

    base44.auth
      .me()
      .then(async (me) => {
        if (cancelled) return;
        const email = normalizeEmail(me?.email);
        setViewerEmail(email || null);
        setViewerProfile(me || null);

        // Prefer device GPS when the viewer has explicitly consented.
        // This unlocks Google-backed travel time (via /api/travel-time) with real origin coords.
        const hasGpsConsent = !!me?.has_consented_gps;
        setGpsEnabled(hasGpsConsent);
        if (hasGpsConsent) return;

        // Dev-only fallback: useful for demos/tests without requesting GPS.
        if (import.meta.env.DEV) {
          try {
            const res = await fetch('/api/viewer-location', { method: 'GET' });
            if (!res.ok) {
              setViewerLocation(null);
              return;
            }
            const data: unknown = await res.json();
            if (!data || typeof data !== 'object') {
              setViewerLocation(null);
              return;
            }
            const v = data as ViewerLocationResponse;
            if (!Number.isFinite(v.geoLat) || !Number.isFinite(v.geoLng)) {
              setViewerLocation(null);
              return;
            }
            setViewerLocation({ lat: v.geoLat, lng: v.geoLng });
          } catch {
            setViewerLocation(null);
          }
          return;
        }

        setViewerLocation(null);
      })
      .catch(() => {
        if (cancelled) return;
        setViewerEmail(null);
        setViewerProfile(null);
        setGpsEnabled(false);
        setViewerLocation(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const wasVisible = prevSentinelVisibleRef.current;
    prevSentinelVisibleRef.current = sentinelVisible;

    // Trigger only on edge: false -> true.
    if (!sentinelVisible || wasVisible) return;
    // If we're rendering a limited embed (e.g. Top Sellers), don't use sentinel scrolling.
    if (typeof maxItems === 'number') return;
    if (isLoadingInitial || isLoadingMore) return;
    void loadMore();
  }, [isLoadingInitial, isLoadingMore, loadMore, maxItems, sentinelVisible]);

  const displayItems = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const filtered = typeof filterProfiles === 'function' ? base.filter(filterProfiles) : base;
    const prioritized = prioritizeViewerFirst(filtered, viewerEmail);
    if (typeof maxItems === 'number') return prioritized.slice(0, Math.max(0, maxItems));
    return prioritized;
  }, [filterProfiles, items, maxItems, viewerEmail]);

  const totalFilteredCount = useMemo(() => {
    if (typeof maxItems !== 'number') return null;
    if (typeof filterProfiles !== 'function') return null;
    const base = Array.isArray(items) ? items : [];
    return base.filter(filterProfiles).length;
  }, [filterProfiles, items, maxItems]);

  // For limited embeds (e.g. Top Sellers), keep fetching pages until we fill `maxItems` or run out.
  useEffect(() => {
    if (typeof maxItems !== 'number') return;
    if (typeof filterProfiles !== 'function') return;
    if (isLoadingInitial || isLoadingMore) return;
    if (typeof totalFilteredCount !== 'number') return;

    const hasMore = nextCursor !== null;
    if (!hasMore) return;
    if (totalFilteredCount >= maxItems) return;

    void loadMore();
  }, [filterProfiles, isLoadingInitial, isLoadingMore, loadMore, maxItems, nextCursor, totalFilteredCount]);

  const skeletonCount = useMemo(() => {
    if (isLoadingInitial && items.length === 0) return 12;
    if (isLoadingMore) return 8;
    return 0;
  }, [isLoadingInitial, isLoadingMore, items.length]);

  const handleNavigateUrl = (url: string) => {
    if (onNavigateUrl) return onNavigateUrl(url);
    navigate(url);
  };

  const showEnableLocationCta = !!viewerEmail && !gpsEnabled;

  const handleEnableLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device');
      return;
    }

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 15_000,
          timeout: 10_000,
        });
      });

      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setViewerLocation(next);
      setGpsEnabled(true);

      // Persist consent in auth metadata (and profile table when available).
      try {
        await base44.auth.updateMe({ has_consented_gps: true });
      } catch {
        // Non-fatal: location can still work for this session.
      }

      toast.success('Location enabled');
    } catch (err: any) {
      const code = Number(err?.code);
      if (code === 1) toast.error('Location permission denied');
      else toast.error('Could not get your location');
    }
  };

  const handleOpenProfile = (profile: Profile) => {
    if (onOpenProfile) return onOpenProfile(profile);

    return handleNavigateUrl(createUserProfileUrl(profile));
  };

  return (
    <div className="w-full">
      <div className={containerClassName}>
        {showEnableLocationCta && (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-sm font-semibold text-white">Enable location to see travel time</div>
            <div className="mt-1 text-xs text-white/60">Travel time uses your current location.</div>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleEnableLocation}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-black/5"
              >
                Enable location
              </button>
            </div>
          </div>
        )}
        {(showHeader || showTelegramFeedButton) && (
          <div
            className={
              showHeader
                ? 'mb-4 sticky top-0 z-20 bg-background py-2 md:static md:z-auto md:bg-transparent md:py-0'
                : 'mb-3 sticky top-0 z-20 bg-background py-2 md:static md:z-auto md:bg-transparent md:py-0'
            }
          >
            <div className="flex items-center gap-3">
              {showHeader && <div className="text-sm font-semibold text-foreground">{headerTitle}</div>}
              {showTelegramFeedButton && (
                <button
                  type="button"
                  onClick={() => setIsTelegramOpen(true)}
                  className="ml-auto rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-black/5"
                >
                  Hotmess Feed
                </button>
              )}
            </div>
          </div>
        )}

        {hideWhenEmpty && !isLoadingInitial && displayItems.length === 0 ? null : (
          <>

        {error && (
          <div className="mb-4 rounded-md border border-border bg-background p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {displayItems.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              viewerLocation={viewerLocation}
              viewerProfile={viewerProfile}
              onOpenProfile={handleOpenProfile}
              onNavigateUrl={handleNavigateUrl}
            />
          ))}

          {Array.from({ length: skeletonCount }).map((_, idx) => (
            <SkeletonCard key={`sk-${idx}`} />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {typeof maxItems === 'number' ? null : (
          <div ref={sentinelRef as unknown as React.Ref<HTMLDivElement>} className="h-10" />
        )}
          </>
        )}
      </div>

      <TelegramPanel open={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />
    </div>
  );
}
