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
import { GhostedSwipeView, GhostedRadarView, StatusSelector, GrindrGrid, ProfileSheet, UberShareButton } from '@/features/ghosted';
import { fetchRoutingEtas } from '@/api/connectProximity';

// Fallback demo profiles for dev/testing when API is slow
const DEMO_PROFILES = [
  {
    id: 'demo_1',
    profileName: 'Roxy Voltage',
    age: 27,
    title: 'Late-night walks, loud music',
    locationLabel: 'Shoreditch',
    bio: 'Late-night walks, loud music, no drama. Here for the vibe, not the timeline. Swipe if you can keep up.',
    geoLat: 51.5225,
    geoLng: -0.0808,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800' },
      { url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800' },
    ],
    onlineNow: true,
    rightNow: false,
    matchProbability: 87,
    profileType: 'creator',
    pronouns: 'he/him',
    height: '5\'11"',
    job: 'Music Producer',
    interests: ['House Music', 'Vinyl', 'Late Nights', 'Street Food'],
    musicTags: ['Techno', 'House', 'Disco', 'UK Garage'],
    lookingFor: ['Friends', 'Dates', 'Dance Partners'],
    instagram: 'roxyvoltage',
    followers: 1247,
    following: 342,
    checkIns: 89,
  },
  {
    id: 'demo_2',
    profileName: 'Milo Afterhours',
    age: 29,
    title: 'Gym rat, beach lover',
    locationLabel: 'Hackney',
    bio: 'Morning gym, afternoon beach (when in Ibiza), evening whatever happens. Looking for someone who can match my energy.',
    geoLat: 51.5465,
    geoLng: -0.0556,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800' },
    ],
    onlineNow: true,
    rightNow: true,
    matchProbability: 92,
    profileType: 'standard',
    pronouns: 'he/him',
    height: '6\'2"',
    job: 'Personal Trainer',
    interests: ['Fitness', 'Travel', 'Cooking', 'Wellness'],
    musicTags: ['Deep House', 'Melodic Techno'],
    lookingFor: ['Dates', 'Gym Buddy', 'Travel Partner'],
    followers: 3421,
    following: 567,
    checkIns: 156,
  },
  {
    id: 'demo_3',
    profileName: 'Jade Neon',
    age: 25,
    title: 'DJ / Producer',
    locationLabel: 'Dalston',
    bio: 'Spinning at Fabric next month. Always looking for new sounds and good company. If you don\'t dance, we won\'t vibe.',
    geoLat: 51.5493,
    geoLng: -0.0754,
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800' },
      { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' },
      { url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800' },
    ],
    onlineNow: false,
    rightNow: false,
    matchProbability: 75,
    profileType: 'creator',
    pronouns: 'they/them',
    job: 'DJ / Producer',
    interests: ['DJing', 'Production', 'Warehouse Parties', 'Record Hunting'],
    musicTags: ['Techno', 'Industrial', 'EBM', 'Acid'],
    lookingFor: ['Collab', 'Friends', 'Gig Partners'],
    instagram: 'jadeneonmusic',
    spotify: 'jadeneon',
    followers: 8932,
    following: 234,
    checkIns: 312,
    profileViews: 1547,
  },
  {
    id: 'demo_4',
    profileName: 'Kris Kensington',
    age: 31,
    title: 'Looking for drinks tonight',
    locationLabel: 'Camden',
    bio: 'Marketing by day, mischief by night. Currently craving good conversation and better cocktails. You buying?',
    geoLat: 51.5390,
    geoLng: -0.1426,
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800' },
    ],
    onlineNow: true,
    rightNow: true,
    matchProbability: 95,
    profileType: 'standard',
    pronouns: 'she/her',
    height: '5\'7"',
    job: 'Marketing Director',
    interests: ['Cocktails', 'Art Galleries', 'Rooftop Bars', 'Theater'],
    musicTags: ['Indie', 'Soul', 'Jazz'],
    lookingFor: ['Drinks', 'Dates', 'Adventure'],
    instagram: 'kriskensington',
    followers: 2156,
    following: 891,
    checkIns: 67,
  },
  {
    id: 'demo_5',
    profileName: 'Nova Hotwire',
    age: 24,
    title: 'Clubwear drops',
    locationLabel: 'Soho',
    bio: 'Designer. Running my own label. Looking for muses, models, and mayhem. DM if you want early access to drops.',
    geoLat: 51.5136,
    geoLng: -0.1365,
    photoUrl: 'https://images.unsplash.com/photo-1520975693411-6c5fe1e26f0a?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1520975693411-6c5fe1e26f0a?w=800', isPrimary: true },
    ],
    onlineNow: true,
    rightNow: false,
    matchProbability: 68,
    profileType: 'seller',
    pronouns: 'she/they',
    job: 'Fashion Designer',
    interests: ['Fashion', 'Design', 'Photography', 'Pop-ups'],
    musicTags: ['Hyperpop', 'PC Music', 'Experimental'],
    lookingFor: ['Collab', 'Models', 'Creative Friends'],
    instagram: 'novahotwire',
    twitter: 'novahotwire',
    followers: 12847,
    following: 1234,
    checkIns: 45,
    profileViews: 5621,
  },
  {
    id: 'demo_6',
    profileName: 'Skyline Sage',
    age: 23,
    title: 'New to the scene',
    locationLabel: 'Kings Cross',
    bio: 'Just moved to London. Taking it all in. Show me your favorite spots?',
    geoLat: 51.5308,
    geoLng: -0.1238,
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800' },
    ],
    onlineNow: false,
    rightNow: false,
    matchProbability: 55,
    profileType: 'standard',
    pronouns: 'she/her',
    height: '5\'5"',
    job: 'Student',
    interests: ['Exploring', 'Coffee', 'Reading', 'Live Music'],
    lookingFor: ['Friends', 'Local Guides', 'Study Buddies'],
    followers: 234,
    following: 456,
    checkIns: 12,
  },
  {
    id: 'demo_7',
    profileName: 'Vanta Rose',
    age: 28,
    title: 'Coffee then chaos',
    locationLabel: 'Brixton',
    bio: 'Barista at a spot you\'ve probably never heard of. Night owl. Chaos coordinator. Let\'s get weird.',
    geoLat: 51.4613,
    geoLng: -0.1156,
    photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1520975693411-6c5fe1e26f0a?w=800' },
      { url: 'https://images.unsplash.com/photo-1520962917960-20a70b7f212a?w=800' },
    ],
    onlineNow: true,
    rightNow: false,
    matchProbability: 82,
    profileType: 'standard',
    pronouns: 'they/them',
    job: 'Barista / Artist',
    interests: ['Coffee', 'Art', 'Tattoos', 'Chaos'],
    musicTags: ['Punk', 'Noise', 'Post-Punk', 'Industrial'],
    lookingFor: ['Chaos', 'Friends', 'Late Night Hangs'],
    instagram: 'vantarose',
    followers: 1876,
    following: 654,
    checkIns: 203,
  },
  {
    id: 'demo_8',
    profileName: 'Lexi LDN',
    age: 26,
    title: 'Party planner',
    locationLabel: 'Peckham',
    bio: 'I throw the parties you want to be at. Always on the list. Hit me up for guest list spots.',
    geoLat: 51.4732,
    geoLng: -0.0689,
    photoUrl: 'https://images.unsplash.com/photo-1520962917960-20a70b7f212a?w=800',
    photos: [
      { url: 'https://images.unsplash.com/photo-1520962917960-20a70b7f212a?w=800', isPrimary: true },
    ],
    onlineNow: false,
    rightNow: false,
    matchProbability: 71,
    pronouns: 'she/her',
    job: 'Event Promoter',
    interests: ['Events', 'Networking', 'VIP Access', 'Nightlife'],
    musicTags: ['R&B', 'Afrobeats', 'Dancehall'],
    lookingFor: ['Connections', 'Party People', 'VIPs'],
    instagram: 'lexildn',
    followers: 5432,
    following: 2341,
    checkIns: 421,
    profileType: 'organizer',
  },
  {
    id: 'demo_9',
    profileName: 'Harper Bassline',
    title: 'Warehouse vibes only',
    locationLabel: 'Bermondsey',
    bio: 'Warehouse vibes only',
    geoLat: 51.4965,
    geoLng: -0.0632,
    photoUrl: 'https://images.unsplash.com/photo-1520974735194-6a9a3a559b97?w=800',
    photos: [{ url: 'https://images.unsplash.com/photo-1520974735194-6a9a3a559b97?w=800', isPrimary: true }],
    onlineNow: true,
    rightNow: true, // LIVE!
    matchProbability: 89,
    profileType: 'creator',
  },
];

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
  
  // Profile sheet state
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [travelTimes, setTravelTimes] = useState([]);
  
  // Filter state
  const [maxDistance, setMaxDistance] = useState(10); // km
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showRightNowOnly, setShowRightNowOnly] = useState(false);
  
  // Swipe undo state
  const [lastSwiped, setLastSwiped] = useState(null);
  const [swipedIds, setSwipedIds] = useState(new Set());
  
  // Data
  const { data: currentUser } = useCurrentUser();
  const { items: apiProfiles, isLoadingInitial } = useInfiniteProfiles();
  
  // Timeout to force show demo profiles if API is slow
  const [forceDemo, setForceDemo] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) {
      const timer = setTimeout(() => setForceDemo(true), 3000); // 3 seconds
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Use demo profiles as fallback when API is empty/slow (dev mode)
  const profiles = useMemo(() => {
    if (apiProfiles.length > 0) return apiProfiles;
    // In dev mode, use demo profiles after timeout or when loading completes empty
    if (import.meta.env.DEV && (forceDemo || !isLoadingInitial)) return DEMO_PROFILES;
    return [];
  }, [apiProfiles, isLoadingInitial, forceDemo]);
  
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

  // Open profile in bottom sheet
  const handleOpenProfile = useCallback(async (profile) => {
    setSelectedProfile(profile);
    setProfileSheetOpen(true);
    setTravelTimes([]);
    
    // Fetch travel times if we have location
    if (viewerLocation && profile?.geoLat && profile?.geoLng) {
      try {
        const etas = await fetchRoutingEtas({
          origin: viewerLocation,
          destination: { lat: profile.geoLat, lng: profile.geoLng },
          modes: ['WALK', 'DRIVE', 'BICYCLE'],
          ttlSeconds: 120
        });
        
        if (etas) {
          const times = [];
          if (etas.walk?.durationSeconds) times.push({ mode: 'walk', minutes: Math.round(etas.walk.durationSeconds / 60) });
          if (etas.drive?.durationSeconds) times.push({ mode: 'drive', minutes: Math.round(etas.drive.durationSeconds / 60) });
          if (etas.bike?.durationSeconds) times.push({ mode: 'bike', minutes: Math.round(etas.bike.durationSeconds / 60) });
          setTravelTimes(times);
        }
      } catch (err) {
        console.log('Failed to fetch travel times:', err);
      }
    }
  }, [viewerLocation]);
  
  // Close profile sheet
  const handleCloseProfile = useCallback(() => {
    setProfileSheetOpen(false);
    setSelectedProfile(null);
    setTravelTimes([]);
  }, []);
  
  // Handle Uber booking from sheet
  const handleUberBook = useCallback((profile) => {
    // Build Uber deep link
    if (!profile?.geoLat || !profile?.geoLng) {
      toast.error('Location not available');
      return;
    }
    
    const pickup = viewerLocation ? `pickup[latitude]=${viewerLocation.lat}&pickup[longitude]=${viewerLocation.lng}` : '';
    const dropoff = `dropoff[latitude]=${profile.geoLat}&dropoff[longitude]=${profile.geoLng}&dropoff[nickname]=${encodeURIComponent(profile.profileName || 'Destination')}`;
    const uberUrl = `uber://?action=setPickup&${pickup}&${dropoff}`;
    const webUrl = `https://m.uber.com/ul/?action=setPickup&${pickup}&${dropoff}`;
    
    // Try app first, fall back to web
    window.location.href = uberUrl;
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 500);
    
    toast.success(`Opening Uber to ${profile.profileName || 'destination'}`);
  }, [viewerLocation]);

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

      {/* Profile Sheet */}
      <ProfileSheet
        profile={selectedProfile}
        isOpen={profileSheetOpen}
        onClose={handleCloseProfile}
        onMessage={(p) => {
          handleCloseProfile();
          handleMessageProfile(p);
        }}
        onUber={handleUberBook}
        travelTimes={travelTimes}
        viewerLocation={viewerLocation}
        currentUserEmail={currentUser?.email}
        currentUserName={currentUser?.full_name}
      />

      {/* Main Content */}
      <main className="pb-20">
        {isLoadingInitial && profiles.length === 0 && !forceDemo ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Grid View - Grindr-style tight cards */}
            {viewMode === 'grid' && (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-1 py-2"
              >
                <GrindrGrid
                  profiles={filteredProfiles.map((p) => ({
                    ...p,
                    // Calculate distance in meters
                    distanceMeters: viewerLocation && p.geoLat && p.geoLng
                      ? calculateDistance(viewerLocation.lat, viewerLocation.lng, p.geoLat, p.geoLng) * 1000
                      : undefined,
                    // Calculate travel time in minutes (rough estimate: 5km/h walking)
                    travelTimeMinutes: viewerLocation && p.geoLat && p.geoLng
                      ? Math.round((calculateDistance(
                          viewerLocation.lat, viewerLocation.lng,
                          p.geoLat, p.geoLng
                        ) / 5) * 60)
                      : undefined,
                    travelMode: 'walk',
                  }))}
                  onTap={handleOpenProfile}
                  columns={3}
                  loading={isLoadingInitial && !forceDemo && profiles.length === 0}
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
