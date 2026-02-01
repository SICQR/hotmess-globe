import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ghost, 
  MessageCircle, 
  EyeOff, 
  LayoutGrid, 
  Sparkles, 
  Radar,
  MapPin,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useCurrentUser } from '@/components/utils/queryConfig';
import { useInfiniteProfiles } from '@/features/profilesGrid/useInfiniteProfiles';
import useLiveViewerLocation from '@/hooks/useLiveViewerLocation';
import { toast } from 'sonner';

// New Ghosted components
import { GhostedSwipeView, GhostedRadarView, StatusSelector } from '@/features/ghosted';
import { BentoGridSmart } from '@/features/profilesGrid/BentoGrid';
import { SmartProfileCard } from '@/features/profilesGrid/SmartProfileCard';

// View modes
const VIEW_MODES = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'swipe', label: 'Swipe', icon: Sparkles },
  { id: 'radar', label: 'Radar', icon: Radar },
];

export default function Social() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [activeTab, setActiveTab] = useState('discover');
  const [viewMode, setViewMode] = useState('grid');
  const [userStatus, setUserStatus] = useState('ghost');
  const [destination, setDestination] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  
  // Data
  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();
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

  // Message threads
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

  // Tab URL sync
  const setTabAndUrl = useCallback(
    (nextTab, { replace = false } = {}) => {
      const normalized = String(nextTab || '').toLowerCase() === 'inbox' ? 'inbox' : 'discover';
      setActiveTab(normalized);

      const params = new URLSearchParams(location.search || '');
      params.set('tab', normalized);
      const nextSearch = `?${params.toString()}`;

      if (location.pathname === '/social' && location.search === nextSearch) return;

      navigate({ pathname: '/social', search: nextSearch }, { replace });
    },
    [location.pathname, location.search, navigate]
  );

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const tab = String(params.get('tab') || '').toLowerCase();
      if (tab === 'discover' || tab === 'inbox') setActiveTab(tab);
    } catch {
      // ignore
    }
  }, [location.search]);

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
    } catch (err) {
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
    const email = profile?.email;
    if (email) {
      navigate(`/social/inbox?to=${encodeURIComponent(email)}`);
    }
  }, [navigate]);

  // Priority calculation for smart grid
  const getPriority = useCallback((profile) => {
    let score = 50;
    if (profile.rightNow) score += 30;
    if (profile.onlineNow) score += 15;
    if (profile.matchProbability) score += profile.matchProbability * 0.3;
    if (viewerLocation && profile.geoLat && profile.geoLng) {
      const dist = calculateDistance(
        viewerLocation.lat, viewerLocation.lng,
        profile.geoLat, profile.geoLng
      );
      if (dist < 1) score += 20;
      else if (dist < 3) score += 10;
    }
    return Math.min(100, score);
  }, [viewerLocation]);

  // Loading state
  if (currentUserLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white">
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="/images/ghosted-cover.jpg" 
              alt="Ghosted" 
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-pink-950/80 via-black/60 to-black" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 text-center px-6 max-w-3xl"
          >
            <Ghost className="w-20 h-20 mx-auto mb-8 text-pink-500" />
            <h1 className="text-[15vw] md:text-[10vw] font-black italic leading-[0.85] tracking-tighter mb-6">
              GHOSTED<span className="text-pink-500">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/70 mb-6">
              Real-time social radar for nightlife.
            </p>
            <p className="text-base text-white/50 mb-12 max-w-lg mx-auto">
              See who's out. Who's nearby. Who's heading where. Your pace, your rules.
            </p>
            <Button
              onClick={() => navigate(`/auth?next=${encodeURIComponent('/social')}`)}
              className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase px-12 py-7 text-xl"
            >
              ENTER GHOSTED
            </Button>
          </motion.div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Status */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-black italic">
                GHOSTED<span className="text-pink-500">.</span>
              </h1>
              <StatusSelector
                value={userStatus}
                onChange={setUserStatus}
                destination={destination}
                onDestinationChange={setDestination}
                compact
              />
            </div>

            {/* View Mode Toggle (Desktop) */}
            <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                      viewMode === mode.id
                        ? 'bg-pink-500 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-bold">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!gpsEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnableLocation}
                  className="border-cyan/50 text-cyan hover:bg-cyan hover:text-black"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Enable Location
                </Button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Filter className="w-5 h-5 text-white/60" />
              </button>
              <Link to="/care">
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <EyeOff className="w-5 h-5 text-white/60" />
                </button>
              </Link>
            </div>
          </div>

          {/* Mobile View Toggle */}
          <div className="flex md:hidden items-center gap-1 mt-3 bg-white/5 rounded-lg p-1">
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all ${
                    viewMode === mode.id
                      ? 'bg-pink-500 text-white'
                      : 'text-white/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-bold">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <Tabs value={activeTab} onValueChange={(v) => setTabAndUrl(v)} className="w-full">
          {/* Tab Navigation */}
          <div className="sticky top-[120px] md:top-[76px] z-30 bg-black/80 backdrop-blur-lg border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="discover"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white rounded-none font-black uppercase py-4"
                >
                  <Ghost className="w-5 h-5 mr-2" />
                  DISCOVER
                </TabsTrigger>
                <TabsTrigger
                  value="inbox"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-pink-500 data-[state=active]:text-white relative rounded-none font-black uppercase py-4"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  INBOX
                  {threads.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-pink-500 text-white text-xs font-black rounded-full">
                      {threads.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-0">
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
                    className="max-w-7xl mx-auto px-4 py-6"
                  >
                    <BentoGridSmart
                      items={profiles}
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
                          viewerContext={{
                            location: viewerLocation,
                          }}
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
                  </motion.div>
                )}

                {/* Swipe View */}
                {viewMode === 'swipe' && (
                  <motion.div
                    key="swipe"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-[calc(100vh-200px)] md:h-[calc(100vh-140px)]"
                  >
                    <GhostedSwipeView
                      profiles={profiles}
                      viewerLocation={viewerLocation}
                      viewerEmail={currentUser?.email}
                      viewerName={currentUser?.full_name || currentUser?.email?.split('@')[0]}
                      onSwipeRight={(p) => {
                        toast.success(`Liked ${p.profileName}!`);
                        handleMessageProfile(p);
                      }}
                      onSwipeLeft={(p) => {
                        // Pass - no action
                      }}
                      onSwipeUp={(p) => {
                        toast.success(`Super liked ${p.profileName}!`, {
                          icon: '⭐'
                        });
                      }}
                      onViewProfile={handleOpenProfile}
                      onMessage={handleMessageProfile}
                    />
                  </motion.div>
                )}

                {/* Radar View */}
                {viewMode === 'radar' && (
                  <motion.div
                    key="radar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-[calc(100vh-200px)] md:h-[calc(100vh-140px)]"
                  >
                    <GhostedRadarView
                      profiles={profiles}
                      viewerLocation={viewerLocation}
                      maxDistanceKm={5}
                      onSelectProfile={handleOpenProfile}
                      onMessageProfile={handleMessageProfile}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Inbox Tab */}
          <TabsContent value="inbox" className="mt-0">
            <div className="max-w-2xl mx-auto px-4 py-6">
              {threads.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20 bg-white/5 rounded-2xl border border-white/10"
                >
                  <MessageCircle className="w-20 h-20 mx-auto mb-6 text-white/20" />
                  <h3 className="text-2xl font-black mb-2">NO MESSAGES YET</h3>
                  <p className="text-white/60 mb-8">Start a conversation from Discover</p>
                  <Button
                    onClick={() => setTabAndUrl('discover')}
                    className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase px-8 py-4"
                  >
                    <Ghost className="w-5 h-5 mr-2" />
                    GO TO DISCOVER
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {threads.map((thread, idx) => {
                    const participants = Array.isArray(thread.participant_emails) ? thread.participant_emails : [];
                    const otherParticipant = participants.find((e) => e && e !== currentUser?.email) || currentUser?.email || 'Unknown';
                    const unreadCount =
                      typeof thread.unread_count === 'number'
                        ? thread.unread_count
                        : Number(thread.unread_count?.[currentUser?.email] || 0);

                    return (
                      <motion.div
                        key={thread.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link
                          to={`/social/t/${encodeURIComponent(String(thread.id))}`}
                          className="block"
                        >
                          <div className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/50 rounded-xl p-5 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center">
                                <span className="text-xl font-black">
                                  {otherParticipant[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black uppercase text-lg group-hover:text-pink-500 transition-colors">
                                  {otherParticipant}
                                </p>
                                <p className="text-sm text-white/50 truncate">
                                  {thread.last_message || 'Start a conversation...'}
                                </p>
                              </div>
                              {unreadCount > 0 && (
                                <span className="px-3 py-1 bg-pink-500 text-white text-sm font-black rounded-full">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Helper function
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
