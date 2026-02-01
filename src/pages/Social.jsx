import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ghost, 
  MessageCircle, 
  LayoutGrid, 
  Sparkles, 
  Radar,
  MapPin,
  SlidersHorizontal,
  Undo2,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useCurrentUser } from '@/components/utils/queryConfig';
import { useInfiniteProfiles } from '@/features/profilesGrid/useInfiniteProfiles';
import useLiveViewerLocation from '@/hooks/useLiveViewerLocation';
import { toast } from 'sonner';

// Ghosted components
import { GhostedSwipeView, GhostedRadarView, StatusSelector } from '@/features/ghosted';
import { BentoGridSmart } from '@/features/profilesGrid/BentoGrid';
import { SmartProfileCard } from '@/features/profilesGrid/SmartProfileCard';

// View modes
const VIEW_MODES = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'swipe', label: 'Swipe', icon: Sparkles },
  { id: 'radar', label: 'Radar', icon: Radar },
];

// Shared distance calculator
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Social() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get view mode from URL or localStorage
  const initialView = searchParams.get('view') || localStorage.getItem('ghosted-view') || 'grid';
  
  // State
  const [viewMode, setViewMode] = useState(initialView);
  const [userStatus, setUserStatus] = useState('ghost');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  
  // Filter state
  const [maxDistance, setMaxDistance] = useState(10); // km
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showRightNowOnly, setShowRightNowOnly] = useState(false);
  
  // Swipe undo state
  const [lastSwiped, setLastSwiped] = useState(null);
  const [swipedIds, setSwipedIds] = useState(new Set());
  
  // Data
  const { data: currentUser } = useCurrentUser();
  const { items: profiles, isLoadingInitial } = useInfiniteProfiles();
  
  // Location
  const { location: liveLocation } = useLiveViewerLocation({
    enabled: gpsEnabled,
    enableHighAccuracy: false,
    timeoutMs: 10_000,
    maximumAgeMs: 15_000,
    minUpdateMs: 10_000,
    minDistanceM: 25,
  });

  const viewerLocation = useMemo(() => {
    if (!liveLocation) return null;
    return { lat: liveLocation.lat, lng: liveLocation.lng };
  }, [liveLocation]);

  // Message threads for badge count
  const { data: threads = [] } = useQuery({
    queryKey: ['message-threads', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allThreads = await base44.entities.ChatThread.filter({ active: true }, '-updated_date');
      return allThreads.filter(
        (t) => Array.isArray(t.participant_emails) && t.participant_emails.includes(currentUser.email)
      );
    },
    enabled: !!currentUser?.email,
  });

  const unreadCount = useMemo(() => {
    return threads.reduce((acc, t) => {
      const count = typeof t.unread_count === 'number' ? t.unread_count : 0;
      return acc + count;
    }, 0);
  }, [threads]);

  // Persist view mode
  const handleSetViewMode = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem('ghosted-view', mode);
    setSearchParams((prev) => {
      prev.set('view', mode);
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  // Sync from URL on mount
  useEffect(() => {
    const urlView = searchParams.get('view');
    if (urlView && VIEW_MODES.some(m => m.id === urlView)) {
      setViewMode(urlView);
    }
  }, [searchParams]);

  // Enable GPS
  const handleEnableLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          maximumAge: 15_000,
          timeout: 10_000,
        });
      });
      setGpsEnabled(true);
      toast.success('Location enabled');
    } catch {
      toast.error('Could not get location');
    }
  };

  // Navigation handlers
  const handleOpenProfile = useCallback((profile) => {
    const uid = profile?.authUserId || profile?.id;
    if (uid) {
      navigate(`/social/u/${encodeURIComponent(uid)}`);
      return;
    }
    if (profile?.email) {
      navigate(createPageUrl(`Profile?email=${encodeURIComponent(profile.email)}`));
    }
  }, [navigate]);

  const handleMessageProfile = useCallback((profile) => {
    if (!currentUser) {
      toast.info('Sign in to send messages', { icon: '👻' });
      navigate(`/auth?next=${encodeURIComponent('/social')}`);
      return;
    }
    const email = profile?.email;
    if (email) {
      navigate(`/social/inbox?to=${encodeURIComponent(email)}`);
    }
  }, [navigate, currentUser]);

  // Swipe handlers - DON'T auto-redirect
  const handleSwipeRight = useCallback((profile) => {
    setLastSwiped({ profile, direction: 'right' });
    setSwipedIds((prev) => new Set([...prev, profile.id]));
    toast.success(`Liked ${profile.profileName}!`, {
      icon: '💚',
      action: {
        label: 'Message',
        onClick: () => handleMessageProfile(profile),
      },
    });
  }, [handleMessageProfile]);

  const handleSwipeLeft = useCallback((profile) => {
    setLastSwiped({ profile, direction: 'left' });
    setSwipedIds((prev) => new Set([...prev, profile.id]));
  }, []);

  const handleSwipeUp = useCallback((profile) => {
    setLastSwiped({ profile, direction: 'up' });
    setSwipedIds((prev) => new Set([...prev, profile.id]));
    toast.success(`Super liked ${profile.profileName}!`, { icon: '⭐' });
  }, []);

  // Undo last swipe
  const handleUndo = useCallback(() => {
    if (!lastSwiped) return;
    setSwipedIds((prev) => {
      const next = new Set(prev);
      next.delete(lastSwiped.profile.id);
      return next;
    });
    toast.info(`Undo: ${lastSwiped.profile.profileName}`, { icon: '↩️' });
    setLastSwiped(null);
  }, [lastSwiped]);

  // Filter profiles (swipe view handles swipedIds internally)
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Distance filter (if location enabled)
      if (viewerLocation && p.geoLat && p.geoLng) {
        const dist = calculateDistance(viewerLocation.lat, viewerLocation.lng, p.geoLat, p.geoLng);
        if (dist > maxDistance) return false;
      }
      
      // Online filter
      if (showOnlineOnly && !p.onlineNow) return false;
      
      // Right Now filter
      if (showRightNowOnly && !p.rightNow) return false;
      
      return true;
    });
  }, [profiles, viewerLocation, maxDistance, showOnlineOnly, showRightNowOnly]);

  // Priority calculation for smart grid
  const getPriority = useCallback((profile) => {
    let score = 50;
    if (profile.rightNow) score += 30;
    if (profile.onlineNow) score += 15;
    if (profile.matchProbability) score += profile.matchProbability * 0.3;
    if (viewerLocation && profile.geoLat && profile.geoLng) {
      const dist = calculateDistance(viewerLocation.lat, viewerLocation.lng, profile.geoLat, profile.geoLng);
      if (dist < 1) score += 20;
      else if (dist < 3) score += 10;
    }
    return Math.min(100, score);
  }, [viewerLocation]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* COMPACT HEADER - Single row on mobile */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Logo - hidden on mobile to save space */}
            <h1 className="hidden sm:block text-lg font-black italic shrink-0">
              GHOSTED<span className="text-pink-500">.</span>
            </h1>
            
            {/* View Mode Toggle - Always visible */}
            <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 flex-1 sm:flex-none">
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSetViewMode(mode.id)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-all ${
                      viewMode === mode.id
                        ? 'bg-pink-500 text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Spacer */}
            <div className="flex-1 hidden sm:block" />

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Location button */}
              {!gpsEnabled ? (
                <button
                  type="button"
                  onClick={handleEnableLocation}
                  className="p-2 rounded-lg bg-cyan/10 border border-cyan/30 hover:bg-cyan/20 transition-colors"
                  title="Enable location"
                >
                  <MapPin className="w-4 h-4 text-cyan" />
                </button>
              ) : (
                <div className="p-2 rounded-lg bg-green-500/10" title="Location enabled">
                  <MapPin className="w-4 h-4 text-green-500" />
                </div>
              )}

              {/* Filter button */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-pink-500 text-white' : 'hover:bg-white/10 text-white/60'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Inbox button with badge */}
              <Link to="/social/inbox">
                <button
                  type="button"
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-white/60" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-[10px] font-black rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </Link>

              {/* Menu button */}
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Menu className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Panel - Slides down */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10 bg-black/50 backdrop-blur-lg"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Distance filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 uppercase font-bold">Distance:</span>
                  <select
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
                  >
                    <option value={1}>1 km</option>
                    <option value={3}>3 km</option>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={25}>25 km</option>
                    <option value={100}>100 km</option>
                  </select>
                </div>

                {/* Status filters */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlineOnly}
                    onChange={(e) => setShowOnlineOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30 bg-transparent checked:bg-green-500"
                  />
                  <span className="text-sm font-bold text-white/80">Online only</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRightNowOnly}
                    onChange={(e) => setShowRightNowOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30 bg-transparent checked:bg-pink-500"
                  />
                  <span className="text-sm font-bold text-white/80">Right Now only</span>
                </label>

                {/* Results count */}
                <div className="ml-auto text-xs text-white/40">
                  {filteredProfiles.length} results
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 right-3 z-50 w-64 bg-black/95 backdrop-blur-lg border border-white/20 rounded-xl overflow-hidden shadow-xl"
          >
            <div className="p-3 border-b border-white/10">
              <p className="text-xs text-white/60 uppercase font-bold mb-2">Your Status</p>
              <StatusSelector
                value={userStatus}
                onChange={setUserStatus}
                compact
              />
            </div>
            <div className="p-2">
              <Link to="/care" onClick={() => setShowMenu(false)}>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Ghost className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-bold text-white">Safety & Care</span>
                </div>
              </Link>
              <Link to="/settings" onClick={() => setShowMenu(false)}>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                  <SlidersHorizontal className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-bold text-white">Settings</span>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Main Content */}
      <main className="pb-20">
        {isLoadingInitial ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Grid View */}
            {viewMode === 'grid' && (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-7xl mx-auto px-3 py-4"
              >
                {filteredProfiles.length === 0 ? (
                  <EmptyState 
                    icon="🔍" 
                    title="No one nearby" 
                    subtitle="Try expanding your distance filter"
                    onAction={() => setMaxDistance(100)}
                    actionLabel="Show all"
                  />
                ) : (
                  <BentoGridSmart
                    items={filteredProfiles}
                    columns={4}
                    gap="md"
                    getPriority={getPriority}
                    getKey={(p) => p.id}
                    renderItem={(profile, size, index) => (
                      <SmartProfileCard
                        profile={{
                          id: profile.id,
                          email: profile.email,
                          full_name: profile.profileName,
                          avatar_url: profile.photoUrl,
                          photos: profile.photos,
                          profile_type: profile.profileType,
                          bio: profile.title,
                          city: profile.locationLabel,
                          is_verified: profile.verified,
                          is_online: profile.onlineNow,
                          is_right_now: profile.rightNow,
                          tags: profile.tags,
                        }}
                        viewerContext={{ location: viewerLocation }}
                        distanceMinutes={
                          viewerLocation && profile.geoLat && profile.geoLng
                            ? Math.round((calculateDistance(
                                viewerLocation.lat, viewerLocation.lng,
                                profile.geoLat, profile.geoLng
                              ) / 5) * 60)
                            : undefined
                        }
                        onClick={handleOpenProfile}
                        onMessage={handleMessageProfile}
                        forceSize={size}
                        index={index}
                      />
                    )}
                  />
                )}
              </motion.div>
            )}

            {/* Swipe View */}
            {viewMode === 'swipe' && (
              <motion.div
                key="swipe"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[calc(100vh-60px)] relative"
              >
                <GhostedSwipeView
                  profiles={filteredProfiles}
                  viewerLocation={viewerLocation}
                  viewerEmail={currentUser?.email}
                  viewerName={currentUser?.full_name || currentUser?.email?.split('@')[0]}
                  swipedIds={swipedIds}
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeUp={handleSwipeUp}
                  onViewProfile={handleOpenProfile}
                  onMessage={handleMessageProfile}
                />

                {/* Undo button */}
                {lastSwiped && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    type="button"
                    onClick={handleUndo}
                    className="absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <Undo2 className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold text-white">Undo</span>
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Radar View */}
            {viewMode === 'radar' && (
              <motion.div
                key="radar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[calc(100vh-60px)]"
              >
                {!viewerLocation ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                      <MapPin className="w-16 h-16 mx-auto mb-4 text-pink-500/50" />
                      <h3 className="text-xl font-black text-white mb-2">ENABLE LOCATION</h3>
                      <p className="text-white/60 mb-6">Radar needs your location to work</p>
                      <Button
                        onClick={handleEnableLocation}
                        className="bg-pink-500 hover:bg-pink-600 text-white font-black uppercase"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Enable Location
                      </Button>
                    </div>
                  </div>
                ) : (
                  <GhostedRadarView
                    profiles={filteredProfiles}
                    viewerLocation={viewerLocation}
                    maxDistanceKm={maxDistance}
                    onSelectProfile={handleOpenProfile}
                    onMessageProfile={handleMessageProfile}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

// Empty state component
function EmptyState({ icon, title, subtitle, onAction, actionLabel }) {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-white/60 mb-6">{subtitle}</p>
        {onAction && (
          <Button
            onClick={onAction}
            className="bg-pink-500 hover:bg-pink-600 text-white font-black uppercase"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
