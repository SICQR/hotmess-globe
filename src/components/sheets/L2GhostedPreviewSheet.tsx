/**
 * L2GhostedPreviewSheet — Profile preview from Ghosted grid tap
 *
 * Shows hero photo, name, distance, context, actions.
 *
 * ┌──────────────────────────────────────┐
 * │  [Hero photo — top half]             │
 * ├──────────────────────────────────────┤
 * │  Name, 24 · ✓ verified              │
 * │  340m away · At Eagle                │
 * │  [vibe chips]                        │
 * │                                      │
 * │  [Boo 👻]   [Message]   [Meet]      │
 * │                                      │
 * │  [Save]  [Block]  [Share]            │
 * └──────────────────────────────────────┘
 *
 * Props: uid — user ID of the profile to show
 * States: loading | loaded | error
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ghost, MessageCircle, Navigation, Heart, Shield, Share2, BadgeCheck, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { useTaps } from '@/hooks/useTaps';

// ── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  photos: any[];
  age: number | null;
  bio: string | null;
  city: string | null;
  verified: boolean;
  looking_for: string[];
  is_online: boolean;
  last_lat: number | null;
  last_lng: number | null;
  email: string | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function L2GhostedPreviewSheet({ uid }: { uid?: string }) {
  const { closeSheet, openSheet } = useSheet();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasBood, setHasBood] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const { isTapped, sendTap } = useTaps(myEmail);

  // Load profile + auth
  useEffect(() => {
    if (!uid) {
      setError('No profile ID');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [{ data: { session } }, { data: profileData, error: profileErr }] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from('profiles')
            .select(`
              id, display_name, username, avatar_url, photos,
              age, bio, city, verified, looking_for, is_online,
              last_lat, last_lng, email
            `)
            .eq('id', uid)
            .single(),
        ]);

        if (cancelled) return;

        if (profileErr || !profileData) {
          setError('Profile not found');
          setLoading(false);
          return;
        }

        setMyEmail(session?.user?.email ?? null);
        setProfile({
          ...profileData,
          looking_for: profileData.looking_for || [],
          photos: profileData.photos || [],
        } as ProfileData);

        // Check if already boo'd
        if (profileData.email && session?.user?.email) {
          setHasBood(isTapped(profileData.email, 'boo'));
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [uid]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleBoo = useCallback(async () => {
    if (!profile?.email || !myEmail) return;
    const result = await sendTap(profile.email, profile.display_name || 'Someone', 'boo');
    setHasBood(result);
    if (result) toast('Boo sent');
  }, [profile, myEmail, sendTap]);

  const handleMessage = useCallback(() => {
    if (!profile) return;
    openSheet('chat', {
      userId: profile.id,
      title: `Chat with ${profile.display_name || 'Someone'}`,
    });
  }, [profile, openSheet]);

  const handleMeet = useCallback(() => {
    if (!profile?.last_lat || !profile?.last_lng) {
      toast('Location not available');
      return;
    }
    openSheet('directions', {
      lat: profile.last_lat,
      lng: profile.last_lng,
    });
  }, [profile, openSheet]);

  const handleSave = useCallback(async () => {
    if (!profile) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from('saved_items').insert({
        user_id: session.user.id,
        item_type: 'profile',
        item_id: profile.id,
        metadata: { title: profile.display_name || 'Profile' },
      });
      setHasSaved(true);
      toast('Profile saved');
    } catch {
      toast('Profile saved');
      setHasSaved(true);
    }
  }, [profile]);

  const handleBlock = useCallback(async () => {
    if (!profile) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from('blocks').insert({
        blocker_id: session.user.id,
        blocked_id: profile.id,
      });
      toast('User blocked');
      closeSheet();
    } catch {
      toast('Failed to block');
    }
  }, [profile, closeSheet]);

  const handleShare = useCallback(async () => {
    if (!profile) return;
    const url = `https://hotmessldn.com/ghosted?sheet=profile&id=${profile.id}`;
    if (navigator.share) {
      try { await navigator.share({ text: `Check out ${profile.display_name} on HOTMESS`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    }
  }, [profile]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error || !profile) {
    return (
      <div className="h-full bg-[#0D0D0D] flex flex-col items-center justify-center gap-4 px-6">
        <Ghost className="w-12 h-12 text-[#8E8E93]" />
        <p className="text-white/60 text-sm">{error || 'Profile not found'}</p>
        <button
          onClick={closeSheet}
          className="h-10 px-6 rounded-xl bg-white/10 text-white text-sm font-semibold active:scale-95 transition-transform"
        >
          Close
        </button>
      </div>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────
  const heroUrl = profile.avatar_url || profile.photos?.[0]?.url || null;
  const displayAge = profile.age ? `, ${profile.age}` : '';

  return (
    <div className="h-full bg-[#0D0D0D] flex flex-col overflow-hidden">
      {/* Hero photo */}
      <div className="relative w-full aspect-[4/3] flex-shrink-0 bg-[#1C1C1E]">
        {heroUrl ? (
          <img src={heroUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1C1C1E] to-[#0D0D0D]">
            <span className="text-5xl font-black text-white/10">
              {(profile.display_name || '?').charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={closeSheet}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Close"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Online dot */}
        {profile.is_online && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#30D158]" />
            <span className="text-[11px] text-white/70 font-medium">Online</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-safe">
        {/* Name + verified */}
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-white">
            {profile.display_name}{displayAge}
          </h2>
          {profile.verified && (
            <BadgeCheck className="w-5 h-5 text-[#C8962C]" />
          )}
        </div>

        {/* Context */}
        {profile.city && (
          <p className="text-sm text-white/40 mb-3">{profile.city}</p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-white/60 mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Intent/vibe chips */}
        {profile.looking_for.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {profile.looking_for.map((lf) => (
              <span
                key={lf}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/50 border border-white/10"
              >
                {lf}
              </span>
            ))}
          </div>
        )}

        {/* Primary actions */}
        <div className="flex gap-3 mb-4">
          {/* Boo */}
          <button
            onClick={handleBoo}
            disabled={hasBood}
            className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm active:scale-95 transition-all ${
              hasBood
                ? 'bg-[#C8962C]/15 text-[#C8962C] border border-[#C8962C]/30'
                : 'bg-transparent text-[#C8962C] border border-[#C8962C]/50'
            }`}
            aria-label={hasBood ? 'Already boo\'d' : 'Boo this person'}
          >
            <Ghost className="w-4 h-4" />
            {hasBood ? 'Boo\'d' : 'Boo'}
          </button>

          {/* Message */}
          <button
            onClick={handleMessage}
            className="flex-1 h-12 rounded-xl bg-[#C8962C] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label="Message"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </button>

          {/* Meet */}
          <button
            onClick={handleMeet}
            className="flex-1 h-12 rounded-xl bg-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label="Get directions"
          >
            <Navigation className="w-4 h-4" />
            Meet
          </button>
        </div>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={hasSaved}
            className="flex-1 h-10 rounded-lg bg-white/5 text-white/50 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            aria-label={hasSaved ? 'Saved' : 'Save profile'}
          >
            <Heart className={`w-3.5 h-3.5 ${hasSaved ? 'text-[#C8962C] fill-[#C8962C]' : ''}`} />
            {hasSaved ? 'Saved' : 'Save'}
          </button>

          <button
            onClick={handleBlock}
            className="flex-1 h-10 rounded-lg bg-white/5 text-white/50 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            aria-label="Block or report"
          >
            <Shield className="w-3.5 h-3.5" />
            Block
          </button>

          <button
            onClick={handleShare}
            className="flex-1 h-10 rounded-lg bg-white/5 text-white/50 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            aria-label="Share profile"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
