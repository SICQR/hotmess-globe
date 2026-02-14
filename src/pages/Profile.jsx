import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { supabase } from '@/components/utils/supabaseClient';
import { User, Users, Calendar, Award, Camera, Star, Pin, Trophy, Shield, Music, Lock, Instagram, Twitter, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ProfileHeader from '../components/profile/ProfileHeader';
import StandardProfileView from '../components/profile/StandardProfileView';
import SellerProfileView from '../components/profile/SellerProfileView';
import ProfileStats from '../components/profile/ProfileStats';
import { sanitizeText, sanitizeURL, sanitizeSocialLinks } from '../components/utils/sanitize';
import { useAllUsers, useCurrentUser } from '../components/utils/queryConfig';
import ErrorBoundary from '../components/error/ErrorBoundary';
import RightNowIndicator from '../components/discovery/RightNowIndicator';
import ProfileCompleteness from '../components/profile/ProfileCompleteness';
import WelcomeTour from '../components/onboarding/WelcomeTour';
import VibeSynthesisCard from '../components/vibe/VibeSynthesisCard';
import { fetchRoutingEtas } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import logger from '@/utils/logger';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  const uidParam = searchParams.get('uid') || searchParams.get('auth_user_id');
  const nextParam = searchParams.get('next');
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useCurrentUser();
  const { data: allUsers = [], isLoading: isLoadingAllUsers } = useAllUsers();

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizeId = (value) => String(value || '').trim().toLowerCase();

  const isViewingOtherUser = !!emailParam || !!uidParam;

  const cachedProfileUser = emailParam
    ? allUsers.find((u) => normalizeEmail(u?.email) === normalizeEmail(emailParam))
    : uidParam
      ? allUsers.find((u) => normalizeId(u?.auth_user_id || u?.authUserId || u?.id) === normalizeId(uidParam))
      : null;

  const { data: fetchedProfileUser, isLoading: isLoadingFetchedProfileUser } = useQuery({
    queryKey: ['profile-user-by-param', normalizeEmail(emailParam), normalizeId(uidParam)],
    queryFn: async () => {
      if (!isViewingOtherUser) return null;

      const email = emailParam ? normalizeEmail(emailParam) : '';
      const uid = uidParam ? normalizeId(uidParam) : '';

      const qs = new URLSearchParams();
      if (email) qs.set('email', email);
      else if (uid) qs.set('uid', uid);
      else return null;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || null;

      const res = await fetch(`/api/profile?${qs.toString()}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Profile lookup failed (${res.status}): ${text}`);
      }

      const payload = await res.json();
      return payload?.user || null;
    },
    enabled: isViewingOtherUser,
    retry: false,
    staleTime: 60000,
  });

  const profileUser = isViewingOtherUser
    ? (fetchedProfileUser || cachedProfileUser)
    : currentUser;

  const userEmail = emailParam || profileUser?.email || null;
  const isSetupMode =
    !profileUser?.full_name ||
    !profileUser?.avatar_url ||
    !profileUser?.city ||
    !profileUser?.profile_type;

  // State for profile setup
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileType, setProfileType] = useState('standard');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [sellerTagline, setSellerTagline] = useState('');
  const [sellerBio, setSellerBio] = useState('');
  const [shopBannerUrl, setShopBannerUrl] = useState('');
  const [gender, setGender] = useState('male');
  const [photoPolicyAck, setPhotoPolicyAck] = useState(false);

  const buildInitialsAvatarDataUrl = (name) => {
    const raw = String(name || '').trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'H';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : 'M';
    const initials = `${first}${last}`.toUpperCase();

    // Simple deterministic colors so avatars feel consistent.
    const palette = [
      ['#FF1493', '#B026FF'],
      ['#00D9FF', '#1E3A8A'],
      ['#22C55E', '#0F766E'],
      ['#F97316', '#7C2D12'],
    ];
    const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length;
    const [c1, c2] = palette[idx];

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#g)"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        font-size="190" font-weight="900" fill="rgba(0,0,0,0.9)">
    ${initials}
  </text>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        font-size="190" font-weight="900" fill="rgba(255,255,255,0.92)" dx="-6" dy="-6">
    ${initials}
  </text>
</svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    // Prefill setup form for current user (setup mode only runs when !userEmail).
    if (!profileUser) return;
    if (isViewingOtherUser) return;

    setFullName(String(profileUser?.full_name || ''));
    setProfileType(String(profileUser?.profile_type || 'standard'));
    setCity(String(profileUser?.city || ''));
    setBio(String(profileUser?.bio || ''));
    setSellerTagline(String(profileUser?.seller_tagline || ''));
    setSellerBio(String(profileUser?.seller_bio || ''));
    setShopBannerUrl(String(profileUser?.shop_banner_url || ''));
    setGender(String(profileUser?.gender || 'male'));
    setPhotoPolicyAck(!!(profileUser?.photo_policy_ack || profileUser?.photoPolicyAck));
  }, [profileUser, isViewingOtherUser]);

  const { data: checkIns = [] } = useQuery({
    queryKey: ['check-ins', userEmail],
    queryFn: () => base44.entities.BeaconCheckIn.filter({ user_email: userEmail }, '-created_date', 20),
    enabled: !!userEmail
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['user-achievements', userEmail],
    queryFn: () => base44.entities.UserAchievement.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', userEmail],
    queryFn: () => base44.entities.UserFollow.filter({ following_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', userEmail],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights', userEmail],
    queryFn: () => base44.entities.UserHighlight.filter({ user_email: userEmail }, 'order'),
    enabled: !!userEmail
  });

  const { data: allAchievements = [] } = useQuery({
    queryKey: ['all-achievements'],
    queryFn: () => base44.entities.Achievement.list()
  });

  const { data: _allBeacons = [] } = useQuery({
    queryKey: ['all-beacons'],
    queryFn: () => base44.entities.Beacon.list()
  });

  const { data: squadMembers = [] } = useQuery({
    queryKey: ['squad-members-profile'],
    queryFn: () => base44.entities.SquadMember.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: allSquads = [] } = useQuery({
    queryKey: ['all-squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  const _isFollowing = following.some(f => f.following_email === userEmail);
  const isOwnProfile = currentUser?.email === userEmail;

  const { data: profileUserTags = [] } = useQuery({
    queryKey: ['profile-user-tags', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      try {
        // Best-effort; RLS might restrict in some environments.
        return await base44.entities.UserTag.filter({ user_email: userEmail });
      } catch {
        return [];
      }
    },
    enabled: !!userEmail,
    staleTime: 60000,
    retry: false,
  });

  const tagIdsFromRows = Array.isArray(profileUserTags)
    ? profileUserTags
        .map((t) => t?.tag_id)
        .filter(Boolean)
    : [];

  const enrichedProfileUser = profileUser
    ? {
        ...profileUser,
        tag_ids:
          Array.isArray(profileUser?.tag_ids) && profileUser.tag_ids.length
            ? profileUser.tag_ids
            : Array.isArray(profileUser?.tags) && profileUser.tags.length
              ? profileUser.tags
              : tagIdsFromRows,
      }
    : profileUser;

  const [viewerOrigin, setViewerOrigin] = useState(null);

  const haversineMeters = useCallback((a, b) => {
    if (!a || !b) return Infinity;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }, []);

  const destination =
    Number.isFinite(profileUser?.last_lat) && Number.isFinite(profileUser?.last_lng)
      ? { lat: profileUser.last_lat, lng: profileUser.last_lng }
      : Number.isFinite(profileUser?.lat) && Number.isFinite(profileUser?.lng)
        ? { lat: profileUser.lat, lng: profileUser.lng }
        : null;

  useEffect(() => {
    if (!navigator.geolocation) return;

    // Only watch location when it can actually be used (for ETAs to another user's location).
    if (!currentUser?.email) return;
    if (!userEmail) return;
    if (isOwnProfile) return;
    if (!destination) return;

    // NOTE: We intentionally avoid `watchPosition` here.
    // On macOS (CoreLocation), `watchPosition` can spam the console with
    // `kCLErrorLocationUnknown` when the OS can't resolve location (indoors/VPN/etc).
    // For profile ETAs we only need a coarse origin; a single `getCurrentPosition`
    // keeps UX good and the console quiet.
    let cancelled = false;

    safeGetViewerLatLng(
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      { retries: 2, logKey: 'profile-eta' }
    ).then((loc) => {
      if (cancelled) return;
      if (!loc) return;
      const next = { lat: loc.lat, lng: loc.lng };
      setViewerOrigin((prev) => {
        if (!prev) return next;
        return haversineMeters(prev, next) >= 500 ? next : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, userEmail, isOwnProfile, destination, haversineMeters]);

  // In-app "connection" is a mutual follow (no Telegram handshake).
  const { data: viewerFollowing = [] } = useQuery({
    queryKey: ['viewer-following', currentUser?.email],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  const viewerFollowsProfile =
    !!currentUser?.email &&
    !!userEmail &&
    viewerFollowing.some((f) => normalizeEmail(f?.following_email) === normalizeEmail(userEmail));

  const profileFollowsViewer =
    !!currentUser?.email &&
    followers.some((f) => normalizeEmail(f?.follower_email) === normalizeEmail(currentUser?.email));

  const isConnection = isOwnProfile || (viewerFollowsProfile && profileFollowsViewer);

  const { data: travelEtas } = useQuery({
    queryKey: ['routing-etas', currentUser?.email, userEmail, viewerOrigin?.lat, viewerOrigin?.lng, destination?.lat, destination?.lng],
    queryFn: () => fetchRoutingEtas({ origin: viewerOrigin, destination, ttlSeconds: 120, modes: ['WALK', 'DRIVE', 'BICYCLE'] }),
    enabled: !!currentUser?.email && !!userEmail && !isOwnProfile && !!viewerOrigin && !!destination,
    retry: false,
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const { data: rightNowStatus } = useQuery({
    queryKey: ['right-now-profile', userEmail],
    queryFn: async () => {
      const statuses = await base44.entities.RightNowStatus.filter({
        user_email: userEmail,
        active: true
      });
      return statuses.find(s => new Date(s.expires_at) > new Date()) || null;
    },
    enabled: !!userEmail,
    refetchInterval: 15000
  });

  // Track profile view
  useEffect(() => {
    const trackView = async () => {
      if (!currentUser || !userEmail || isOwnProfile) return;
      
      try {
        await base44.entities.ProfileView.create({
          viewer_email: currentUser.email,
          viewed_email: userEmail,
          viewed_at: new Date().toISOString(),
        });
      } catch {
        logger.debug('Failed to track profile view');
      }
    };
    
    trackView();
  }, [currentUser, userEmail, isOwnProfile]);

  // Fetch profile views
  const { data: profileViews = [] } = useQuery({
    queryKey: ['profile-views', userEmail],
    queryFn: () => base44.entities.ProfileView.filter({ viewed_email: userEmail }, '-viewed_at'),
    enabled: !!userEmail && isOwnProfile,
  });

  const viewCount = profileViews.length;
  const tierRaw = currentUser?.membership_tier;
  const _tier = tierRaw === 'free' ? 'basic' : tierRaw || 'basic';
  const level = Math.floor(((profileUser?.xp ?? 0) || 0) / 1000) + 1;
  // Chrome tier: Level 5+ can see WHO viewed their profile
  const canSeeViewers = level >= 5;

  const _followMutation = useMutation({
    mutationFn: () => base44.entities.UserFollow.create({
      follower_email: currentUser.email,
      following_email: userEmail
    }),
    onSuccess: () => queryClient.invalidateQueries(['following', currentUser.email])
  });

  const _unfollowMutation = useMutation({
    mutationFn: () => {
      const followRecord = following.find(f => f.following_email === userEmail);
      return base44.entities.UserFollow.delete(followRecord.id);
    },
    onSuccess: () => queryClient.invalidateQueries(['following', currentUser.email])
  });

  const pinMutation = useMutation({
    mutationFn: (data) => base44.entities.UserHighlight.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['highlights']);
      toast.success('Pinned!');
    }
  });

  const unpinMutation = useMutation({
    mutationFn: (id) => base44.entities.UserHighlight.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['highlights']);
      toast.success('Unpinned');
    }
  });

  const userSquads = allSquads.filter(s => squadMembers.some(sm => sm.squad_id === s.id));
  const achievementDetails = achievements.map(ua => {
    const achDetail = allAchievements.find(a => a.id === ua.achievement_id);
    return { ...ua, ...achDetail };
  });

  const handlePinCheckIn = (checkIn) => {
    if (!isOwnProfile) return;
    const alreadyPinned = highlights.find(h => h.item_type === 'checkin' && h.item_id === checkIn.id);
    if (alreadyPinned) {
      unpinMutation.mutate(alreadyPinned.id);
    } else {
      pinMutation.mutate({
        user_email: currentUser.email,
        item_type: 'checkin',
        item_id: checkIn.id,
        order: highlights.length
      });
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!String(profileType || '').trim()) {
      toast.error('Please choose a profile type');
      return;
    }

    if (!String(city || '').trim()) {
      toast.error('Please enter your city');
      return;
    }

    const normalizedGender = String(gender || '').trim().toLowerCase();
    if (normalizedGender !== 'male' && normalizedGender !== 'man' && normalizedGender !== 'm') {
      toast.error('This experience is currently male-only.');
      return;
    }

    if (!photoPolicyAck) {
      toast.error('Please confirm your photos are of men.');
      return;
    }

    setSaving(true);
    setUploading(!!avatarFile);

    try {
      let avatarUrl = profileUser?.avatar_url || null;

      // If the user didn't upload an avatar (or storage is misconfigured), fall back to a
      // generated SVG so setup can complete and the grid has something to show.
      if (!avatarUrl && !avatarFile) {
        avatarUrl = buildInitialsAvatarDataUrl(fullName);
        toast.message('Using a placeholder avatar (you can change it later).');
      }

      if (avatarFile) {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: avatarFile });
          avatarUrl = file_url;
        } catch (uploadError) {
          // Non-fatal: still allow setup completion.
          logger.warn('Avatar upload failed; falling back to placeholder', uploadError);
          avatarUrl = avatarUrl || buildInitialsAvatarDataUrl(fullName);
          toast.message('Avatar upload failed; using a placeholder for now.');
        } finally {
          setUploading(false);
        }
      }

      await base44.auth.updateMe({
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
        profile_type: profileType,
        city: city.trim(),
        bio: bio.trim(),
        gender: 'male',
        photo_policy_ack: true,
        seller_tagline: profileType === 'seller' ? sellerTagline.trim() : null,
        seller_bio: profileType === 'seller' ? sellerBio.trim() : null,
        shop_banner_url: profileType === 'seller' ? shopBannerUrl.trim() : null,
      });
      toast.success('Profile complete!');

      const next = typeof nextParam === 'string' ? nextParam.trim() : '';
      const safeNext = next.startsWith('/') ? next : '';
      window.location.href = safeNext || createPageUrl('Home');
    } catch (error) {
      logger.error('Profile setup failed:', error);
      const msg =
        (error && typeof error === 'object' && 'message' in error && error.message)
          ? String(error.message)
          : 'Setup failed. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (!profileUser) {
    const isLoading = isViewingOtherUser
      ? isLoadingAllUsers || isLoadingFetchedProfileUser
      : false;

    if (!isLoading && isViewingOtherUser) {
      return (
        <ErrorBoundary>
          <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
              <h1 className="text-2xl font-black uppercase tracking-tight">Profile not found</h1>
              <p className="mt-2 text-white/60 text-sm">
                This profile may be private, deleted, or not accessible in your environment.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button onClick={() => (window.location.href = createPageUrl('Home'))}>
                  Go Home
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  Back
                </Button>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-white/60">Loading...</p>
        </div>
      </ErrorBoundary>
    );
  }

  // Render setup mode if *your* profile is incomplete.
  // NOTE: previously this was gated by `!userEmail`, but `userEmail` is always present for authenticated users.
  if (isSetupMode && !isViewingOtherUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black uppercase mb-2">
              <span className="text-[#FF1493]">HOT</span>MESS
            </h1>
            <p className="text-sm text-white/60 uppercase tracking-wider">Complete Your Profile</p>
          </div>

          <form onSubmit={handleSetupSubmit} className="bg-white/5 border-2 border-white p-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 bg-gradient-to-br from-[#FF1493] to-[#B026FF] border-2 border-white flex items-center justify-center overflow-hidden">
                {avatarFile ? (
                  <img
                    src={URL.createObjectURL(avatarFile)}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                    style={{ filter: 'grayscale(100%)' }}
                  />
                ) : (
                  <User className="w-16 h-16 text-white/40" />
                )}
              </div>
              <Button
                type="button"
                onClick={() => document.getElementById('avatar-upload').click()}
                className="bg-white text-black hover:bg-[#FF1493] hover:text-white font-black"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Avatar
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-white/40 uppercase text-center">
                Avatar will be displayed in grayscale
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="bg-white/5 border-2 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                Profile Type
              </label>
              <p className="text-xs text-white/50 mb-3">
                This powers your card and unlocks different experiences.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'standard', label: 'STANDARD', desc: 'Connect + social' },
                  { value: 'seller', label: 'SELLER', desc: 'MessMarket shop' },
                  { value: 'creator', label: 'CREATOR', desc: 'Music + events' },
                  { value: 'premium', label: 'PREMIUM', desc: 'Exclusive content' },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setProfileType(t.value)}
                    className={`p-4 text-left border-2 transition-all ${
                      profileType === t.value
                        ? 'bg-[#FF1493] border-[#FF1493] text-black'
                        : 'bg-white/5 border-white/20 text-white hover:border-white/40'
                    }`}
                  >
                    <div className="font-black uppercase text-xs mb-1">{t.label}</div>
                    <div className="text-[10px] opacity-70">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                City
              </label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="London"
                className="bg-white/5 border-2 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                Bio (Optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you about? What are you here for?"
                rows={4}
                className="w-full bg-white/5 border-2 border-white/20 p-3 text-white placeholder:text-white/40 focus:border-[#FF1493] focus:outline-none"
              />
            </div>

            {profileType === 'seller' && (
              <div className="border-2 border-[#00D9FF] p-4 bg-black">
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-widest text-[#00D9FF] font-black">Seller Details</p>
                  <p className="text-xs text-white/50">These show up on your card and help cross-sell.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                      Shop Tagline
                    </label>
                    <Input
                      type="text"
                      value={sellerTagline}
                      onChange={(e) => setSellerTagline(e.target.value)}
                      placeholder="Club gear, prints, styling, tickets…"
                      className="bg-white/5 border-2 border-white/20 text-white"
                      maxLength={60}
                    />
                    <p className="text-xs text-white/40 mt-1">{sellerTagline.length}/60</p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                      Seller Bio (Optional)
                    </label>
                    <textarea
                      value={sellerBio}
                      onChange={(e) => setSellerBio(e.target.value)}
                      placeholder="What you sell, shipping/pickup, collaborations…"
                      rows={4}
                      maxLength={500}
                      className="w-full bg-white/5 border-2 border-white/20 p-3 text-white placeholder:text-white/40 focus:border-[#00D9FF] focus:outline-none"
                    />
                    <p className="text-xs text-white/40 mt-1">{sellerBio.length}/500</p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
                      Shop Banner URL (Optional)
                    </label>
                    <Input
                      type="url"
                      value={shopBannerUrl}
                      onChange={(e) => setShopBannerUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-white/5 border-2 border-white/20 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="border border-white/10 bg-black/40 p-4">
              <p className="text-xs uppercase tracking-widest text-white/50 font-black">Photo Policy</p>
              <p className="mt-1 text-xs text-white/60">
                All profile photos must be of men.
              </p>
              <label className="mt-3 flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={photoPolicyAck}
                  onChange={(e) => setPhotoPolicyAck(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I confirm my profile photos depict men.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={saving || !fullName.trim() || !String(profileType || '').trim() || !String(city || '').trim() || !photoPolicyAck}
              className="w-full bg-[#FF1493] hover:bg-white text-white hover:text-black font-black text-lg py-6 border-2 border-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {uploading ? 'UPLOADING...' : 'SAVING...'}
                </>
              ) : (
                'COMPLETE SETUP'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  const profileTypeKey = profileUser?.profile_type || 'standard';

  return (
    <ErrorBoundary>
      <WelcomeTour />
      <div className="min-h-screen bg-black text-white">
        {/* Profile Completeness */}
        {isOwnProfile && (
          <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <ProfileCompleteness user={profileUser} />
            </div>
          </div>
        )}

        {/* Profile Header */}
        <ProfileHeader 
          user={profileUser} 
          isOwnProfile={isOwnProfile} 
          currentUser={currentUser} 
          travelEtas={travelEtas}
        />

        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Vibe Synthesis - AI-Generated Character Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <VibeSynthesisCard userEmail={userEmail || currentUser?.email} />
          </motion.div>

          {/* Right Now Status */}
          {rightNowStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <RightNowIndicator status={rightNowStatus} />
            </motion.div>
          )}

          {/* Social Links - visible to mutual follows */}
          {profileUser.social_links && Object.values(profileUser.social_links).some(v => v) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6"
            >

              {isConnection ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-[#00D9FF]" />
                    <p className="text-xs text-white/40 uppercase">Social Links (Connected)</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const sanitizedLinks = sanitizeSocialLinks(profileUser.social_links || {});
                      return (
                        <>
                          {sanitizedLinks.instagram && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.instagram, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#833AB4] to-[#E1306C] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                                            >
                                              <Instagram className="w-4 h-4" />
                                              Instagram
                                            </a>
                                          )}
                                          {sanitizedLinks.twitter && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.twitter, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-black rounded-lg text-white text-sm border border-white/20 hover:bg-white/10 transition-colors"
                                            >
                                              <Twitter className="w-4 h-4" />
                                              Twitter
                                            </a>
                                          )}
                                          {sanitizedLinks.spotify && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.spotify, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-[#1DB954] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                                            >
                                              <Music className="w-4 h-4" />
                                              Spotify
                                            </a>
                                          )}
                                          {sanitizedLinks.soundcloud && (
                                            <a
                                              href={sanitizeURL(sanitizedLinks.soundcloud, { allowHttp: false })}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-[#FF5500] rounded-lg text-white text-sm hover:opacity-80 transition-opacity"
                                            >
                                              <Music className="w-4 h-4" />
                                              SoundCloud
                                            </a>
                                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Lock className="w-4 h-4" />
                  <p>Mutual follow required to view social links</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Profile Type Specific View */}
          {profileTypeKey === 'seller' ? (
            <SellerProfileView user={enrichedProfileUser} />
          ) : (
            <StandardProfileView 
              user={enrichedProfileUser} 
              currentUser={currentUser} 
              isHandshakeConnection={isConnection} 
              isOwnProfile={isOwnProfile}
            />
          )}

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <ProfileStats
              xp={profileUser.xp}
              level={level}
              followersCount={followers.length}
              followingCount={following.length}
              checkInsCount={checkIns.length}
              achievementsCount={achievements.length}
              city={profileUser.city}
            />
          </motion.div>

          {/* Profile Views */}
          {isOwnProfile && viewCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6 bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#00D9FF]" />
                  <h2 className="text-xl font-black uppercase">Profile Views</h2>
                </div>
                <span className="text-2xl font-black text-[#00D9FF]">{viewCount}</span>
              </div>
              
              {canSeeViewers ? (
                <div className="space-y-2">
                  <p className="text-xs text-white/60 uppercase mb-3">Recent Viewers (Chrome Tier - Level 5+)</p>
                  {profileViews.slice(0, 10).map((view, idx) => {
                    const viewer = allUsers.find(u => u.email === view.viewer_email);
                    if (!viewer) return null;
                    
                    return (
                      <Link key={idx} to={createPageUrl(`Profile?email=${viewer.email}`)}>
                        <div className="flex items-center gap-3 p-2 hover:bg-white/5 transition-colors">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#FF1493] to-[#B026FF] border border-white flex items-center justify-center">
                            {viewer.avatar_url ? (
                              <img src={viewer.avatar_url} alt={viewer.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold">{viewer.full_name?.[0]}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{viewer.full_name}</p>
                            <p className="text-xs text-white/40">{format(new Date(view.viewed_at), 'MMM d, h:mm a')}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-white/60 mb-2">
                    Reach Level 5 to unlock Chrome tier and see who viewed your profile
                  </p>
                  <p className="text-xs text-white/40">
                    Currently Level {level} • Need {(5 - level) * 1000} more XP
                  </p>
                </div>
              )}
            </motion.div>
          )}



        {/* Highlights Section */}
        {highlights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-[#FFEB3B]" />
              <h2 className="text-xl font-black uppercase">Highlights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {highlights.slice(0, 6).map((highlight, idx) => {
                const checkIn = checkIns.find(c => c.id === highlight.item_id);
                const squad = userSquads.find(s => s.id === highlight.item_id);
                const achievement = achievementDetails.find(a => a.id === highlight.item_id);
                
                return (
                  <motion.div
                    key={highlight.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-[#FFEB3B]/10 to-[#FF1493]/10 border-2 border-[#FFEB3B] rounded-none p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Star className="w-5 h-5 text-[#FFEB3B]" />
                      {highlight.item_type === 'checkin' && checkIn && (
                        <span className="text-xs text-[#00D9FF] font-bold uppercase">Check-in</span>
                      )}
                      {highlight.item_type === 'squad' && squad && (
                        <span className="text-xs text-[#B026FF] font-bold uppercase">Squad</span>
                      )}
                      {highlight.item_type === 'achievement' && achievement && (
                        <span className="text-xs text-[#FFEB3B] font-bold uppercase">Badge</span>
                      )}
                    </div>
                    {checkIn && (
                      <h3 className="font-bold text-sm">{checkIn.beacon_title}</h3>
                    )}
                    {squad && (
                      <h3 className="font-bold text-sm">{squad.name}</h3>
                    )}
                    {achievement && (
                      <h3 className="font-bold text-sm">{achievement.title}</h3>
                    )}
                    {highlight.note && (
                      <p className="text-xs text-white/60 mt-1">{highlight.note}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Badges Display */}
        {achievementDetails.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[#FF1493]" />
              <h2 className="text-xl font-black uppercase">Badges</h2>
              <span className="text-sm text-white/60">({achievementDetails.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {achievementDetails.slice(0, 12).map((ach, idx) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative group"
                  title={ach.title || 'Achievement'}
                >
                  <div 
                    className="w-16 h-16 rounded-full border-4 flex items-center justify-center"
                    style={{ 
                      borderColor: ach.color || '#FFEB3B',
                      backgroundColor: `${ach.color || '#FFEB3B'}20`
                    }}
                  >
                    <Trophy className="w-6 h-6" style={{ color: ach.color || '#FFEB3B' }} />
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border-2 border-white rounded-none text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="font-bold">{ach.title}</div>
                    <div className="text-white/60">{ach.description}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="checkins">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="squads">Squads</TabsTrigger>
          </TabsList>

          <TabsContent value="checkins">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checkIns.map((checkIn, idx) => {
                const isPinned = highlights.some(h => h.item_type === 'checkin' && h.item_id === checkIn.id);
                return (
                  <motion.div
                    key={checkIn.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 relative"
                  >
                    {isOwnProfile && (
                      <Button
                        onClick={() => handlePinCheckIn(checkIn)}
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                      >
                        <Pin className={`w-4 h-4 ${isPinned ? 'fill-[#FFEB3B] text-[#FFEB3B]' : 'text-white/40'}`} />
                      </Button>
                    )}
                    {checkIn.photo_url && (
                      <img src={checkIn.photo_url} alt="Check-in" className="w-full h-48 object-cover rounded-lg mb-3" />
                    )}
                    <Link to={createPageUrl(`BeaconDetail?id=${checkIn.beacon_id}`)}>
                      <h3 className="font-bold mb-1 hover:text-[#FF1493] transition-colors">{sanitizeText(checkIn.beacon_title)}</h3>
                    </Link>
                    {checkIn.note && <p className="text-sm text-white/60 mb-2">{sanitizeText(checkIn.note)}</p>}
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(checkIn.created_date), 'MMM d, yyyy')}</span>
                    </div>
                  </motion.div>
                );
              })}
              {checkIns.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No check-ins yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievementDetails.map((ach, idx) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-gradient-to-br from-[#FFEB3B]/10 to-[#FF6B35]/10 border-2 rounded-none p-5"
                  style={{ borderColor: ach.color || '#FFEB3B' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-full border-4 flex items-center justify-center"
                      style={{ 
                        borderColor: ach.color || '#FFEB3B',
                        backgroundColor: `${ach.color || '#FFEB3B'}20`
                      }}
                    >
                      <Trophy className="w-6 h-6" style={{ color: ach.color || '#FFEB3B' }} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm">{ach.title || 'Achievement'}</h3>
                      <p className="text-xs text-white/60">{format(new Date(ach.unlocked_date || ach.created_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  {ach.description && (
                    <p className="text-xs text-white/60">{ach.description}</p>
                  )}
                  {ach.xp_required && (
                    <div className="mt-2 text-xs text-[#FFEB3B] font-bold">
                      {ach.xp_required} XP
                    </div>
                  )}
                </motion.div>
              ))}
              {achievements.length === 0 && (
                <div className="col-span-3 text-center py-12 text-white/40">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No achievements unlocked yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="squads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userSquads.map((squad, idx) => (
                <motion.div
                  key={squad.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-5"
                >
                  <h3 className="font-black text-lg mb-2">{squad.name}</h3>
                  <p className="text-sm text-white/60 mb-3">{squad.description}</p>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#B026FF]">
                    <Users className="w-4 h-4" />
                    <span>{squad.interest}</span>
                  </div>
                </motion.div>
              ))}
              {userSquads.length === 0 && (
                <div className="col-span-2 text-center py-12 text-white/40">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Not in any squads yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
}