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
  MessageCircle,
  Loader2, MoreVertical, Flag, Ban, X, Ghost,
  Footprints, Bike, Car, Heart, Video, ShoppingBag, Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import ProfileContentCard from '@/components/cards/ProfileContentCard';
import { useTaps } from '@/hooks/useTaps';
import { useV6Flag } from '@/hooks/useV6Flag';
import { ProfileProximityPanel } from '@/components/profile/ProfileProximityPanel';
import VaultAccessRequest from '@/components/messaging/VaultAccessRequest';
import ProfileBeaconsSection from '@/components/profile/ProfileBeaconsSection';
import MutualStateOverlay from '@/components/profile/MutualStateOverlay';
import RecoveryStateCard from '@/components/profile/RecoveryStateCard';
import useProfileDwell from '@/hooks/useProfileDwell';
import useRecoveryState from '@/hooks/useRecoveryState';
import { ProximityRow } from '@/components/ui/ProximityRow';
import { useGPS } from '@/hooks/useGPS';
import { safeName } from '@/lib/identity/safeName';

// Slice A — D262 stable-online helper. Presence dot only when
// is_online AND last_seen <= 5min. No "stale online" lies.
const STABLE_ONLINE_MS = 5 * 60_000;
function isStablyOnline(p) {
  if (!p?.is_online) return false;
  const ls = p?.last_seen;
  if (!ls) return false;
  const ms = Date.now() - new Date(ls).getTime();
  return ms <= STABLE_ONLINE_MS;
}

