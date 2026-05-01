/**
 * L2ProfileSheet — Full-bleed profile with content cards
 *
 * Matches the design mockup:
 *   - Hero photo (top 45vh) with gradient overlay
 *   - Persona name + travel icon + visiting city + distance/ETA
 *   - Content cards stack: Hookup / For Sale / Creator
 *   - Bottom actions: Message + more menu
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import {
  MessageCircle, Shield, Plane,
  Loader2, MoreVertical, Flag, Ban, X, ChevronLeft, Ghost,
  Footprints, Bike, Car, Heart, Video, Share2, ShoppingBag, Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import ProfileContentCard from '@/components/cards/ProfileContentCard';
import { useTaps } from '@/hooks/useTaps';
import { useV6Flag } from '@/hooks/useV6Flag';
import { ProfileProximityPanel } from '@/components/profile/ProfileProximityPanel';

const Chip = ({ children, gold = false }) => (
  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
    gold
      ? 'bg-[#C8962C]/15 text-[#C8962C] border-[#C8962C]/30'
      : 'bg-white/8 text-white/60 border-white/10'
  }`}>
    {children}
  </span>
);

// ── Photo carousel (CSS snap-scroll, 3:4 portrait) ──────────────────────────
function PhotoCarousel({ images = [], fallbackInitial = '?', onIndexChange }) {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    const clamped = Math.max(0, Math.min(idx, images.length - 1));
    setActiveIdx(clamped);
    onIndexChange?.(clamped);
  }, [images.length, onIndexChange]);

  // 0 photos — initials fallback
  if (!images.length) {
    return (
      <div className="relative" style={{ aspectRatio: '3/4', maxHeight: '55vh' }}>
        <div className="w-full h-full bg-gradient-to-br from-[#C8962C]/40 via-[#1C1C1E] to-black flex items-center justify-center">
          <span className="text-6xl font-black text-white/20">{fallbackInitial}</span>
        </div>
      </div>
    );
  }

  // 1 photo — static, no dots
  if (images.length === 1) {
    return (
      <div className="relative" style={{ aspectRatio: '3/4', maxHeight: '55vh' }}>
        <img src={images[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  // Multi-photo carousel
  return (
    <div className="relative" style={{ aspectRatio: '3/4', maxHeight: '55vh' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((url, i) => (
          <div key={i} className="w-full h-full flex-shrink-0 snap-center">
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === activeIdx ? 'bg-[#C8962C] w-4' : 'bg-white/30 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function L2ProfileSheet({ email, uid, id }) {
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useSheet();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [myEmail, setMyEmail] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMyUserId(session?.user?.id ?? null);
      setMyEmail(session?.user?.email ?? null);
    });
  }, []);

  const { isTapped, sendTap } = useTaps(myUserId, myEmail);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // ── Data queries ────────────────────────────────────────────────────────

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
    },
  });

  // Normalise: accept uid, id, or legacy profile_xxx format
  const rawId = uid || id || null;
  const resolvedUid = rawId && typeof rawId === 'string' ? rawId.replace(/^profile_/, '') : rawId;

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['profile-sheet', email, resolvedUid],
    queryFn: async () => {
      if (!email && !resolvedUid) {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
      }

      const qs = new URLSearchParams();
      if (email) qs.set('email', email);
      else if (resolvedUid) qs.set('uid', resolvedUid);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch(`/api/profile?${qs.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const payload = await res.json();
          return payload?.user || null;
        }
      } catch {}

      if (email) {
        const { data, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
        if (error) throw error;
        return data || null;
      }
      if (resolvedUid) {
        // profiles.id IS the auth user UUID — no separate auth_user_id column
        const { data, error } = await supabase.from('profiles').select('*').eq('id', resolvedUid).maybeSingle();
        if (error) throw error;
        return data || null;
      }
      return null;
    },
  });

  // Robust own-profile detection: match on email OR auth_user_id
  const [authUid, setAuthUid] = useState(null);
  const [travelTimes, setTravelTimes] = useState(null);
  const isProximityCard = useV6Flag('v6_profile_proximity');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data?.user?.id) setAuthUid(data.user.id); });
  }, []);

  // Travel times calculation
  useEffect(() => {
    // Get viewer's location and consent
    const getViewerCoords = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Fetch viewer's consent and profile user's consent from profiles table
        const [viewerResult, profileResult] = await Promise.all([
          supabase.from('profiles').select('location_consent, last_lat, last_lng').eq('id', user.id).single(),
          supabase.from('profiles').select('location_consent, last_lat, last_lng').eq('id', profileUser.id).single()
        ]);

        if (!viewerResult.data?.location_consent || !profileResult.data?.location_consent) {
          console.log('[Profile] 🛡️ Location consent missing for one or both users');
          setTravelTimes(null);
          return;
        }

        const myProfile = viewerResult.data;
        if (!myProfile?.last_lat || !myProfile?.last_lng) {
          console.log('[Profile] 📍 Viewer has no stored coordinates');
          return;
        }

        const destLat = profileResult.data?.last_lat;
        const destLng = profileResult.data?.last_lng;
        const originLat = myProfile.last_lat;
        const originLng = myProfile.last_lng;

        // Calculate approximate travel times based on distance
        const R = 6371; // Earth radius km
        const dLat = (destLat - originLat) * Math.PI / 180;
        const dLon = (destLng - originLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        // Rough estimates: walking 5km/h, cycling 15km/h, uber 30km/h avg
        setTravelTimes({
          walking: { durationSeconds: Math.round(distKm / 5 * 3600) },
          bicycling: { durationSeconds: Math.round(distKm / 15 * 3600) },
          uber: { durationSeconds: Math.round(distKm / 30 * 3600) },
          distKm,
        });
      } catch {}
    };

    getViewerCoords();
  }, [profileUser]);

  // profiles.id IS the auth user UUID — no separate auth_user_id column in prod
  const profileUid = profileUser?.auth_user_id || profileUser?.id;
  const isOwnProfile =
    (!email && !resolvedUid) ||
    (currentUser?.email && profileUser?.email && profileUser.email === currentUser.email) ||
    (authUid && profileUid && authUid === profileUid);

  // Self-guard: if this sheet opens for the logged-in user, redirect to /profile
  useEffect(() => {
    if (isOwnProfile && profileUser) {
      closeSheet();
      navigate('/profile');
    }
  }, [isOwnProfile, profileUser]);

  // Record profile view when profile loads (fire and forget, dedup: skip if viewed in last 24h)
  // profile_views uses UUID-based viewer_id / viewed_id (references auth.users.id = profiles.id)
  useEffect(() => {
    const viewedUid = profileUser?.auth_user_id || profileUser?.id;
    if (!viewedUid || isOwnProfile) return;

    const recordView = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;
        if (viewedUid === user.id) return; // own profile — belt-and-suspenders check

        // Check if already recorded in the last 24h to avoid spam
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('viewer_id', user.id)
          .eq('viewed_id', viewedUid)
          .gte('viewed_at', since24h);

        if (count && count > 0) return; // already logged today

        await supabase.from('profile_views').insert({
          viewer_id: user.id,
          viewed_id: viewedUid,
        });
      } catch (err) {
        console.warn('[ProfileSheet] View recording skipped:', err);
      }
    };

    recordView();
  }, [profileUser?.id, profileUser?.auth_user_id, isOwnProfile]);

  // Fetch public profile attributes (body_type, position, looking_for, etc.)
  const { data: profileAttrs } = useQuery({
    queryKey: ['profile-attrs', profileUser?.auth_user_id],
    queryFn: async () => {
      if (!profileUser?.auth_user_id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('public_attributes')
        .eq('id', profileUser.auth_user_id)
        .maybeSingle();
      return data?.public_attributes || null;
    },
    enabled: !!profileUser?.auth_user_id,
  });

  // Fetch user's events (RSVPs)
  const { data: userEvents = [] } = useQuery({
    queryKey: ['user-events', profileUser?.email],
    queryFn: async () => {
      if (!profileUser?.email) return [];
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('user_email', profileUser.email)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileUser?.email,
  });

  // Fetch Right Now status
  const { data: rightNowStatus } = useQuery({
    queryKey: ['right-now-status', profileUser?.email],
    queryFn: async () => {
      if (!profileUser?.email) return null;
      const { data } = await supabase
        .from('right_now_status')
        .select('*')
        .eq('user_email', profileUser.email)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      return data || null;
    },
    enabled: !!profileUser?.email,
  });

  // Preloved listings (For Sale)
  const { data: listings = [] } = useQuery({
    queryKey: ['profile-listings', profileUser?.email],
    queryFn: async () => {
      if (!profileUser?.email) return [];
      const { data } = await supabase
        .from('market_listings')
        .select('id, title, description, price, currency, images, delivery_type')
        .eq('seller_id', profileUser.id)
        .eq('status', 'active')
        .limit(3);
      return data || [];
    },
    enabled: !!profileUser?.email,
  });

  // Check if profile is saved/favorited
  useEffect(() => {
    if (!profileUser?.auth_user_id && !profileUser?.id) return;
    const checkSaved = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const targetId = profileUser.auth_user_id || profileUser.id;
        const { count } = await supabase
          .from('taps')
          .select('id', { count: 'exact', head: true })
          .eq('from_user_id', user.id)
          .eq('to_user_id', targetId)
          .eq('tap_type', 'save');
        setIsSaved((count || 0) > 0);
      } catch {}
    };
    checkSaved();
  }, [profileUser?.auth_user_id, profileUser?.id]);

  // Fetch view count for this profile
  const { data: viewCount } = useQuery({
    queryKey: ['profile-view-count', profileUser?.auth_user_id],
    queryFn: async () => {
      if (!profileUser?.auth_user_id) return 0;
      const { count } = await supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('viewed_id', profileUser.auth_user_id);
      return count || 0;
    },
    enabled: !!profileUser?.auth_user_id,
  });

  // Fetch artist match (does this user have label_artists entry?)
  const { data: artistRecord } = useQuery({
    queryKey: ['profile-artist', profileUser?.auth_user_id],
    queryFn: async () => {
      if (!profileUser?.auth_user_id) return null;
      const { data } = await supabase
        .from('label_artists')
        .select('id, artist_name')
        .eq('user_id', profileUser.auth_user_id)
        .maybeSingle();
      return data || null;
    },
    enabled: !!profileUser?.auth_user_id,
  });

  // Total preloved listing count (for cross-link)
  const { data: totalListingCount } = useQuery({
    queryKey: ['profile-listing-count', profileUser?.id],
    queryFn: async () => {
      if (!profileUser?.id) return 0;
      const { count } = await supabase
        .from('market_listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', profileUser.id)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!profileUser?.id,
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleShare = async () => {
    const handle = profileUser?.username || profileUser?.display_name || 'someone';
    const shareUrl = `https://hotmessldn.com/ghosted?profile=${encodeURIComponent(profileUser?.auth_user_id || profileUser?.id || '')}`;
    const shareData = {
      title: `${handle} on HOTMESS`,
      text: `Check out ${handle} on HOTMESS`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    } catch {
      // User cancelled share
    }
  };

  const handleSaveToggle = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Sign in to save profiles'); return; }
      const targetId = profileUser.auth_user_id || profileUser.id;

      if (isSaved) {
        await supabase
          .from('taps')
          .delete()
          .eq('from_user_id', user.id)
          .eq('to_user_id', targetId)
          .eq('tap_type', 'save');
        setIsSaved(false);
        toast('Removed from saved');
      } else {
        await supabase
          .from('taps')
          .insert({ from_user_id: user.id, to_user_id: targetId, tapper_email: user.email || '', tapped_email: profileUser.email || '', tap_type: 'save' });
        setIsSaved(true);
        toast.success('Profile saved');
      }
    } catch {
      toast.error('Couldn\'t save. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareLocation = async () => {
    if (!profileUser?.id || !myUserId || !myEmail) return;

    const toastId = toast.loading('Establishing GPS lock...');
    try {
      // 0. Check consent first
      const { data: profile } = await supabase
        .from('profiles')
        .select('location_consent')
        .eq('id', user.id)
        .single();
      
      if (profile && profile.location_consent === false) {
        toast.error('Location sharing is disabled in your profile settings.', {
          id: toastId,
          action: { label: 'Enable', onClick: () => openSheet(SHEET_TYPES.EDIT_PROFILE) }
        });
        return;
      }

      // 1. Get current position
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      // 2. Resolve/Create thread
      let { data: thread } = await supabase
        .from('chat_threads')
        .select('id, participant_emails, unread_count')
        .contains('participant_emails', [myEmail, profileUser.email])
        .maybeSingle();

      if (!thread) {
        const { data: newThread, error: threadErr } = await supabase
          .from('chat_threads')
          .insert({
            participant_emails: [myEmail, profileUser.email],
            active: true,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (threadErr) throw threadErr;
        thread = newThread;
      }

      // 3. Send map-pin message
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: thread.id,
          sender_email: myEmail,
          message_type: 'map-pin',
          content: '📍 Shared my location',
          created_date: new Date().toISOString(),
          metadata: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
        });
      if (msgError) throw msgError;

      toast.success('Location shared in chat! 📍', { id: toastId });
      
      // Optionally open the chat sheet
      openSheet(SHEET_TYPES.CHAT, {
        thread: thread.id,
        userId: profileUser.id,
        title: `Chat with ${name}`
      });

    } catch (err) {
      toast.error(err.message || 'Could not share location', { id: toastId });
    }
  };

  const handleVideoCall = () => {
    if (!profileUser?.auth_user_id && !profileUser?.id) return;
    openSheet(SHEET_TYPES.VIDEO, {
      toUid: profileUser.auth_user_id || profileUser.id,
      title: `Video with ${profileUser.username || profileUser.display_name || 'Anonymous'}`,
    });
  };

  const handleMessage = () => {
    if (!profileUser?.auth_user_id && !profileUser?.id) return;
    // Pass uid instead of email (email is not exposed in profile response for GDPR)
    // ChatSheet will look up the email server-side
    openSheet(SHEET_TYPES.CHAT, {
      userId: profileUser.auth_user_id || profileUser.id,
      title: `Chat with ${profileUser.username || profileUser.profileName || profileUser.display_name || 'Anonymous'}`,
    });
  };

  const handleBlock = async () => {
    if (!currentUser || !profileUser) return;
    setIsBlocking(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Write to user_blocks (canonical table — read by api/profiles.js for grid filtering)
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_email: currentUser.email,
          blocked_email: profileUser.email || profileUser.userId,
        });

      if (error && !error.message?.includes('duplicate')) throw error;

      toast.success(`${profileUser.username || profileUser.display_name || 'User'} blocked`);
      setShowMoreMenu(false);
      closeSheet();
    } catch {
      toast.error('Couldn\'t block this user. Try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleReport = async () => {
    if (!currentUser || !profileUser || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_email: currentUser.email,
          reported_item_type: 'user',
          reported_item_id: profileUser.email,
          reason: reportReason,
          status: 'pending',
        });

      if (error) throw error;
      toast.success('Report submitted. Our team will review it.');
      setShowReportModal(false);
      setReportReason('');
      setShowMoreMenu(false);
    } catch {
      toast.error('Couldn\'t submit report. Try again.');
    } finally {
      setIsReporting(false);
    }
  };

  // ── Loading / empty states ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    // Determine error type for differentiated states
    const isNetworkError = !navigator.onLine ||
      (typeof profileUser === 'undefined' && !email && !resolvedUid);

    // Deleted profile: we got a response but profile is null (404 equivalent)
    const isDeleted = profileUser === null && (email || resolvedUid);

    if (isNetworkError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
            <Ghost className="w-7 h-7 text-white/10" />
          </div>
          <p className="text-white font-bold text-base mb-1">Couldn't load this profile</p>
          <p className="text-white/40 text-sm mb-5">Check your connection and try again.</p>
          <div className="flex gap-3">
            <Button
              className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-bold"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
            <Button variant="outline" onClick={closeSheet}>Back</Button>
          </div>
        </div>
      );
    }

    if (isDeleted) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
            <Ghost className="w-7 h-7 text-white/10" />
          </div>
          <p className="text-white font-bold text-base mb-1">This profile is no longer available</p>
          <p className="text-white/40 text-sm mb-5">It may have been removed or deactivated.</p>
          <div className="flex gap-3">
            <Button
              className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-bold"
              onClick={() => { closeSheet(); navigate('/ghosted'); }}
            >
              Browse others
            </Button>
            <Button variant="outline" onClick={closeSheet}>Back</Button>
          </div>
        </div>
      );
    }

    // Generic fallback
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
          <Ghost className="w-7 h-7 text-white/10" />
        </div>
        <p className="text-white font-bold text-base mb-1">Something went wrong</p>
        <p className="text-white/40 text-sm mb-5">We couldn't load this profile right now.</p>
        <div className="flex gap-3">
          <Button
            className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-bold"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => openSheet('help')}
          >
            Report issue
          </Button>
        </div>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────

  // IDENTITY MODEL: username is the public handle — never expose real name to other users
  const name = profileUser.username || profileUser.profileName || profileUser.display_name || 'Anonymous';
  const avatarUrl = profileUser.avatar_url || profileUser.photos?.[0];
  const isTravel = profileUser.persona === 'TRAVEL' || profileUser.persona === 'travel';
  const visitingCity = profileUser.city || profileUser.visiting_city;
  const distance = profileUser.distance_km || profileUser.distance;
  const etaMin = profileUser.eta_min || (distance ? Math.ceil(distance * 1.2) : null);
  const isVerified = profileUser.is_verified;
  const isCreator = profileUser.is_creator || profileUser.radio_show_url || profileUser.soundcloud;
  const intentLabel = rightNowStatus?.intent
    ? rightNowStatus.intent.charAt(0).toUpperCase() + rightNowStatus.intent.slice(1)
    : null;

  return (
    <div className="pb-20 -mt-4">
      {/* ── Photo carousel (full-bleed, 3:4 portrait) ────────────────── */}
      <div className="relative">
        <PhotoCarousel
          images={(() => {
            const urls = [];
            const seen = new Set();
            const add = (u) => { if (u && !seen.has(u)) { seen.add(u); urls.push(u); } };
            add(avatarUrl);
            (profileUser.photos || []).forEach(p => add(typeof p === 'string' ? p : p?.url));
            return urls;
          })()}
          fallbackInitial={name[0]}
          onIndexChange={setActivePhotoIdx}
        />

        {/* Gradient overlay at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #050507 0%, transparent 100%)' }}
        />

        {/* Back button */}
        <button
          onClick={closeSheet}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm active:bg-black/70 z-20"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Top-right actions: share + more */}
        <div
          className="absolute top-4 right-4 flex items-center gap-2 z-20"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <button
            onClick={handleShare}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm active:bg-black/70"
            aria-label="Share profile"
          >
            <Share2 className="w-4.5 h-4.5 text-white" />
          </button>
          {!isOwnProfile && (
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm active:bg-black/70"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Views badge */}
        {viewCount > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm z-20">
            <span className="text-white/70 text-xs font-medium">👁 {viewCount} views</span>
          </div>
        )}

        {/* Name + presence + persona overlay at bottom of hero */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="flex items-center gap-2">
            {/* Presence status */}
            {(() => {
              const ls = profileUser.last_seen;
              const ms = ls ? Date.now() - new Date(ls).getTime() : Infinity;
              const isOn = profileUser.is_online || ms < 10 * 60_000;
              const isAway = !isOn && ms < 60 * 60_000;
              const isOff = !isOn && !isAway;

              const dot = isOn
                ? { color: '#30D158', glow: '0 0 6px #30D158' }
                : isAway
                  ? { color: '#FFAB00', glow: undefined }
                  : { color: '#8E8E93', glow: undefined };

              return (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: dot.color, boxShadow: dot.glow }}
                  title={isOn ? 'Online now' : isAway ? 'Recently active' : 'Offline'}
                />
              );
            })()}
            <h2 className="text-2xl font-black text-white">{name}</h2>
            {isTravel && <Plane className="w-5 h-5 text-white/70 -rotate-45" />}
            {isVerified && (
              <div className="w-5 h-5 bg-[#00C2E0] rounded-full flex items-center justify-center">
                <Shield className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
          {/* Status label */}
          {(() => {
            const ls = profileUser.last_seen;
            const ms = ls ? Date.now() - new Date(ls).getTime() : Infinity;
            const isOn = profileUser.is_online || ms < 10 * 60_000;
            const isAway = !isOn && ms < 60 * 60_000;
            const label = isOn ? 'Online now' : isAway ? 'Recently active' : 'Offline';
            const color = isOn ? '#30D158' : isAway ? '#FFAB00' : '#8E8E93';
            return (
              <span className="text-xs font-medium mt-0.5 block" style={{ color }}>{label}</span>
            );
          })()}
          <div className="flex items-center gap-2 mt-0.5">
            {visitingCity && (
              <span className="text-white/60 text-sm">
                {isTravel ? 'Visiting' : ''} {visitingCity}
                {profileUser.country_flag ? ` ${profileUser.country_flag}` : ''}
              </span>
            )}
            {(distance || etaMin) && (
              <span className="text-white/40 text-sm">
                {distance ? `${(distance / 1.60934).toFixed(1)} mi away` : ''}
                {profileUser.location_area ? ` in ${profileUser.location_area}` : ''}
                {etaMin ? ` · ${etaMin} min` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Identity chips ────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
        {profileUser?.public_attributes?.age && (
          <span className="shrink-0 px-2.5 py-1 bg-white/8 text-white/60 text-xs rounded-full border border-white/10">
            {profileUser.public_attributes.age}
          </span>
        )}
        {profileUser?.public_attributes?.position && (
          <span className="shrink-0 px-2.5 py-1 bg-[#C8962C]/15 text-[#C8962C] text-xs font-bold rounded-full border border-[#C8962C]/30">
            {profileUser.public_attributes.position}
          </span>
        )}
        {(profileUser?.public_attributes?.looking_for||[]).map(l=>(
          <span key={l} className="shrink-0 px-2.5 py-1 bg-white/8 text-white/60 text-xs rounded-full border border-white/10">{l}</span>
        ))}
        {profileUser?.public_attributes?.time_horizon && (
          <span className="shrink-0 px-2.5 py-1 bg-amber-400/15 text-amber-400 text-xs font-bold rounded-full border border-amber-400/30">
            {profileUser.public_attributes.time_horizon}
          </span>
        )}
      </div>

      {/* ── Location: Proximity Card (v6_profile_proximity) or legacy bar ── */}
      {isProximityCard && !isOwnProfile && travelTimes?.distKm && profileUser?.last_lat ? (
        <ProfileProximityPanel
          distanceM={Math.round(travelTimes.distKm * 1000)}
          approxLat={profileUser.last_lat}
          approxLng={profileUser.last_lng}
          venueName={profileUser.venue_name}
          displayName={name}
        />
      ) : (
        <>
          {/* ── Location Action Bar ────────────────────────────────────── */}
          <div className="flex gap-2 px-4 py-2">
            <button
              onClick={handleShareLocation}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold active:scale-95 transition-all"
            >
              <MapPin className="w-4 h-4 text-[#C8962C]" />
              Share My Location
            </button>
            {travelTimes?.uber && (
              <button
                onClick={() => openSheet?.('uber', {
                  lat: profileUser.last_lat,
                  lng: profileUser.last_lng,
                  label: profileUser.display_name,
                  travelTimes,
                  profileUser
                })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold active:scale-95 transition-all"
              >
                <Car className="w-4 h-4 text-[#00C2E0]" />
                Get Uber
              </button>
            )}
          </div>

          {/* ── Travel time chips ─────────────────────────────────────── */}
          {travelTimes && (
            <div className="flex gap-2 px-4 py-2">
              {travelTimes.walking && travelTimes.distKm < 5 && (
                <div className="flex-1 flex flex-col items-center py-2 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30">
                  <Footprints className="w-4 h-4 text-[#39FF14]" />
                  <span className="text-[#39FF14] font-black text-sm mt-0.5">{Math.round(travelTimes.walking.durationSeconds/60)}m</span>
                  <span className="text-white/30 text-[9px]">walk</span>
                </div>
              )}
              {travelTimes.bicycling && travelTimes.distKm < 10 && (
                <div className="flex-1 flex flex-col items-center py-2 rounded-xl bg-[#00C2E0]/10 border border-[#00C2E0]/30">
                  <Bike className="w-4 h-4 text-[#00C2E0]" />
                  <span className="text-[#00C2E0] font-black text-sm mt-0.5">{Math.round(travelTimes.bicycling.durationSeconds/60)}m</span>
                  <span className="text-white/30 text-[9px]">bike</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Bio ────────────────────────────────────────────────────────── */}
      {profileUser?.bio && (
        <div className="px-4 py-2">
          <p className="text-white/70 text-sm leading-relaxed">{profileUser.bio}</p>
        </div>
      )}

      {/* ── Profile attribute chips ────────────────────────────────────── */}
      {profileAttrs && Object.keys(profileAttrs).some(k => profileAttrs[k] && (Array.isArray(profileAttrs[k]) ? profileAttrs[k].length : true)) && (
        <div className="px-4 pt-2 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {profileAttrs.pronouns && (
              <Chip>{profileAttrs.pronouns}</Chip>
            )}
            {profileAttrs.sexual_orientation && (
              <Chip>{profileAttrs.sexual_orientation}</Chip>
            )}
            {profileAttrs.position && (
              <Chip>{profileAttrs.position}</Chip>
            )}
            {profileAttrs.height_cm && (
              <Chip>{profileAttrs.height_cm} cm</Chip>
            )}
            {profileAttrs.body_type && (
              <Chip>{profileAttrs.body_type}</Chip>
            )}
            {profileAttrs.hosting && (
              <Chip>{profileAttrs.hosting}</Chip>
            )}
            {(profileAttrs.looking_for || []).map(lf => (
              <Chip key={lf} gold>{lf}</Chip>
            ))}
            {(profileAttrs.ethnicity || []).map(e => (
              <Chip key={e}>{e}</Chip>
            ))}
          </div>
        </div>
      )}

      {/* ── Content cards stack ────────────────────────────────────────── */}
      <div className="px-4 space-y-3 -mt-2">

        {/* Hookup card (if Right Now active) */}
        {rightNowStatus && (
          <ProfileContentCard
            variant="hookup"
            intent={intentLabel || 'Hookup'}
            boundaries={rightNowStatus.preferences?.boundaries || rightNowStatus.logistics?.join(' & ')}
            meetingArea={rightNowStatus.meeting_area || visitingCity}
            yourEta={etaMin || 7}
            theirEta={rightNowStatus.their_eta || 4}
            theirName={name.split(' ')[0]}
            lat={rightNowStatus.lat || profileUser.geoLat}
            lng={rightNowStatus.lng || profileUser.geoLng}
            imageUrl={avatarUrl}
          />
        )}

        {/* For Sale cards */}
        {listings.map((listing) => (
          <ProfileContentCard
            key={listing.id}
            variant="for-sale"
            title={listing.title}
            subtitle={listing.delivery_type === 'same_day' ? 'Same Day Delivery' : listing.delivery_type || ''}
            price={listing.price ? `${listing.currency || '£'}${listing.price}` : undefined}
            imageUrl={listing.images?.[0]}
            onView={() => openSheet('product', { id: listing.id, source: 'preloved' })}
            onBuy={() => openSheet('product', { id: listing.id, source: 'preloved', action: 'buy' })}
          />
        ))}

        {/* Creator card */}
        {isCreator && (
          <ProfileContentCard
            variant="creator"
            title={profileUser.creator_title || 'HotMess Radio DJ'}
            subtitle={profileUser.creator_subtitle || profileUser.radio_show_url ? 'Tap to listen' : ''}
            imageUrl={avatarUrl}
            onListen={() => {
              if (profileUser.radio_show_url) {
                window.open(profileUser.radio_show_url, '_blank');
              } else if (profileUser.soundcloud) {
                window.open(profileUser.soundcloud, '_blank');
              } else {
                navigate('/radio');
                closeSheet();
              }
            }}
            onFollow={() => toast('Following — subscriptions coming soon')}
            onSubscribe={
              profileUser.userId || profileUser.authUserId
                ? () => openSheet('creator-subscription', {
                    creatorId:   profileUser.userId || profileUser.authUserId,
                    creatorName: name,
                    priceCents:  profileUser.subscription_price_cents || 499,
                  })
                : undefined
            }
          />
        )}

        {/* Bio section (if no content cards) */}
        {!rightNowStatus && listings.length === 0 && !isCreator && profileUser.bio && (
          <div
            className="rounded-2xl p-4"
            style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-white/70 text-sm leading-relaxed">{profileUser.bio}</p>
          </div>
        )}
      </div>

      {/* ── Cross-links (listings / music) ─────────────────────────────── */}
      {(totalListingCount > 0 || artistRecord) && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">More from {name.split(' ')[0]}</p>
          {totalListingCount > 0 && (
            <button
              onClick={() => {
                closeSheet();
                navigate(`/market?seller_id=${encodeURIComponent(profileUser.auth_user_id || profileUser.id)}`);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8 active:bg-white/10 transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-[#C8962C]" />
              <div className="text-left flex-1">
                <span className="text-white text-sm font-semibold">View listings</span>
                <span className="text-white/40 text-xs ml-2">{totalListingCount} item{totalListingCount !== 1 ? 's' : ''}</span>
              </div>
            </button>
          )}
          {artistRecord && (
            <button
              onClick={() => {
                closeSheet();
                navigate(`/music?artist=${encodeURIComponent(artistRecord.id)}`);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8 active:bg-white/10 transition-colors"
            >
              <Music className="w-5 h-5 text-[#00C2E0]" />
              <div className="text-left flex-1">
                <span className="text-white text-sm font-semibold">View music</span>
                <span className="text-white/40 text-xs ml-2">{artistRecord.artist_name}</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 z-10 flex gap-2"
        style={{
          background: 'rgba(5,5,7,0.95)',
          backdropFilter: 'blur(16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Boo button */}
        <button
          onClick={() => {
            const targetEmail = profileUser.email || profileUser.userId;
            if (targetEmail) sendTap(targetEmail, name, 'boo');
          }}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            (profileUser.email || profileUser.userId) && isTapped(profileUser.email || profileUser.userId, 'boo')
              ? 'bg-[#C8962C] text-black' : 'bg-white/10 text-white/60 hover:bg-white/15'
          }`}
          title="Boo"
        >
          <Ghost className="w-5 h-5" />
        </button>

        {/* Save / Favorite button */}
        <button
          onClick={handleSaveToggle}
          disabled={isSaving}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            isSaved
              ? 'bg-[#C8962C] text-black'
              : 'bg-white/10 text-white/60 hover:bg-white/15'
          }`}
          title={isSaved ? 'Unsave' : 'Save profile'}
        >
          <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Message button */}
        <Button
          onClick={handleMessage}
          className="flex-1 h-12 bg-[#C8962C] hover:bg-[#C8962C]/90 rounded-xl font-bold"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Message
        </Button>

        {/* Video Call button */}
        <button
          onClick={handleVideoCall}
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 text-white/60 hover:bg-white/15 transition-all"
          title="Video call"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>

      {/* ── More menu dropdown ─────────────────────────────────────────── */}
      {showMoreMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
          <div
            className="fixed top-16 right-4 z-50 w-48 rounded-xl overflow-hidden shadow-xl"
            style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <button
              onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left"
            >
              <Flag className="w-4 h-4 text-[#C8962C]" />
              <span className="text-white text-sm font-medium">Report User</span>
            </button>
            <button
              onClick={async () => {
                setShowMoreMenu(false);
                try {
                  let { data: { user } } = await supabase.auth.getUser();
                  if (!user || !profileUser) return;
                  const allPhotos = [];
                  const seen = new Set();
                  const addUrl = (u) => { if (u && !seen.has(u)) { seen.add(u); allPhotos.push(u); } };
                  addUrl(profileUser.avatar_url || profileUser.photos?.[0]);
                  (profileUser.photos || []).forEach(p => addUrl(typeof p === 'string' ? p : p?.url));
                  const reportedPhotoUrl = allPhotos[activePhotoIdx] || allPhotos[0] || null;

                  await supabase.from('photo_moderation_events').insert({
                    user_id: user.id,
                    event_type: 'user_reported',
                    reason: 'Reported from profile sheet',
                    metadata: {
                      reported_user_id: profileUser.id || profileUser.auth_user_id,
                      photo_url: reportedPhotoUrl,
                      photo_index: activePhotoIdx,
                    },
                  });
                  // Flag the photo in profile_photos so RLS hides it from others
                  if (reportedPhotoUrl) {
                    await supabase
                      .from('profile_photos')
                      .update({ moderation_status: 'flagged' })
                      .eq('profile_id', profileUser.id || profileUser.auth_user_id)
                      .eq('url', reportedPhotoUrl)
                      .then(() => {}); // best-effort
                  }
                  toast.success('Photo reported. Our team will review it.');
                } catch { toast.error('Could not report photo.'); }
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left border-t border-white/5"
            >
              <Flag className="w-4 h-4 text-amber-500" />
              <span className="text-white text-sm font-medium">Report Photo</span>
            </button>
            <button
              onClick={handleBlock}
              disabled={isBlocking}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left border-t border-white/5"
            >
              {isBlocking ? (
                <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
              ) : (
                <Ban className="w-4 h-4 text-red-500" />
              )}
              <span className="text-red-500 text-sm font-medium">Block User</span>
            </button>
          </div>
        </>
      )}

      {/* ── Report modal ───────────────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold">Report User</h3>
              <button
                onClick={() => { setShowReportModal(false); setReportReason(''); }}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-white/60 text-sm">
                Why are you reporting {name}?
              </p>
              <div className="space-y-2">
                {['Harassment or bullying', 'Spam or scam', 'Inappropriate content', 'Fake profile', 'Other'].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                      reportReason === reason
                        ? 'bg-[#C8962C] text-black'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleReport}
                disabled={!reportReason || isReporting}
                className="w-full h-12 bg-[#C8962C] hover:bg-[#C8962C]/90 disabled:opacity-50 rounded-xl font-bold"
              >
                {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

