import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProfileCard } from './ProfileCard';
import { useInfiniteProfiles } from './useInfiniteProfiles';
import { useVisibility } from './useVisibility';
import type { ViewerLocationResponse } from './types';
import type { Profile } from './types';
import type { LatLng } from './travelTime';
import { createUserProfileUrl } from '@/utils';
import { toast } from 'sonner';
import TelegramPanel from './TelegramPanel';
import useLiveViewerLocation from '@/hooks/useLiveViewerLocation';
import { useProfileOpener } from '@/lib/profile';
import { useTaps } from '@/hooks/useTaps';
import { supabase } from '@/components/utils/supabaseClient';

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
  /** Sort profiles after filtering. Applied before boost sort. */
  sortProfiles?: (a: Profile, b: Profile) => number;
  maxItems?: number;
  hideWhenEmpty?: boolean;
  containerClassName?: string;
  onOpenProfile?: (profile: Profile) => void;
  onNavigateUrl?: (url: string) => void;
  /** Number of columns. 3 = compact ghosted layout (gap-0.5, square cards). */
  cols?: 2 | 3;
  /** Caller-provided viewer email (used for boos). Falls back to supabase.auth.getUser(). */
  viewerEmail?: string | null;
  /** Called on long-press of a profile card (for quick action menu). */
  onLongPress?: (profile: Profile, position: { x: number; y: number }) => void;
  /** Custom component to render when grid is empty. */
  emptyComponent?: React.ReactNode;
  /** Called when a vibe/scene tag is tapped on a card (for filtering). */
  onVibeTagClick?: (tag: string) => void;
  /** User IDs with active profile_bump boost -- sorted to top of grid. */
  boostUserIds?: Set<string>;
  /** Viewer latitude — passed to API for distance sorting */
  viewerLat?: number | null;
  /** Viewer longitude — passed to API for distance sorting */
  viewerLng?: number | null;
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
  sortProfiles,
  maxItems,
  hideWhenEmpty = false,
  containerClassName = 'mx-auto max-w-6xl p-4',
  onOpenProfile,
  onNavigateUrl,
  cols,
  viewerEmail: viewerEmailProp,
  onLongPress,
  emptyComponent,
  onVibeTagClick,
  boostUserIds,
  viewerLat,
  viewerLng,
}: ProfilesGridProps) {
  const navigate = useNavigate();
  const { openProfile } = useProfileOpener();
  const { items, nextCursor, isLoadingInitial, isLoadingMore, error, loadMore, reload } = useInfiniteProfiles({
    lat: viewerLat,
    lng: viewerLng,
  });

  // Listen for pull-to-refresh events from parent
  useEffect(() => {
    const handlePullRefresh = () => { void reload(); };
    window.addEventListener('hm_pull_refresh', handlePullRefresh);
    return () => window.removeEventListener('hm_pull_refresh', handlePullRefresh);
  }, [reload]);
  const { ref: sentinelRef, isVisible: sentinelVisible } = useVisibility({ rootMargin: '600px', threshold: 0.1 });

  const prevSentinelVisibleRef = useRef(false);

  const [viewerLocation, setViewerLocation] = useState<LatLng | null>(null);
  const [viewerEmail, setViewerEmail] = useState<string | null>(viewerEmailProp ?? null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [viewerProfile, setViewerProfile] = useState<any>(null);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);

  const { isTapped, sendTap } = useTaps(viewerUserId, viewerEmail);

  // Active venue check-ins for tonight-vibe badge on profile cards
  const { data: activeCheckins = [] } = useQuery({
    queryKey: ['ghosted-active-checkins'],
    queryFn: async () => {
      const { data } = await supabase
        .from('timed_checkins')
        .select('user_id, venue_id, tonight_intention, checkin_visibility, expires_at')
        .gt('expires_at', new Date().toISOString())
        .in('checkin_visibility', ['connections', 'scene']);
      return data || [];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  type ActiveCheckin = { user_id: string; tonight_intention: string | null; checkin_visibility: string };
  const checkinByUserId = useMemo<Map<string, ActiveCheckin>>(
    () => new Map((activeCheckins as ActiveCheckin[]).map((c) => [c.user_id, c])),
    [activeCheckins]
  );

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

  // Keep viewerEmail in sync when the prop changes
  useEffect(() => {
    if (viewerEmailProp != null) {
      setViewerEmail(viewerEmailProp);
    }
  }, [viewerEmailProp]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          if (!cancelled) {
            setViewerEmail(null);
            setViewerProfile(null);
            setGpsEnabled(false);
            setViewerLocation(null);
          }
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const me = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };

        if (cancelled) return;
        const email = normalizeEmail(me?.email);
        // Only set from auth if the caller didn't supply a viewerEmail prop
        if (viewerEmailProp == null) setViewerEmail(email || null);
        setViewerUserId(user.id);
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
      } catch {
        if (cancelled) return;
        setViewerEmail(null);
        setViewerProfile(null);
        setGpsEnabled(false);
        setViewerLocation(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewerEmailProp]);

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
    // Safety fallback: if filters drop ALL profiles but data exists, show unfiltered
    const safeFiltered = filtered.length === 0 && base.length > 0 ? base : filtered;

    // Apply caller-provided sort (e.g. distance, last_active, newest)
    const sorted = typeof sortProfiles === 'function' ? [...safeFiltered].sort(sortProfiles) : safeFiltered;

    const prioritized = prioritizeViewerFirst(sorted, viewerEmail);

    // Sort boosted (profile_bump) users to top of grid
    let result = prioritized;
    if (boostUserIds && boostUserIds.size > 0) {
      result = [...prioritized].sort((a, b) => {
        const aId = String((a as any)?.authUserId || (a as any)?.userId || a.id || '');
        const bId = String((b as any)?.authUserId || (b as any)?.userId || b.id || '');
        const aBoosted = boostUserIds.has(aId) ? 1 : 0;
        const bBoosted = boostUserIds.has(bId) ? 1 : 0;
        return bBoosted - aBoosted; // boosted first
      });
    }

    if (typeof maxItems === 'number') return result.slice(0, Math.max(0, maxItems));
    return result;
  }, [filterProfiles, sortProfiles, items, maxItems, viewerEmail, boostUserIds]);

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
        const updatePayload = { has_consented_gps: true }; const { data: { session: s } } = await supabase.auth.getSession(); if (s?.user) { await supabase.auth.updateUser({ data: updatePayload }); await supabase.from("profiles").update(updatePayload).eq("id", s.user.id); }
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
    // Allow external override
    if (onOpenProfile) return onOpenProfile(profile);

    // Use canonical profile opener (Stage 4)
    // Note: email removed from API for privacy - use userId only
    openProfile({
      userId: String((profile as any).userId || (profile as any).authUserId || profile.id),
      source: 'grid',
    });
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

        {!isLoadingInitial && displayItems.length === 0 && emptyComponent ? (
          <div className="flex items-center justify-center min-h-[400px]">
            {emptyComponent}
          </div>
        ) : (
          <div className={cols === 3
            ? 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5'
            : 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'
          }>
            {displayItems.map((profile) => (
              <div key={profile.id} className="aspect-[3/4] overflow-hidden">
                <ProfileCard
                  profile={profile}
                  viewerLocation={viewerLocation}
                  viewerProfile={viewerProfile}
                  onOpenProfile={handleOpenProfile}
                  onNavigateUrl={handleNavigateUrl}
                  isTapped={isTapped}
                  onSendTap={sendTap}
                  onLongPress={onLongPress}
                  checkin={checkinByUserId.get(profile.id) || null}
                  onVibeTagClick={onVibeTagClick}
                />
              </div>
            ))}

            {Array.from({ length: skeletonCount }).map((_, idx) => (
              <SkeletonCard key={`sk-${idx}`} />
            ))}
          </div>
        )}

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