// Slice A — D08 off-grid recognition. Hides distance row and replaces it
// with the locked "Laying low" copy when the profile owner is hiding.
function isOffGrid(p) {
  const v = p?.visibility_state;
  return v === 'off_grid' || v === 'off_grid_week' || v === 'trusted_only';
}

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
// D262 §2.5 / LOCKS.md — empty state never renders a letter monogram.
// Silhouette gradient + small Ghost glyph instead. Dignity-floor invariant:
// "If identity confidence is low, the UI becomes quieter, not faker."
function PhotoCarousel({ images = [], onIndexChange }) {
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

  // 0 photos — silhouette + Ghost glyph. No initial. No letter. No "A".
  if (!images.length) {
    return (
      <div className="relative" style={{ aspectRatio: '3/4', maxHeight: '55vh' }}>
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at 50% 42%, #1a1410 0%, #0d0a08 55%, #050405 100%)',
          }}
        >
          <Ghost
            className="w-16 h-16"
            strokeWidth={1.4}
            style={{ color: 'rgba(255,255,255,0.14)' }}
          />
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
  const { position: viewerPos } = useGPS();
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

  const { isTapped, sendTap, isMutualBoo } = useTaps(myUserId, myEmail);
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
      // 2026-05-13: helper to merge profile_photos rows into the legacy
      // profile.photos field so the L2ProfileSheet carousel surfaces ALL
      // approved main photos (up to 5) — not just the avatar_url. The new
      // schema (profile_photos table) was being written by L2PhotosSheet /
      // L2EditProfileSheet but never read by L2ProfileSheet, so users who
      // uploaded multiple photos still saw only one. Bug surfaced in Phil's
      // mobile audit: "profile cards still show one image despite an
      // expectation that they were upgraded".
      const mergePhotos = async (p) => {
        if (!p?.id) return p;
        try {
          const { data: rows } = await supabase
            .from('profile_photos')
            .select('url, position, is_primary')
            .eq('profile_id', p.id)
            .eq('moderation_status', 'approved')
            .order('is_primary', { ascending: false })
            .order('position', { ascending: true });
          const fromTable = Array.isArray(rows) ? rows.map(r => r.url).filter(Boolean) : [];
          const legacy = Array.isArray(p.photos) ? p.photos.map(x => typeof x === 'string' ? x : x?.url).filter(Boolean) : [];
          const merged = [...new Set([...fromTable, ...legacy])];
          return merged.length ? { ...p, photos: merged } : p;
        } catch {
          return p;
        }
      };

      if (!email && !resolvedUid) {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const merged = await mergePhotos(profile);
        return { ...user, ...(merged || {}), auth_user_id: user.id, email: user.email || merged?.email };
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
          return await mergePhotos(payload?.user || null);
        }
      } catch {}

      if (email) {
        const { data, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
        if (error) throw error;
        return await mergePhotos(data || null);
      }
      if (resolvedUid) {
        // profiles.id IS the auth user UUID — no separate auth_user_id column
        const { data, error } = await supabase.from('profiles').select('*').eq('id', resolvedUid).maybeSingle();
        if (error) throw error;
        return await mergePhotos(data || null);
      }
      return null;
    },
  });

  // Robust own-profile detection: match on email OR auth_user_id
  const [authUid, setAuthUid] = useState(null);
  const [travelTimes, setTravelTimes] = useState(null);
  const isProximityCard = useV6Flag('v6_profile_proximity');
  const v6GhostedLoop   = useV6Flag('v6_ghosted_loop');
  const [showMutual,    setShowMutual]    = useState(false);
  const [mutualArmed,   setMutualArmed]   = useState(false); // dormant gold border

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

  // v6_ghosted_loop — arm the gold mutual border when relationship loads as mutual
  useEffect(() => {
    if (!v6GhostedLoop) return;
    const targetId = profileUser?.auth_user_id || profileUser?.id;
    if (!targetId || !myUserId) return;
    setMutualArmed(isMutualBoo(targetId));
  }, [v6GhostedLoop, profileUser?.auth_user_id, profileUser?.id, myUserId, isMutualBoo]);

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
      title: `Video with ${safeName(profileUser)}`,
    });
  };

  const handleMessage = () => {
    const targetId = profileUser?.auth_user_id || profileUser?.id;
    if (!targetId) return;
    // Phil 2026-05-29 hard gate — chat is post-mutual-boo only.
    // Pre-mutual taps on Message = toast nudge to Boo first.
    // Boo lives on the profile (this sheet), so the user is already in the
    // right place to send it. Doctrine 07: relational truth before writing surface.
    if (!isMutualBoo(targetId)) {
      toast('Boo first. They have to want it back.');
      return;
    }
    openSheet(SHEET_TYPES.CHAT, {
      userId: targetId,
      title: `Chat with ${safeName(profileUser)}`,
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

      toast.success(`${safeName(profileUser)} blocked`);
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

  // ── Photo URLs (memo) — used both by the carousel + dwell instrumentation
  // 2026-05-13: /api/profile returns the canonical multi-photo set as
  // `profile_photos` (array of {url, position, is_primary} rows). Earlier
  // code only checked `profileUser.photos` (which comes from auth
  // user_metadata and is undefined for users who never used that legacy
  // field), so Alex's 5 photos never made it into the carousel. Now we
  // merge profile_photos (preferred, ordered by is_primary then position)
  // → photos legacy array → avatar_url fallback.
  const photoUrls = React.useMemo(() => {
    const urls = [];
    const seen = new Set();
    const add = (u) => { if (u && !seen.has(u)) { seen.add(u); urls.push(u); } };

    const profilePhotosRows = Array.isArray(profileUser?.profile_photos)
      ? profileUser.profile_photos
      : [];
    const sortedRows = [...profilePhotosRows].sort((a, b) => {
      if (!!a.is_primary !== !!b.is_primary) return a.is_primary ? -1 : 1;
      return (a.position ?? 99) - (b.position ?? 99);
    });
    sortedRows.forEach(r => add(r?.url));

    // Legacy fallbacks
    (profileUser?.photos || []).forEach(p => add(typeof p === 'string' ? p : p?.url));
    add(profileUser?.avatar_url);

    return urls;
  }, [profileUser?.avatar_url, profileUser?.photos, profileUser?.profile_photos]);

  // ── Phase A truth-signal instrumentation (profile dwell progression)
  const dwellApi = useProfileDwell({
    profileId:    profileUser?.auth_user_id || profileUser?.id || null,
    currentIndex: activePhotoIdx,
    totalImages:  photoUrls.length,
    isOpen:       !!profileUser && !isOwnProfile,
    v6Enabled:    !!v6GhostedLoop,
  });

  // ── RecoveryState v0.1 — 2 mechanical triggers only (bible Part 7) ────
  const recoveryRelationship = (() => {
    const targetId = profileUser?.auth_user_id || profileUser?.id;
    if (!targetId || !myUserId) return 'none';
    if (isMutualBoo(targetId)) return 'mutual';
    return 'none';
  })();
  const recovery = useRecoveryState({
    viewerId:             myUserId,
    profileId:            profileUser?.auth_user_id || profileUser?.id || null,
    relationship:         recoveryRelationship,
    ownerLocationConsent: profileUser?.location_consent ?? null,
    enabled:              !!v6GhostedLoop && !isOwnProfile,
  });
  const recoveryVariant = recovery.meetup_completed
    ? 'meetup_completed'
    : recovery.location_revoked
      ? 'location_revoked'
      : null;
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);

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

  // IDENTITY MODEL — D262 / LOCKS.md dignity-floor invariant.
  // safeName() is the single source of truth: returns display_name (or
  // displayName / name), rejects @-containing strings, falls back to
  // "Member". Never "Anonymous", never the email, never the user id.
  const name = safeName(profileUser);
  // Mutual is required to unlock Message + Albums + Logistics descent per
  // D262 §1.1 + §2.7. Compute once here so the JSX below stays readable.
  const targetIdForMutual = profileUser.auth_user_id || profileUser.id;
  const isMutual = !!targetIdForMutual && isMutualBoo(targetIdForMutual);
  const offGrid = isOffGrid(profileUser) && !isMutual; // off-grid for mutuals = normal render
  const stableOnline = !offGrid && isStablyOnline(profileUser);
  const avatarUrl = profileUser.avatar_url || profileUser.photos?.[0];
  const isTravel = profileUser.persona === 'TRAVEL' || profileUser.persona === 'travel';
  const _rawCity = profileUser.city || profileUser.visiting_city;
  // Guard: a profile's city field can hold raw PostGIS WKB (geography hex) — never
  // surface it. Hide the field entirely when it isn't a human-readable place.
  const visitingCity = (_rawCity && !/^[0-9A-Fa-f]{20,}$/.test(String(_rawCity).trim())) ? _rawCity : null;
  const distance = profileUser.distance_km || profileUser.distance;
  const etaMin = profileUser.eta_min || (distance ? Math.ceil(distance * 1.2) : null);
  const isVerified = profileUser.is_verified;
  const isCreator = profileUser.is_creator || profileUser.radio_show_url || profileUser.soundcloud;
  const intentLabel = rightNowStatus?.intent
    ? rightNowStatus.intent.charAt(0).toUpperCase() + rightNowStatus.intent.slice(1)
    : null;

  // ── v6 Ghosted loop — BOO + intent action wiring ──────────────────────
  const targetUid = profileUser.auth_user_id || profileUser.id;
  const handleBoo = async () => {
    if (!targetUid) return;
    const result = await sendTap(targetUid, name, 'boo');
    if (v6GhostedLoop) {
      dwellApi.trackBoo(!!result?.mutual);
      if (result?.mutual) {
        setMutualArmed(true);
        setShowMutual(true);
      }
    }
  };
  const booActive = !!targetUid && isTapped(targetUid, 'boo');
  const booPrimary = (
    <button
      onClick={handleBoo}
      aria-label={booActive ? 'Booed' : 'Boo'}
      style={{
        width: '100%',
        height: 52,
        background: booActive ? '#C8962C' : 'rgba(200,150,44,0.10)',
        color:      booActive ? '#0B0B0F' : '#C8962C',
        border:     booActive ? '0.5px solid #C8962C' : '0.5px solid rgba(200,150,44,0.55)',
        borderRadius: 2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: booActive ? '0 0 24px rgba(200,150,44,0.28)' : 'none',
      }}
    >
      <Ghost size={18} strokeWidth={2} />
      {booActive ? "Boo'd" : 'Boo'}
    </button>
  );
  // Phil exec review 2026-05-13: Share is killed from the intent layer.
  // External profile sharing contradicts the Ghosted philosophy of bounded
  // discovery. The top-bar Share button is retained for now (controlled
  // sharing via native share-sheet); intent-layer share would have made
  // sharing feel like a peer action to BOO.
  const intentActions = [
    {
      id: 'message',
      label: 'Message',
      icon: <MessageCircle size={14} strokeWidth={2} />,
      onTap: handleMessage,
    },
    {
      id: 'save',
      label: isSaved ? 'Saved' : 'Save',
      icon: <Heart size={14} strokeWidth={2} fill={isSaved ? 'currentColor' : 'none'} />,
      onTap: handleSaveToggle,
    },
    {
      id: 'video',
      label: 'Video',
      icon: <Video size={14} strokeWidth={2} />,
      onTap: handleVideoCall,
    },
  ];

  // ── Render — mockup composition (D262 wholesale port 2026-05-30) ──────
  // The previous render lived as ~660 lines of v6/legacy/proximity branches.
  // This pass throws all of that out and uses the MOCKUP.html composition
  // as the literal blueprint: hero, identity row, action bar, content cards,
  // logistics-gated-on-mutual, with the desktop max-width fix on the
  // L2SheetContainer side.
  return (
    <div className="relative bg-black" style={{ paddingBottom: 24 }}>
      {/* ── HERO — full-bleed photo carousel + identity overlay ────────── */}
      <div className="relative w-full" style={{ aspectRatio: '4/5', background: 'black' }}>
        {photoUrls.length > 0 ? (
          <>
            <img
              src={photoUrls[activePhotoIdx] || photoUrls[0]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {photoUrls.length > 1 && (
              <>
                {/* tap zones for prev / next photo */}
                <button
                  className="absolute left-0 top-0 bottom-0 w-1/3 z-10 bg-transparent"
                  style={{ border: 'none' }}
                  onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(Math.max(0, activePhotoIdx - 1)); }}
                  aria-label="Previous photo"
                />
                <button
                  className="absolute right-0 top-0 bottom-0 w-1/3 z-10 bg-transparent"
                  style={{ border: 'none' }}
                  onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(Math.min(photoUrls.length - 1, activePhotoIdx + 1)); }}
                  aria-label="Next photo"
                />
                {/* dot paginator */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                  {photoUrls.map((_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      style={i === activePhotoIdx
                        ? { width: 18, height: 4, background: 'white', borderRadius: 99 }
                        : { width: 6, height: 4, background: 'rgba(255,255,255,0.4)', borderRadius: 99 }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          // Empty photo state — silhouette gradient + Ghost glyph (LOCKS.md
          // dignity-floor invariant: quieter, not faker).
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'radial-gradient(ellipse at 50% 42%, #1a1410 0%, #0d0a08 55%, #050405 100%)' }}
          >
            <Ghost className="w-20 h-20" strokeWidth={1.4} style={{ color: 'rgba(255,255,255,0.14)' }} />
          </div>
        )}

        {/* Top-right: More menu */}
        {!isOwnProfile && (
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="absolute right-3 w-9 h-9 rounded-full flex items-center justify-center z-30"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: 'none',
            }}
            aria-label="More"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Photo counter pill killed 2026-05-30 per Phil — the dot
            paginator already conveys "there are more photos here", and
            the "1 / N" text on top of someone's face was reading as
            chrome clutter, not affordance. */}

        {/* Bottom gradient — lets the identity overlay sit on the photo */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: '55%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 5%, rgba(0,0,0,0.55) 35%, transparent 100%)',
          }}
        />

        {/* Identity overlay at bottom of hero — name + verified + mutual + presence + venue */}
        <div className="absolute left-4 right-4 bottom-4 z-20 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{name}</h1>
            {isVerified && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#C8962C' }}
                aria-label="Verified"
                title="Verified"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            {isMutual && (
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: 'rgba(200,150,44,0.15)',
                  color: '#C8962C',
                  border: '1px solid rgba(200,150,44,0.5)',
                  letterSpacing: '0.14em',
                }}
              >
                Mutual
              </span>
            )}
          </div>

          {/* Presence sub-line */}
          {(stableOnline || offGrid) && (
            <div className="text-xs flex items-center gap-1.5" style={{ color: offGrid ? '#8E8E93' : '#34C759' }}>
              {stableOnline && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34C759' }} />}
              <span>{offGrid ? 'Laying low' : 'Online'}</span>
            </div>
          )}

          {/* City line — suppressed when off-grid */}
          {!offGrid && visitingCity && (
            <div className="text-white/65 text-xs">
              {isTravel ? 'Visiting ' : ''}{visitingCity}{profileUser.country_flag ? ` ${profileUser.country_flag}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── ACTION BAR — Boo / Mutual? Message + Video : BOO first / Save ── */}
      {!isOwnProfile && (
        <div className="px-4 pt-4 pb-2 flex items-stretch gap-2">
          {/* Boo */}
          <button
            onClick={handleBoo}
            className="flex flex-col items-center justify-center gap-0.5 px-3 rounded-2xl flex-shrink-0"
            style={{
              minWidth: 56,
              height: 52,
              background: booActive ? 'rgba(200,150,44,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${booActive ? '#C8962C' : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer',
            }}
            aria-label={booActive ? "Boo'd" : 'Boo'}
          >
            <Ghost className="w-4 h-4" style={{ color: booActive ? '#C8962C' : 'white' }} />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: booActive ? '#C8962C' : 'white' }}>
              {booActive ? "BOO'd" : 'BOO'}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={handleSaveToggle}
            disabled={isSaving}
            className="flex flex-col items-center justify-center gap-0.5 px-3 rounded-2xl flex-shrink-0"
            style={{
              minWidth: 56,
              height: 52,
              background: isSaved ? 'rgba(200,150,44,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isSaved ? '#C8962C' : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer',
            }}
            aria-label={isSaved ? 'Saved' : 'Save'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} style={{ color: isSaved ? '#C8962C' : 'white' }} />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: isSaved ? '#C8962C' : 'white' }}>
              {isSaved ? 'SAVED' : 'SAVE'}
            </span>
          </button>

          {/* Message (mutual-only gold-filled) OR BOO first (pre-mutual outline) */}
          {isMutual ? (
            <>
              <button
                onClick={handleMessage}
                className="flex-1 rounded-2xl font-black text-sm uppercase text-black"
                style={{
                  height: 52,
                  background: '#C8962C',
                  border: 'none',
                  letterSpacing: '0.14em',
                  cursor: 'pointer',
                }}
              >
                Message
              </button>
              <button
                onClick={handleVideoCall}
                className="rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  width: 52,
                  height: 52,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
                aria-label="Video call"
              >
                <Video className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <button
              onClick={handleMessage}
              className="flex-1 rounded-2xl font-black text-sm uppercase"
              style={{
                height: 52,
                background: 'rgba(200,150,44,0.15)',
                color: '#C8962C',
                border: '1px solid #C8962C',
                letterSpacing: '0.14em',
                cursor: 'pointer',
              }}
            >
              BOO first
            </button>
          )}
        </div>
      )}

      {/* VaultAccessRequest (non-self) */}
      {!isOwnProfile && (profileUser.auth_user_id || profileUser.id) && (
        <div className="px-4 py-2">
          <VaultAccessRequest
            ownerId={profileUser.auth_user_id || profileUser.id}
            ownerName={name}
          />
        </div>
      )}

      {/* RecoveryStateCard (v6_ghosted_loop) */}
      {v6GhostedLoop && recoveryVariant && !recoveryDismissed && !isOwnProfile && (
        <div className="px-4">
          <RecoveryStateCard
            variant={recoveryVariant}
            theirName={name}
            onAction={() => { setRecoveryDismissed(true); handleMessage(); }}
            onDismiss={() => setRecoveryDismissed(true)}
          />
        </div>
      )}

      {/* ── LOOKING-FOR TAGS row — gold-tinted pills ─────────────────────── */}
      {((profileAttrs?.looking_for) || profileUser?.public_attributes?.looking_for || []).length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex flex-wrap gap-1.5">
            {((profileAttrs?.looking_for) || profileUser?.public_attributes?.looking_for || []).map(tag => (
              <span
                key={tag}
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(200,150,44,0.12)',
                  color: '#C8962C',
                  border: '1px solid rgba(200,150,44,0.3)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── PROXIMITY — bucketed walk distance, person variant. Suppressed
             when off-grid; gated via D08 + LOCKS.md confidence handling. */}
      {!offGrid && profileUser?.last_lat != null && profileUser?.last_lng != null && (
        <div className="px-1">
          <ProximityRow
            type="person"
            venueLat={Number(profileUser.last_lat)}
            venueLng={Number(profileUser.last_lng)}
            viewerLat={viewerPos?.lat ?? null}
            viewerLng={viewerPos?.lng ?? null}
            locationUpdatedAt={viewerPos?.timestamp ?? null}
          />
        </div>
      )}

      {/* ── IDENTITY ATTRIBUTE CHIPS (pronouns / position / body / height) */}
      {profileAttrs && (
        profileAttrs.pronouns ||
        profileAttrs.sexual_orientation ||
        profileAttrs.position ||
        profileAttrs.body_type ||
        profileAttrs.height_cm ||
        profileAttrs.hosting ||
        (profileAttrs.ethnicity || []).length > 0
      ) && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex flex-wrap gap-1.5">
            {profileAttrs.pronouns && <Chip>{profileAttrs.pronouns}</Chip>}
            {profileAttrs.sexual_orientation && <Chip>{profileAttrs.sexual_orientation}</Chip>}
            {profileAttrs.position && <Chip gold>{profileAttrs.position}</Chip>}
            {profileAttrs.height_cm && <Chip>{profileAttrs.height_cm} cm</Chip>}
            {profileAttrs.body_type && <Chip>{profileAttrs.body_type}</Chip>}
            {profileAttrs.hosting && <Chip>{profileAttrs.hosting}</Chip>}
            {(profileAttrs.ethnicity || []).map(e => <Chip key={e}>{e}</Chip>)}
          </div>
        </div>
      )}

      {/* ── BIO (single source of truth — duplicate at bottom removed) */}
      {profileUser?.bio && (
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-2">About</h3>
          <p className="text-sm text-white/80 leading-relaxed">{profileUser.bio}</p>
        </div>
      )}

      {/* ── ACTIVE BEACONS — render only when the section has rows.
             ProfileBeaconsSection no-ops when there are no active beacons. */}
      <ProfileBeaconsSection userId={profileUser.auth_user_id || profileUser.id} />

      {/* ── PROXIMITY PANEL (v6_profile_proximity) — mutual-gated */}
      {isMutual && !offGrid && isProximityCard && !isOwnProfile && travelTimes?.distKm && profileUser?.last_lat && (
        <ProfileProximityPanel
          distanceM={Math.round(travelTimes.distKm * 1000)}
          approxLat={profileUser.last_lat}
          approxLng={profileUser.last_lng}
          venueName={profileUser.venue_name}
          displayName={name}
        />
      )}

      {/* ── CONTENT CARDS — Right Now / For Sale / Creator */}
      {(rightNowStatus || listings.length > 0 || isCreator) && (
        <div className="px-4 pt-3 space-y-3">
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

          {isCreator && (
            <ProfileContentCard
              variant="creator"
              title={profileUser.creator_title || 'HotMess Radio DJ'}
              subtitle={profileUser.creator_subtitle || (profileUser.radio_show_url ? 'Tap to listen' : '')}
              imageUrl={avatarUrl}
              onListen={() => {
                if (profileUser.radio_show_url) window.open(profileUser.radio_show_url, '_blank');
                else if (profileUser.soundcloud) window.open(profileUser.soundcloud, '_blank');
                else { navigate('/radio'); closeSheet(); }
              }}
              onFollow={() => toast('Following — subscriptions coming soon')}
              onSubscribe={
                profileUser.userId || profileUser.authUserId
                  ? () => openSheet('creator-subscription', {
                      creatorId: profileUser.userId || profileUser.authUserId,
                      creatorName: name,
                      priceCents: profileUser.subscription_price_cents || 499,
                    })
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* ── LOGISTICS — descent into operational. D262 §1.1 mutual gate.
             Footprints / Bike / Uber rendered only when isMutual + travelTimes
             + not off-grid + not v6_profile_proximity (which renders above). */}
      {isMutual && !offGrid && !isProximityCard && !isOwnProfile && travelTimes && (
        <div className="px-4 pt-4 pb-2">
          <div className="text-[10px] font-black tracking-[0.28em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Logistics
          </div>
          <div className="flex gap-2">
            {travelTimes.walking && travelTimes.distKm < 5 && (
              <div className="flex-1 flex flex-col items-center py-2 rounded-md"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <Footprints className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.55)' }} />
                <span className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {Math.round(travelTimes.walking.durationSeconds/60)}m
                </span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.32)' }}>walk</span>
              </div>
            )}
            {travelTimes.bicycling && travelTimes.distKm < 10 && (
              <div className="flex-1 flex flex-col items-center py-2 rounded-md"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <Bike className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.55)' }} />
                <span className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {Math.round(travelTimes.bicycling.durationSeconds/60)}m
                </span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.32)' }}>bike</span>
              </div>
            )}
            {travelTimes.uber && (
              <button
                onClick={() => openSheet?.('uber', {
                  lat: profileUser.last_lat,
                  lng: profileUser.last_lng,
                  label: profileUser.display_name,
                  travelTimes,
                  profileUser,
                })}
                className="flex-1 flex flex-col items-center py-2 rounded-md"
                style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
              >
                <Car className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.55)' }} />
                <span className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {Math.round(travelTimes.uber.durationSeconds/60)}m
                </span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.32)' }}>uber</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Cross-links (listings / music) */}
      {(totalListingCount > 0 || artistRecord) && (
        <div className="px-4 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">More from {name.split(' ')[0]}</p>
          {totalListingCount > 0 && (
            <button
              onClick={() => { closeSheet(); navigate(`/market?seller_id=${encodeURIComponent(profileUser.auth_user_id || profileUser.id)}`); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
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
              onClick={() => { closeSheet(); navigate(`/music?artist=${encodeURIComponent(artistRecord.id)}`); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
            >
              <Music className="w-5 h-5 text-[#C8962C]" />
              <div className="text-left flex-1">
                <span className="text-white text-sm font-semibold">Listen to {artistRecord.artist_name || name.split(' ')[0]}</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Views micro-badge */}
      {viewCount > 0 && (
        <div className="px-5 pt-3 pb-1 text-center">
          <span className="text-white/30 text-[10px] font-mono tracking-widest">{viewCount} VIEWS</span>
        </div>
      )}

      {/* ── MUTUAL OVERLAY (v6_ghosted_loop) */}
      {v6GhostedLoop && (
        <MutualStateOverlay
          open={showMutual}
          theirName={name}
          theirAvatar={avatarUrl}
          onMessage={() => { setShowMutual(false); handleMessage(); }}
          onDismiss={() => setShowMutual(false)}
        />
      )}

      {/* ── More menu (Report / Block) */}
      {showMoreMenu && !isOwnProfile && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
          <div
            className="fixed top-16 right-4 z-50 w-48 rounded-xl overflow-hidden shadow-xl"
            style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <button
              onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Flag className="w-4 h-4 text-[#C8962C]" />
              <span className="text-white text-sm font-medium">Report User</span>
            </button>
            <button
              onClick={handleBlock}
              disabled={isBlocking}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left"
              style={{ background: 'transparent', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
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

      {/* ── Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold">Report User</h3>
              <button
                onClick={() => { setShowReportModal(false); setReportReason(''); }}
                className="p-1 rounded-full hover:bg-white/10"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
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
                    style={{ border: 'none', cursor: 'pointer' }}
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
