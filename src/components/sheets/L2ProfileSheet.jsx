/**
 * L2ProfileSheet — Full-bleed profile with content cards
 *
 * Matches the design mockup:
 *   - Hero photo (top 45vh) with gradient overlay
 *   - Persona name + travel icon + visiting city + distance/ETA
 *   - Content cards stack: Hookup / For Sale / Creator
 *   - Bottom actions: Message + more menu
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44, supabase } from '@/components/utils/supabaseClient';
import {
  MessageCircle, MapPin, Shield, Plane,
  Loader2, MoreVertical, Flag, Ban, X, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import ProfileContentCard from '@/components/cards/ProfileContentCard';

/**
 * Renders a full-bleed profile sheet with hero image, persona details, content cards, and bottom actions.
 *
 * Displays the profile for the provided `email` or `uid` (or the current authenticated user when neither is provided),
 * and supports messaging, reporting, and blocking actions via UI controls.
 *
 * @param {Object} props
 * @param {string} [props.email] - Email of the profile to display; when omitted and `uid` is also omitted, shows the current user.
 * @param {string} [props.uid] - Auth user id of the profile to display; used when `email` is not provided.
 * @returns {JSX.Element} The profile sheet UI element.
export default function L2ProfileSheet({ email, uid }) {
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useSheet();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // ── Data queries ────────────────────────────────────────────────────────

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['profile-sheet', email, uid],
    queryFn: async () => {
      if (!email && !uid) return await base44.auth.me();

      const qs = new URLSearchParams();
      if (email) qs.set('email', email);
      else if (uid) qs.set('uid', uid);

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
        const users = await base44.entities.User.filter({ email });
        return users?.[0] || null;
      }
      if (uid) {
        const users = await base44.entities.User.filter({ auth_user_id: uid });
        return users?.[0] || null;
      }
      return null;
    },
  });

  const isOwnProfile = !email && !uid ||
    (currentUser?.email && profileUser?.email === currentUser.email);

  // Right Now status
  const { data: rightNowStatus } = useQuery({
    queryKey: ['right-now-status', profileUser?.email],
    queryFn: async () => {
      if (!profileUser?.email) return null;
      const { data } = await supabase
        .from('right_now_status')
        .select('*')
        .eq('user_email', profileUser.email)
        .eq('active', true)
        .gt('expires_at', new Date().toISOString())
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
    if (!profileUser?.email) return;
    openSheet(SHEET_TYPES.CHAT, {
      to: profileUser.email,
      title: `Chat with ${profileUser.full_name || profileUser.username}`,
    });
  };

  const handleBlock = async () => {
    if (!currentUser || !profileUser) return;
    setIsBlocking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', profileUser.email)
        .single();

      if (!targetProfile) throw new Error('User not found');

      const { error } = await supabase
        .from('profile_blocklist_users')
        .insert({
          profile_id: user.id,
          blocked_user_id: targetProfile.id,
          reason: 'User blocked from profile',
        });

      if (error) throw error;
      toast.success(`${profileUser.full_name || 'User'} blocked`);
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

  const name = profileUser.full_name || profileUser.username || 'Anonymous';
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
            <h2 className="text-2xl font-black text-white">{name}</h2>
            {isTravel && <Plane className="w-5 h-5 text-white/70 -rotate-45" />}
            {isVerified && (
              <div className="w-5 h-5 bg-[#00D9FF] rounded-full flex items-center justify-center">
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
        {isOwnProfile ? (
          <Button
            onClick={() => { closeSheet(); navigate('/profile'); }}
            className="flex-1 h-12 bg-white/10 hover:bg-white/20 rounded-xl font-bold"
          >
            Edit Profile
          </Button>
        ) : (
          <Button
            onClick={handleMessage}
            className="flex-1 h-12 bg-[#C8962C] hover:bg-[#C8962C]/90 rounded-xl font-bold"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Message
          </Button>
        )}
      </div>

      {/* ── More menu dropdown ─────────────────────────────────────────── */}
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
