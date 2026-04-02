/**
 * L2ProfileSheet — Full-bleed profile with content cards
 *
 * Matches the design mockup:
 *   - Hero photo (top 45vh) with gradient overlay
 *   - Persona name + travel icon + visiting city + distance/ETA
 *   - Content cards stack: Hookup / For Sale / Creator
 *   - Bottom actions: Message + more menu
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import {
  MessageCircle, MapPin, Shield, Plane,
  Loader2, MoreVertical, Flag, Ban, X, ChevronLeft, Ghost,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import ProfileContentCard from '@/components/cards/ProfileContentCard';
import { useTaps } from '@/hooks/useTaps';

const Chip = ({ children, gold = false }) => (
  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
    gold
      ? 'bg-[#C8962C]/15 text-[#C8962C] border-[#C8962C]/30'
      : 'bg-white/8 text-white/60 border-white/10'
  }`}>
    {children}
  </span>
);

export default function L2ProfileSheet({ email, uid, id }) {
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useSheet();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const { isTapped, sendTap } = useTaps();

  // ── Data queries ────────────────────────────────────────────────────────

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
    },
  });

  // Normalise: `id` (profile DB row id like "profile_xxx") maps to `uid`
  // Strip "profile_" prefix that the /api/profiles endpoint adds for grid dedup
  const rawId = uid || id || null;
  const resolvedUid = rawId && typeof rawId === 'string' ? rawId.replace(/^profile_/, '') : rawId;

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['profile-sheet', email, resolvedUid],
    queryFn: async () => {
      if (!email && !resolvedUid) {
        const { data: { user } } = await supabase.auth.getUser();
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
        const { data, error } = await supabase.from('profiles').select('*').eq('auth_user_id', resolvedUid).maybeSingle();
        if (error) throw error;
        return data || null;
      }
      return null;
    },
  });

  // Robust own-profile detection: match on email OR auth_user_id
  const [authUid, setAuthUid] = useState(null);
  const [travelTimes, setTravelTimes] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data?.user?.id) setAuthUid(data.user.id); });
  }, []);

  // Travel times will be wired in P6 once GPS consent and location available
  useEffect(() => {
    // Placeholder — real fetch wired in P6
    // Only show travel time if profile has consented to GPS and has location
    if (!profileUser?.has_consented_gps) return;
    if (!profileUser?.last_lat || !profileUser?.last_lng) return;
  }, [profileUser]);

  const isOwnProfile =
    (!email && !resolvedUid) ||
    (currentUser?.email && profileUser?.email && profileUser.email === currentUser.email) ||
    (authUid && profileUser?.auth_user_id && authUid === profileUser.auth_user_id);

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
    if (!profileUser?.auth_user_id || isOwnProfile) return;

    const recordView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const viewedUid = profileUser.auth_user_id;
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
        void('[ProfileSheet] View recording skipped:', err);
      }
    };

    recordView();
  }, [profileUser?.auth_user_id, isOwnProfile]);

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
        .from('preloved_listings')
        .select('id, title, description, price, currency, images, delivery_type')
        .eq('seller_id', profileUser.id)
        .eq('status', 'active')
        .limit(3);
      return data || [];
    },
    enabled: !!profileUser?.email,
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleMessage = () => {
    if (!profileUser?.auth_user_id && !profileUser?.id) return;
    // Pass uid instead of email (email is not exposed in profile response for GDPR)
    // ChatSheet will look up the email server-side
    openSheet(SHEET_TYPES.CHAT, {
      toUid: profileUser.auth_user_id || profileUser.id,
      title: `Chat with ${profileUser.username || profileUser.profileName || profileUser.display_name || 'Anonymous'}`,
    });
  };

  const handleBlock = async () => {
    if (!currentUser || !profileUser) return;
    setIsBlocking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Write to user_blocks (canonical table — read by api/profiles.js for grid filtering)
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_email: currentUser.email,
          blocked_email: profileUser.email || profileUser.userId,
        });

      if (error && !error.message?.includes('duplicate')) throw error;

      // Also write to profile_blocklist_users (legacy — used by some older queries)
      await supabase
        .from('profile_blocklist_users')
        .insert({
          profile_id: user.id,
          viewer_user_id: profileUser.authUserId || profileUser.userId,
        })
        .catch(() => {}); // best-effort legacy sync

      toast.success(`${profileUser.username || profileUser.display_name || 'User'} blocked`);
      setShowMoreMenu(false);
      closeSheet();
    } catch {
      toast.error('Failed to block user');
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
      toast.error('Failed to submit report');
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
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <MapPin className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/60 mb-4">Profile not found</p>
        <Button variant="outline" onClick={closeSheet}>Close</Button>
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
      {/* ── Hero photo (full-bleed, 45vh) ─────────────────────────────── */}
      <div className="relative" style={{ height: '45vh', minHeight: 280 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#C8962C]/40 via-[#1C1C1E] to-black flex items-center justify-center">
            <span className="text-6xl font-black text-white/20">{name[0]}</span>
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: 'linear-gradient(to top, #050507 0%, transparent 100%)' }}
        />

        {/* Back button */}
        <button
          onClick={closeSheet}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm active:bg-black/70 z-10"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* More menu button */}
        {!isOwnProfile && (
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm active:bg-black/70 z-10"
            style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Name + persona overlay at bottom of hero */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex items-center gap-2">
            {/* Presence dot */}
            {(() => {
              const ls = profileUser.last_seen;
              const ms = ls ? Date.now() - new Date(ls).getTime() : Infinity;
              const isOn = profileUser.is_online || ms < 10 * 60_000;
              const isAway = ms < 60 * 60_000;
              return (isOn || isAway) ? (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: isOn ? '#30D158' : '#FFEB3B', boxShadow: isOn ? '0 0 6px #30D158' : undefined }}
                />
              ) : null;
            })()}
            <h2 className="text-2xl font-black text-white">{name}</h2>
            {isTravel && <Plane className="w-5 h-5 text-white/70 -rotate-45" />}
            {isVerified && (
              <div className="w-5 h-5 bg-[#00C2E0] rounded-full flex items-center justify-center">
                <Shield className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {visitingCity && (
              <span className="text-white/60 text-sm">
                {isTravel ? 'Visiting' : ''} {visitingCity}
                {profileUser.country_flag ? ` ${profileUser.country_flag}` : ''}
              </span>
            )}
            {(distance || etaMin) && (
              <span className="text-white/40 text-sm">
                {distance ? `${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} away` : ''}
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

      {/* ── Bio ────────────────────────────────────────────────────────── */}
      {profileUser?.bio && (
        <div className="px-4 py-2">
          <p className="text-white/70 text-sm leading-relaxed">{profileUser.bio}</p>
        </div>
      )}

      {/* ── Travel time chips — wired in P6 ────────────────────────────── */}
      {travelTimes && (
        <div className="flex gap-2 px-4 py-2">
          {/* populated when travelTimes available */}
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
            onFollow={() => toast.success(`Following ${name}`)}
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

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 z-10 flex gap-3"
        style={{
          background: 'rgba(5,5,7,0.95)',
          backdropFilter: 'blur(16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Boo button — ghost-themed quick action */}
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
        <Button
          onClick={handleMessage}
          className="flex-1 h-12 bg-[#C8962C] hover:bg-[#C8962C]/90 rounded-xl font-bold"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Message
        </Button>
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
