import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { PAGINATION, QUERY_CONFIG } from '../components/utils/constants';
import { Users, Zap, Heart, Filter, Grid3x3, MapPin, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import FiltersDrawer from '../components/discovery/FiltersDrawer';
import RightNowModal from '../components/discovery/RightNowModal';
import TutorialTooltip from '../components/tutorial/TutorialTooltip';
import { valuesToSearchParams, searchParamsToValues, applyLocalFilters } from '../components/discovery/queryBuilder';
import { useTaxonomy } from '../components/taxonomy/useTaxonomy';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';
import { debounce } from 'lodash';
import { generateMatchExplanations, promoteTopMatches } from '../components/discovery/AIMatchmaker';
import { fetchNearbyCandidates } from '@/api/connectProximity';
import ProfilesGrid from '@/features/profilesGrid/ProfilesGrid';
import { ProfileCard } from '@/features/profilesGrid/ProfileCard';
import { useNavigate } from 'react-router-dom';
import useLiveViewerLocation, { bucketLatLng } from '@/hooks/useLiveViewerLocation';
import useRealtimeNearbyInvalidation from '@/hooks/useRealtimeNearbyInvalidation';
import { KineticHeadline } from '@/components/text/KineticHeadline';
import { getProfileUrl } from '@/lib/userPrivacy';
import { LuxHeroBanner, LuxPageBanner } from '@/components/lux/LuxBanner';
import { LuxLiveCounter } from '@/components/lux/LiveCounter';
import { LuxMediumRectangleAd } from '@/components/lux/AdSlot';

const isMaleAllowedProfile = (u) => {
  const gender = String(u?.gender_identity || u?.gender || u?.sex || '').trim().toLowerCase();
  const isFemale = gender === 'f' || gender.includes('female') || gender.includes('woman');
  if (isFemale) return false;

  const rawAck = u?.photo_policy_ack ?? u?.photoPolicyAck;
  if (rawAck === false) return false;

  return true;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export default function Connect() {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [lane, setLane] = useState('browse');
  const [showFilters, setShowFilters] = useState(false);
  const [showRightNow, setShowRightNow] = useState(false);
  const [page, setPage] = useState(1);
  const { cfg, idx } = useTaxonomy();
  const [aiMatchExplanations, setAiMatchExplanations] = useState({});

  const hasGpsConsent = !!currentUser?.has_consented_gps;
  const { location: liveLocation } = useLiveViewerLocation({
    enabled: !!currentUser?.email && hasGpsConsent,
    enableHighAccuracy: false,
    timeoutMs: 10_000,
    maximumAgeMs: 15_000,
    minUpdateMs: 10_000,
    minDistanceM: 25,
  });
  const locationBucket = useMemo(() => bucketLatLng(liveLocation, 3), [liveLocation]);

  useRealtimeNearbyInvalidation({
    enabled: !!currentUser?.email && hasGpsConsent && !!locationBucket,
    queryKeys: [['connect-nearby', currentUser?.email, locationBucket?.lat, locationBucket?.lng]],
    minInvalidateMs: 5000,
  });

  // Use global cached users - MUST be before any conditional returns
  const { data: allUsers = [], isLoading: usersLoading } = useAllUsers();

  const { data: userTags = [] } = useQuery({
    queryKey: ['user-tags'],
    queryFn: () => base44.entities.UserTag.list(),
    enabled: !!currentUser
  });

  const { data: userTribes = [] } = useQuery({
    queryKey: ['user-tribes'],
    queryFn: () => base44.entities.UserTribe.list(),
    enabled: !!currentUser
  });

  const { data: rightNowStatuses = [] } = useQuery({
    queryKey: ['right-now-status'],
    queryFn: () => base44.entities.RightNowStatus.filter({ active: true }),
    enabled: !!currentUser,
    refetchInterval: QUERY_CONFIG.REFETCH_INTERVAL_MEDIUM
  });

  const { data: nearbyPayload } = useQuery({
    queryKey: ['connect-nearby', currentUser?.email, locationBucket?.lat, locationBucket?.lng],
    queryFn: async () => {
      if (!currentUser?.has_consented_gps) return { candidates: [], _meta: { status: 'gps_consent_off' } };
      if (!locationBucket) return { candidates: [], _meta: { status: 'geolocation_pending' } };

      try {

        const payload = await fetchNearbyCandidates({
          lat: locationBucket.lat,
          lng: locationBucket.lng,
          radiusMeters: 10_000,
          limit: 80,
          approximate: true,
        });

        if (!payload || typeof payload !== 'object') return { candidates: [], _meta: { status: 'nearby_unavailable' } };
        return { ...payload, _meta: { status: 'ok' } };
      } catch {
        return { candidates: [], _meta: { status: 'nearby_unavailable' } };
      }
    },
    enabled: !!currentUser?.email && !!currentUser?.has_consented_gps,
    staleTime: 10_000,
    cacheTime: 60_000,
    refetchInterval: hasGpsConsent && locationBucket ? 30_000 : false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const nearbyByEmail = useMemo(() => {
    const map = new Map();
    const candidates = Array.isArray(nearbyPayload?.candidates) ? nearbyPayload.candidates : [];

    for (const candidate of candidates) {
      const email = candidate?.profile?.email;
      if (!email) continue;
      const distanceMeters = candidate?.distance_meters;
      const distanceKm = Number.isFinite(distanceMeters) ? distanceMeters / 1000 : null;
      map.set(String(email).toLowerCase(), {
        distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null,
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
        etaSeconds: Number.isFinite(candidate?.eta_seconds) ? candidate.eta_seconds : null,
        etaMode: candidate?.eta_mode ?? null,
      });
    }

    return map;
  }, [nearbyPayload]);

  const proximityStatus = nearbyPayload?._meta?.status || (currentUser?.has_consented_gps ? 'idle' : 'gps_consent_off');

  // Build defaults from taxonomy config
  const defaults = useMemo(() => {
    if (!cfg || !cfg.filters) return {};
    const d = {};
    if (cfg.filters.quickToggles) {
      for (const t of cfg.filters.quickToggles) d[t.id] = t.default;
    }
    if (cfg.filters.groups) {
      for (const g of cfg.filters.groups) {
        for (const f of g.fields) {
          d[f.id] = typeof f.default !== "undefined" ? f.default : null;
        }
      }
    }
    return d;
  }, [cfg]);

  // Initialize filters from URL params
  const [filters, setFilters] = useState({});

  // Apply query builder filters with memoization and debouncing for performance
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  
  const debouncedSetFilters = useMemo(
    () => debounce((newFilters) => setDebouncedFilters(newFilters), 150),
    []
  );

  // Initialize filters when cfg is ready
  useEffect(() => {
    if (cfg && Object.keys(filters).length === 0) {
      const sp = new URLSearchParams(window.location.search);
      setFilters(searchParamsToValues(sp, defaults));
    }
  }, [cfg, defaults, filters]);

  useEffect(() => {
    if (currentUser) {
      setLane(currentUser.discovery_lane || 'browse');
    }
  }, [currentUser]);

  useEffect(() => {
    debouncedSetFilters(filters);
  }, [filters, debouncedSetFilters]);

  // ALL hooks must be called before conditional returns
  const currentUserTags = useMemo(() => {
    if (!currentUser) return [];
    return userTags.filter(t => t.user_email === currentUser.email);
  }, [currentUser, userTags]);

  // Haversine distance calculation (in km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Build profile objects for filtering
  const profiles = useMemo(() => {
    if (!currentUser) return [];
    return allUsers
      .filter(u => {
        if (!isMaleAllowedProfile(u)) return false;
        return true;
      })
      .map(u => {
        const uTags = userTags.filter(t => t.user_email === u.email);
        const uTribes = userTribes.filter(t => t.user_email === u.email);
        const proximity = nearbyByEmail.get(String(u.email || '').toLowerCase()) || null;

        const isSelf = normalizeEmail(u?.email) && normalizeEmail(u?.email) === normalizeEmail(currentUser?.email);
        
        const photos = Array.isArray(u.photos) ? u.photos : [];
        const hasPhotos = photos.length > 0;
        const hasFacePhoto = !!u.avatar_url;
        
        // Calculate real distance if both users have coordinates
        let distanceKm = null;
        let distanceMeters = null;
        
        if (isSelf) {
          distanceKm = 0;
          distanceMeters = 0;
        } else if (currentUser.lat && currentUser.lng && u.lat && u.lng) {
          distanceKm = calculateDistance(
            currentUser.lat,
            currentUser.lng,
            u.lat,
            u.lng
          );
          distanceMeters = distanceKm * 1000;
        } else if (proximity) {
          // Use proximity data if available
          distanceKm = proximity.distanceKm ?? null;
          distanceMeters = proximity.distanceMeters ?? null;
        } else if (u.city === currentUser.city) {
          // Fallback: same city = approximate 5km
          distanceKm = 5;
          distanceMeters = 5000;
        } else {
          // Fallback: different city = approximate 50km
          distanceKm = 50;
          distanceMeters = 50000;
        }
        
        return {
          ...u,
          onlineNow: u.activity_status === 'online' || u.activity_status === 'at_event',
          rightNow: rightNowStatuses.some(s => 
            s.user_email === u.email && 
            s.active && 
            new Date(s.expires_at) > new Date()
          ),
          hasFace: !!u.avatar_url,
          hasPhotos,
          hasFacePhoto,
          age: u.age || 25,
          tribes: uTribes.map(t => t.tribe_id),
          tags: uTags.map(t => t.tag_id),
          lookingFor: u.lookingFor ?? u.looking_for ?? [],
          meetAt: u.meetAt ?? u.meet_at ?? [],
          communicationStyle: u.communicationStyle ?? u.preferred_communication ?? [],
          distanceKm,
          distanceMeters,
          etaSeconds: isSelf ? 0 : (proximity?.etaSeconds ?? null),
          etaMode: isSelf ? null : (proximity?.etaMode ?? null),
        };
      });
  }, [allUsers, currentUser, userTags, userTribes, rightNowStatuses, nearbyByEmail, lane]);

  // Apply lane filter - with memoization
  const laneFiltered = useMemo(() => {
    if (lane === 'right_now') {
      return profiles.filter(p => p.rightNow);
    }
    return profiles;
  }, [profiles, lane]);

  const filteredUsers = useMemo(() => {
    if (!laneFiltered || laneFiltered.length === 0) return [];
    return applyLocalFilters(laneFiltered, debouncedFilters, { taxonomyIndex: idx || null });
  }, [laneFiltered, debouncedFilters, idx]);

  // Generate AI match explanations for top 6 users
  useEffect(() => {
    if (!currentUser || filteredUsers.length === 0) return;

    const topUsers = filteredUsers.slice(0, 6);
    generateMatchExplanations(currentUser, topUsers).then(explanations => {
      setAiMatchExplanations(explanations);
    });
  }, [currentUser?.email, filteredUsers.slice(0, 6).map(u => u.email).join(',')]);

  // Promote top AI matches
  const reorderedUsers = useMemo(() => {
    const promoted = promoteTopMatches(filteredUsers, aiMatchExplanations);
    const viewer = normalizeEmail(currentUser?.email);
    if (!viewer) return promoted;

    let me = null;
    const out = [];
    const seen = new Set();

    for (const u of promoted) {
      const email = normalizeEmail(u?.email);
      if (email) {
        if (seen.has(email)) continue;
        seen.add(email);
      }

      if (email && email === viewer) {
        me = u;
        continue;
      }

      out.push(u);
    }

    return me ? [me, ...out] : out;
  }, [filteredUsers, aiMatchExplanations, currentUser?.email]);

  // Memoize pagination calculations
  const totalPages = useMemo(() => Math.ceil(reorderedUsers.length / PAGINATION.ITEMS_PER_PAGE), [reorderedUsers.length]);
  const paginatedUsers = useMemo(() => 
    reorderedUsers.slice((page - 1) * PAGINATION.ITEMS_PER_PAGE, page * PAGINATION.ITEMS_PER_PAGE),
    [reorderedUsers, page]
  );

  // Map to full user objects - memoized
  const displayUsers = paginatedUsers;

  const isSellerProfile = (u) => String(u?.profile_type || u?.profileType || '').trim().toLowerCase() === 'seller';

  const sellerEmails = useMemo(() => {
    return displayUsers
      .filter((u) => isSellerProfile(u))
      .map((u) => normalizeEmail(u?.email))
      .filter(Boolean);
  }, [displayUsers]);

  const { data: sellerProductsMeta = { hasProductsByEmail: {}, previewsByEmail: {} } } = useQuery({
    queryKey: ['connect-seller-products-meta', sellerEmails.join(',')],
    queryFn: async () => {
      const uniq = Array.from(new Set(sellerEmails));
      const hasProductsByEmail = {};
      const previewsByEmail = {};
      if (!uniq.length) return { hasProductsByEmail, previewsByEmail };

      uniq.forEach((e) => {
        hasProductsByEmail[e] = false;
        previewsByEmail[e] = [];
      });

      const firstImageUrl = (product) => {
        const urls = Array.isArray(product?.image_urls) ? product.image_urls : [];
        for (const raw of urls) {
          const url = typeof raw === 'string' ? raw.trim() : '';
          if (url) return url;
        }
        return null;
      };

      try {
        const { data, error } = await supabase
          .from('products')
          .select('id,seller_email,image_urls,status,updated_at,created_at')
          .eq('status', 'active')
          .in('seller_email', uniq)
          .order('updated_at', { ascending: false })
          .limit(500);

        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        for (const row of rows) {
          const email = normalizeEmail(row?.seller_email);
          if (!email) continue;
          if (!Object.prototype.hasOwnProperty.call(hasProductsByEmail, email)) continue;
          hasProductsByEmail[email] = true;

          const url = firstImageUrl(row);
          if (!url) continue;
          const current = Array.isArray(previewsByEmail[email]) ? previewsByEmail[email] : [];
          if (current.length >= 3) continue;
          if (current.some((p) => p?.imageUrl === url)) continue;
          current.push({ id: row?.id ? String(row.id) : undefined, imageUrl: url });
          previewsByEmail[email] = current;
        }
      } catch {
        // Fall back to hasProducts only (best-effort) via Base44 entity filter.
        try {
          const rows = await base44.entities.Product.filter({ seller_email: uniq, status: 'active' }, null, 250);
          (Array.isArray(rows) ? rows : []).forEach((row) => {
            const email = normalizeEmail(row?.seller_email);
            if (!email) return;
            if (!Object.prototype.hasOwnProperty.call(hasProductsByEmail, email)) return;
            hasProductsByEmail[email] = true;
            const url = firstImageUrl(row);
            if (!url) return;
            const current = Array.isArray(previewsByEmail[email]) ? previewsByEmail[email] : [];
            if (current.length >= 3) return;
            if (current.some((p) => p?.imageUrl === url)) return;
            current.push({ id: row?.id ? String(row.id) : undefined, imageUrl: url });
            previewsByEmail[email] = current;
          });
        } catch {
          // ignore
        }
      }

      return { hasProductsByEmail, previewsByEmail };
    },
    enabled: sellerEmails.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const toCardProfile = useCallback(
    (u) => {
      const email = normalizeEmail(u?.email) || '';
      const lat = Number(u?.last_lat ?? u?.lat);
      const lng = Number(u?.last_lng ?? u?.lng);

      const name = String(u?.full_name || u?.profileName || u?.email || 'Unknown').trim();
      const city = u?.city ? String(u.city).trim() : null;
      const bio = u?.bio ? String(u.bio).trim() : '';
      const profileType = String(u?.profile_type || u?.profileType || '').trim() || undefined;

      const rawTags = u?.tags;
      const tags = Array.isArray(rawTags) ? rawTags.map((t) => String(t)).filter(Boolean).slice(0, 5) : [];

      const photos = Array.isArray(u?.photos) ? u.photos : [];
      const avatar = String(u?.avatar_url || u?.avatarUrl || '').trim();
      const normalizedPhotos = [];
      if (avatar) normalizedPhotos.push({ url: avatar, isPrimary: true });
      for (const p of photos) {
        if (!p) continue;
        if (typeof p === 'string') {
          const url = p.trim();
          if (!url || normalizedPhotos.some((x) => x.url === url)) continue;
          normalizedPhotos.push({ url, isPrimary: normalizedPhotos.length === 0 });
          continue;
        }
        if (typeof p === 'object') {
          const url = String(p.url || p.file_url || p.href || '').trim();
          if (!url || normalizedPhotos.some((x) => x.url === url)) continue;
          const isPrimary = !!(p.isPrimary ?? p.is_primary ?? p.primary);
          normalizedPhotos.push({ url, isPrimary: isPrimary || normalizedPhotos.length === 0 });
        }
      }
      const safePhotos = normalizedPhotos.slice(0, 5);

      const hasProducts = !!sellerProductsMeta?.hasProductsByEmail?.[email];
      const productPreviews = sellerProductsMeta?.previewsByEmail?.[email];

      return {
        id: String(u?.id || email || name),
        email: email || undefined,
        authUserId: u?.auth_user_id ? String(u.auth_user_id) : undefined,
        profileType,
        city: city || undefined,
        bio: bio || undefined,
        tags,
        hasProducts,
        productPreviews: Array.isArray(productPreviews) ? productPreviews : undefined,
        profileName: name,
        title: bio || 'Member',
        locationLabel: city || 'Nearby',
        geoLat: Number.isFinite(lat) ? lat : 0,
        geoLng: Number.isFinite(lng) ? lng : 0,
        photos: safePhotos.length ? safePhotos : avatar ? [{ url: avatar, isPrimary: true }] : [],
      };
    },
    [sellerProductsMeta]
  );

  // Early return AFTER all hooks
  if (userLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#FF1493] border-t-transparent rounded-full animate-spin" />
          <div className="text-white/60 text-sm uppercase">Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/40">Not authenticated</div>
      </div>
    );
  }

  // Handle filter apply
  const handleFiltersApply = (values) => {
    setFilters(values);
    setPage(1);
    
    // Sync to URL
    const sp = valuesToSearchParams(values);
    const nextUrl = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  };



  const isUserLive = rightNowStatuses.some(s => s.user_email === currentUser.email && s.active && new Date(s.expires_at) > new Date());
  const liveCount = rightNowStatuses.filter(s => s.active && new Date(s.expires_at) > new Date()).length;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Announcement Banner */}
      <LuxPageBanner
        message="RIGHT NOW is live - See who's available near you instantly"
        cta="Learn More"
        ctaHref="/features"
        type="promo"
        dismissible
        storageKey="connect-rightnow-banner"
      />

      {/* Hero Banner */}
      <LuxHeroBanner
        subtitle="Discovery"
        title="FIND YOUR MATCH"
        description="87% match rate. Real-time availability. Zero ghosting."
        height="sm"
        overlay
        alignment="center"
        className="border-b-2 border-white/10"
      />

      {/* Live Stats Bar */}
      <div className="bg-black border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6">
          <LuxLiveCounter count={liveCount} label="Right Now" variant="badge" pulsing />
          <LuxLiveCounter count={reorderedUsers.length} label="Matches" variant="minimal" pulsing={false} />
          {proximityStatus === 'ok' && (
            <div className="flex items-center gap-2 text-xs text-[#39FF14]">
              <MapPin className="w-3 h-3" />
              <span className="uppercase tracking-wider font-bold">Location Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Header Controls */}
      <div className="border-b-2 border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FF1493] flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <KineticHeadline text="CONNECT" as="h1" className="text-4xl font-black uppercase" />
                <p className="text-xs text-white/40 uppercase tracking-wider">AI-Powered Discovery</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white hover:text-black"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Lanes */}
          <Tabs value={lane} onValueChange={setLane}>
            <TabsList className="bg-white/5 border-2 border-white/10 w-full">
              <TabsTrigger value="right_now" className="flex-1 data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Zap className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Right Now</span>
                  <span className="text-[10px] opacity-60">Available now. Auto-expires.</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="browse" className="flex-1 data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Users className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Browse</span>
                  <span className="text-[10px] opacity-60">Scroll, vibe, chat.</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="dates" className="flex-1 data-[state=active]:bg-[#B026FF] data-[state=active]:text-white">
                <div className="flex flex-col items-center py-2">
                  <Heart className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Dates</span>
                  <span className="text-[10px] opacity-60">Slower burn. Better outcomes.</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex-1 data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black">
                <div className="flex flex-col items-center py-2">
                  <Grid3x3 className="w-5 h-5 mb-1" />
                  <span className="font-black uppercase text-xs">Profiles</span>
                  <span className="text-[10px] opacity-60">The card grid.</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-6">
        {lane === 'profiles' ? (
          <ProfilesGrid
            showHeader={false}
            showTelegramFeedButton
            containerClassName="mx-0 max-w-none p-0"
            onNavigateUrl={(url) => navigate(url)}
            onOpenProfile={(profile) => {
              // Use user ID, never expose email
              navigate(getProfileUrl(profile));
            }}
          />
        ) : (
          <>
        {proximityStatus !== 'ok' && (
          <div className="mb-4 border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 flex items-center justify-between gap-3">
            <span>
              {proximityStatus === 'gps_consent_off'
                ? 'Location is off. Enable it to unlock nearby distances (and distance filters).'
                : 'Could not access your location. Check browser location permission to unlock nearby distances (and distance filters).'}
            </span>
            {proximityStatus === 'gps_consent_off' && (
              <Button
                onClick={() => navigate(createPageUrl('AccountConsents'))}
                variant="outline"
                className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
              >
                ENABLE LOCATION
              </Button>
            )}
          </div>
        )}
        <div className="mb-4 text-sm text-white/60">
          {reorderedUsers.length} {reorderedUsers.length === 1 ? 'result' : 'results'}
          {Object.keys(aiMatchExplanations).length > 0 && (
            <span className="ml-2 text-[#00D9FF]">• Top {Object.keys(aiMatchExplanations).length} AI matches promoted</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayUsers
            .filter((u) => Number.isFinite(Number(u?.last_lat ?? u?.lat)) && Number.isFinite(Number(u?.last_lng ?? u?.lng)))
            .map((user) => {
              const cardProfile = toCardProfile(user);
              return (
                <ProfileCard
                  key={String(user?.email || user?.id)}
                  profile={cardProfile}
                  viewerLocation={liveLocation || null}
                  viewerProfile={currentUser}
                  onNavigateUrl={(url) => navigate(url)}
                  onOpenProfile={(p) => {
                    // Use user ID, never expose email
                    navigate(getProfileUrl(p));
                  }}
                />
              );
            })}
          {reorderedUsers.length === 0 && (
            <div className="col-span-full text-center py-20">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 mb-2">
                {lane === 'right_now' ? 'Nobody live right now.' : 'No matches found.'}
              </p>
              <p className="text-sm text-white/30">
                {lane === 'right_now' ? 'Try Browse—then go Right Now when you\'re ready.' : 'Adjust your filters or try a different lane.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && reorderedUsers.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              className="border-white/20"
            >
              Previous
            </Button>
            <span className="text-sm text-white/60">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              className="border-white/20"
            >
              Next
            </Button>
          </div>
        )}
          </>
        )}
      </div>

      {/* Modals */}
      <RightNowModal
        isOpen={showRightNow}
        onClose={() => setShowRightNow(false)}
        currentUser={currentUser}
      />

      <FiltersDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        laneId={lane}
        initialValues={filters}
        onApply={handleFiltersApply}
      />

      {/* Ad Slot */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex justify-center">
        <LuxMediumRectangleAd
          slotId="connect-bottom"
          fallbackImage="/images/ad-placeholder.jpg"
          fallbackHref="/market"
        />
      </div>

      {/* Floating Go Live CTA */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        <Button
          onClick={async () => {
            const ok = await base44.auth.requireProfile(window.location.href);
            if (!ok) return;
            setShowRightNow(true);
          }}
          className={`font-black uppercase px-8 py-6 text-lg shadow-2xl transition-all ${
            isUserLive
              ? 'bg-[#39FF14] text-black animate-pulse shadow-[0_0_30px_rgba(57,255,20,0.5)]'
              : 'bg-[#FF1493] text-white hover:bg-white hover:text-black shadow-[0_0_30px_rgba(255,20,147,0.5)]'
          }`}
        >
          <Zap className="w-5 h-5 mr-2" />
          {isUserLive ? "YOU'RE LIVE" : 'GO RIGHT NOW'}
        </Button>
      </motion.div>

      <TutorialTooltip page="connect" />
    </div>
  );
}