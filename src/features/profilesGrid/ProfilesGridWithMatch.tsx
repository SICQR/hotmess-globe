import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProfileCard } from './ProfileCard';
import { useMatchProfiles } from './useMatchProfiles';
import { useVisibility } from './useVisibility';
import { SortSelector, SortPills } from './SortSelector';
import type { Profile, SortOption } from './types';
import type { LatLng } from './travelTime';
import { base44 } from '@/api/base44Client';
import { createUserProfileUrl } from '@/utils';
import { toast } from 'sonner';
import TelegramPanel from './TelegramPanel';
import useLiveViewerLocation from '@/hooks/useLiveViewerLocation';
import { Sparkles, MapPin } from 'lucide-react';

const SkeletonCard = () => {
  return (
    <div className="w-full aspect-[4/5] rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
  );
};

export type ProfilesGridWithMatchProps = {
  showHeader?: boolean;
  showTelegramFeedButton?: boolean;
  showSortSelector?: boolean;
  headerTitle?: string;
  filterProfiles?: (profile: Profile) => boolean;
  maxItems?: number;
  hideWhenEmpty?: boolean;
  containerClassName?: string;
  defaultSort?: SortOption;
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

export default function ProfilesGridWithMatch({
  showHeader = true,
  showTelegramFeedButton = showHeader,
  showSortSelector = true,
  headerTitle = 'Discover',
  filterProfiles,
  maxItems,
  hideWhenEmpty = false,
  containerClassName = 'mx-auto max-w-6xl p-4',
  defaultSort = 'match',
  onOpenProfile,
  onNavigateUrl,
}: ProfilesGridWithMatchProps) {
  const [sort, setSort] = useState<SortOption>(defaultSort);
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

  // Fetch match-scored profiles
  const {
    items,
    nextCursor,
    scoringVersion,
    isLoadingInitial,
    isLoadingMore,
    error,
    loadMore,
  } = useMatchProfiles({
    viewerLat: viewerLocation?.lat,
    viewerLng: viewerLocation?.lng,
    sort,
    limit: 40,
    enabled: true,
  });

  const { ref: sentinelRef, isVisible: sentinelVisible } = useVisibility({ 
    rootMargin: '600px', 
    threshold: 0.1 
  });

  const prevSentinelVisibleRef = useRef(false);

  // Load user info
  useEffect(() => {
    let cancelled = false;

    base44.auth
      .me()
      .then(async (me) => {
        if (cancelled) return;
        const email = normalizeEmail(me?.email);
        setViewerEmail(email || null);
        setViewerProfile(me || null);

        const hasGpsConsent = !!me?.has_consented_gps;
        setGpsEnabled(hasGpsConsent);
        if (hasGpsConsent) return;

        // Dev fallback
        if (import.meta.env.DEV) {
          try {
            const res = await fetch('/api/viewer-location', { method: 'GET' });
            if (!res.ok) {
              setViewerLocation(null);
              return;
            }
            const data = await res.json();
            if (data && Number.isFinite(data.geoLat) && Number.isFinite(data.geoLng)) {
              setViewerLocation({ lat: data.geoLat, lng: data.geoLng });
            }
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

  // Infinite scroll trigger
  useEffect(() => {
    const wasVisible = prevSentinelVisibleRef.current;
    prevSentinelVisibleRef.current = sentinelVisible;

    if (!sentinelVisible || wasVisible) return;
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

  const skeletonCount = useMemo(() => {
    if (isLoadingInitial && items.length === 0) return 12;
    if (isLoadingMore) return 8;
    return 0;
  }, [isLoadingInitial, isLoadingMore, items.length]);

  const handleNavigateUrl = (url: string) => {
    if (onNavigateUrl) return onNavigateUrl(url);
    window.location.href = url;
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

      try {
        await base44.auth.updateMe({ has_consented_gps: true });
      } catch {
        // Non-fatal
      }

      toast.success('Location enabled - match scores updated!');
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

  // Stats for header
  const matchedCount = displayItems.filter(p => p.matchProbability !== undefined).length;
  const avgMatch = matchedCount > 0
    ? Math.round(displayItems.reduce((sum, p) => sum + (p.matchProbability || 0), 0) / matchedCount)
    : null;

  return (
    <div className="w-full">
      <div className={containerClassName}>
        {/* Location CTA */}
        {showEnableLocationCta && (
          <div className="mb-4 rounded-lg border border-[#FF1493]/30 bg-gradient-to-r from-[#FF1493]/10 to-[#B026FF]/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF1493]/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#FF1493]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">Enable location for better matches</div>
                <div className="mt-1 text-xs text-white/60">
                  Location helps calculate travel time and improves match accuracy.
                </div>
                <button
                  type="button"
                  onClick={handleEnableLocation}
                  className="mt-3 rounded-lg bg-[#FF1493] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#FF1493]/80 transition-colors"
                >
                  Enable Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header with Sort */}
        {(showHeader || showTelegramFeedButton || showSortSelector) && (
          <div className="mb-4 sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-white/5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {showHeader && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#FF1493]" />
                    <span className="text-sm font-bold text-white">{headerTitle}</span>
                    {avgMatch !== null && (
                      <span className="text-xs text-white/50">
                        ({avgMatch}% avg match)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {showSortSelector && (
                  <div className="hidden sm:block">
                    <SortSelector
                      value={sort}
                      onChange={setSort}
                      disabled={isLoadingInitial}
                    />
                  </div>
                )}
                {showTelegramFeedButton && (
                  <button
                    type="button"
                    onClick={() => setIsTelegramOpen(true)}
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
                  >
                    Feed
                  </button>
                )}
              </div>
            </div>

            {/* Mobile sort pills */}
            {showSortSelector && (
              <div className="sm:hidden mt-3">
                <SortPills
                  value={sort}
                  onChange={setSort}
                  disabled={isLoadingInitial}
                />
              </div>
            )}
          </div>
        )}

        {/* Scoring version indicator (dev only) */}
        {import.meta.env.DEV && scoringVersion && scoringVersion !== 'fallback' && (
          <div className="mb-2 text-[10px] text-white/30 font-mono">
            Scoring v{scoringVersion} · {displayItems.length} profiles
          </div>
        )}

        {hideWhenEmpty && !isLoadingInitial && displayItems.length === 0 ? null : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
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

            {/* Load more indicator */}
            {isLoadingMore && (
              <div className="mt-4 text-center text-xs text-white/50">
                Loading more profiles...
              </div>
            )}

            {/* End of results */}
            {!isLoadingInitial && !isLoadingMore && nextCursor === null && displayItems.length > 0 && (
              <div className="mt-6 text-center text-xs text-white/40">
                You've seen all {displayItems.length} profiles
              </div>
            )}
          </>
        )}
      </div>

      <TelegramPanel open={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />
    </div>
  );
}
