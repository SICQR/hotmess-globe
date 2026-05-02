/**
 * HomeMode V3 — Compressed Activation Layer
 *
 * Answers in under 2 seconds: what is this? / what should I do? / what's live?
 *
 * Above the fold:
 *   Hero (compact) with inline signal + single CTA
 *   State card (contextual: go live / you're live / complete profile)
 *
 * Below:
 *   Lane strip (quick doors: Ghosted, Market, Music)
 *   Ghosted hook (compact, urgency when live)
 *   Secondary strip (HNH MESS + Radio — support, not rivals)
 *   Spacer
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Ghost,
  ShoppingBag,
  Music,
  Zap,
  Play,
  Pause,
  ChevronRight,
  User,
  Radio,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useRadio } from '@/contexts/RadioContext';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { supabase } from '@/components/utils/supabaseClient';
import { motionTokens, getMotion, useReducedMotion } from '@/lib/motionTokens';
import RightNowModal from '@/components/globe/RightNowModal';
import { trackEvent } from '@/components/utils/analytics';
import { TrackPlayer } from '@/components/music/TrackPlayer';

// ── Brand tokens ────────────────────────────────────────────────────────────
const AMBER = '#C8962C';
const ROOT_BG = '#050507';
const MUTED = '#8E8E93';
const TEAL = '#00C2E0';
const MESS_TRACK_URL = 'https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/records-audio/hnh-mess-2-remastered.wav';

// ── Lane config ─────────────────────────────────────────────────────────────
const LANES = [
  { label: 'Ghosted', icon: Ghost, route: '/ghosted' },
  { label: 'Market', icon: ShoppingBag, route: '/market' },
  { label: 'Music', icon: Music, route: '/music' },
] as const;

interface HomeModeProps {
  className?: string;
}

export default function HomeMode({ className = '' }: HomeModeProps) {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const { profile } = useBootGuard();
  const { isPlaying: radioPlaying, togglePlay, setCurrentShowName, currentShowName } = useRadio();
  const reduced = useReducedMotion();

  const [showRightNow, setShowRightNow] = useState(false);

  // ── Data: right_now_status count ──────────────────────────────────────────
  const { data: rnCount = 0 } = useQuery({
    queryKey: ['home-v2-rn-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('right_now_status')
        .select('id', { count: 'exact', head: true })
        .gte('expires_at', new Date().toISOString());
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  // ── Data: active venue/event count ────────────────────────────────────────
  const { data: venueCount = 0 } = useQuery({
    queryKey: ['home-v2-venue-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('beacons')
        .select('id', { count: 'exact', head: true })
        .gte('ends_at', new Date().toISOString());
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  // ── Data: current user's right_now_status ─────────────────────────────────
  const { data: userRnStatus } = useQuery({
    queryKey: ['home-v2-user-rn'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from('right_now_status')
        .select('id, intent')
        .eq('user_id', session.user.id)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      return data;
    },
    refetchInterval: 30_000,
  });

  // ── Derive state card variant ─────────────────────────────────────────────
  const profileIncomplete = profile?.onboarding_completed &&
    (!profile?.avatar_url || !profile?.bio || !profile?.display_name);

  type CardVariant = 'go-live' | 'live' | 'complete-profile';
  let cardVariant: CardVariant = 'go-live';
  if (userRnStatus) cardVariant = 'live';
  else if (profileIncomplete) cardVariant = 'complete-profile';

  const handleGoLive = useCallback(() => {
    trackEvent('home_cta_tap', { cta: 'go_live' });
    openSheet('go-live', {});
  }, [openSheet]);

  const handleEnterPulse = useCallback(() => {
    trackEvent('home_cta_tap', { cta: 'enter_pulse' });
    navigate('/pulse');
  }, [navigate]);

  // ── Signal line (compact, inline with hero) ───────────────────────────────
  const signalParts: string[] = [];
  if (rnCount > 0) signalParts.push(`${rnCount} live`);
  if (venueCount > 0) signalParts.push(`${venueCount} venue${venueCount !== 1 ? 's' : ''}`);
  if (radioPlaying && currentShowName) signalParts.push('On air');
  const signalLine = signalParts.length > 0
    ? signalParts.join(' · ')
    : 'Quiet nearby right now';
  const hasSignal = signalParts.length > 0;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div
      className={`h-full w-full flex flex-col overflow-hidden ${className}`}
      style={{ background: ROOT_BG }}
    >
      <div
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(200,150,44,0.3) transparent',
        }}
      >

        {/* ================================================================ */}
        {/* 1. HERO — Compact, signal-integrated, single CTA               */}
        {/* ================================================================ */}
        <section
          className="relative w-full flex flex-col justify-end px-6 pt-6 pb-6"
          style={{ minHeight: 160 }}
        >
          {/* Radial gold glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 60%, rgba(200,150,44,0.06) 0%, transparent 70%)',
            }}
            {...(reduced ? {} : motionTokens.pulseBreath)}
          />

          <motion.div
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: reduced ? 0 : 0.1 } },
            }}
            className="relative z-10"
          >
            {/* Eyebrow */}
            <motion.p
              variants={reduced ? {} : motionTokens.fadeUpSm}
              className="text-[10px] font-black uppercase tracking-[0.3em] mb-2"
              style={{ color: AMBER }}
            >
              HOTMESS
            </motion.p>

            {/* Headline — static, answers "what is this?" */}
            <motion.h1
              variants={reduced ? {} : motionTokens.fadeUpSm}
              className="text-[28px] font-black text-white leading-[1.1] tracking-tight"
            >
              {userRnStatus ? "You're live." : "Tonight's already started."}
            </motion.h1>

            {/* Signal line — answers "what's live right now?" */}
            <motion.div
              variants={reduced ? {} : motionTokens.fadeUpMd}
              className="flex items-center gap-2 mt-3"
            >
              {hasSignal && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse flex-shrink-0" />
              )}
              <span className="text-xs font-semibold tracking-wide" style={{ color: hasSignal ? 'rgba(255,255,255,0.5)' : MUTED }}>
                {signalLine}
              </span>
            </motion.div>

            {/* Single dominant CTA — answers "what should I do?" */}
            <motion.div
              variants={reduced ? {} : motionTokens.fadeUpMd}
              className="mt-6"
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleEnterPulse}
                className="h-12 px-8 rounded-2xl text-sm font-bold flex items-center gap-2"
                style={{ background: AMBER, color: '#000' }}
                aria-label="Enter Pulse — live globe"
              >
                <Globe className="w-4 h-4" />
                Enter Pulse
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 2. STATE CARD — single contextual action                       */}
        {/* ================================================================ */}
        <section className="px-5 pb-5">
          <motion.div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            {...(reduced ? {} : motionTokens.cardFloat)}
          >
            {cardVariant === 'live' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: AMBER }} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold leading-tight">You&rsquo;re visible</p>
                    <p className="text-[11px] truncate" style={{ color: MUTED }}>{userRnStatus?.intent ?? 'Explore'}</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    trackEvent('home_cta_tap', { cta: 'open_ghosted_live' });
                    navigate('/ghosted');
                  }}
                  className="h-9 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
                  style={{ background: AMBER, color: '#000' }}
                  aria-label="See who's nearby"
                >
                  <Ghost className="w-3.5 h-3.5" />
                  Nearby
                </motion.button>
              </div>
            )}
            {cardVariant === 'go-live' && (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold leading-tight">You&rsquo;re off the grid</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>Go Live so people nearby can find you</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGoLive}
                  className="h-9 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0 ml-3"
                  style={{ background: AMBER, color: '#000' }}
                  aria-label="Go Live"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Go Live
                </motion.button>
              </div>
            )}
            {cardVariant === 'complete-profile' && (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold leading-tight">Complete your profile</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>Add a photo and bio</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openSheet('edit-profile')}
                  className="h-9 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0 ml-3"
                  style={{ background: AMBER, color: '#000' }}
                  aria-label="Edit your profile"
                >
                  <User className="w-3.5 h-3.5" />
                  Edit
                </motion.button>
              </div>
            )}
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 3. LANE STRIP — quick doors, not promos                        */}
        {/* ================================================================ */}
        <section className="px-5 pb-5">
          <div className="flex gap-2">
            {LANES.map((lane) => {
              const Icon = lane.icon;
              const isGhosted = lane.route === '/ghosted';
              return (
                <motion.button
                  key={lane.label}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    trackEvent('home_lane_tap', { lane: lane.label });
                    navigate(lane.route);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  aria-label={lane.label}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
                  <span className="text-white font-bold text-xs">{lane.label}</span>
                  {isGhosted && rnCount > 0 && (
                    <span
                      className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-black px-1"
                      style={{ background: AMBER }}
                    >
                      {rnCount > 99 ? '99+' : rnCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ================================================================ */}
        {/* 4. GHOSTED HOOK — compact, urgency-aware                       */}
        {/* ================================================================ */}
        {/* Only show when NOT live (live users get Ghosted via state card) */}
        {!userRnStatus && (
          <section className="px-5 pb-5">
            <button
              onClick={() => {
                trackEvent('home_cta_tap', { cta: 'ghosted_hook' });
                navigate('/ghosted');
              }}
              className="w-full rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-transform"
              style={{ background: 'rgba(255,255,255,0.03)' }}
              aria-label="Open Ghosted"
            >
              <div className="flex items-center gap-3">
                <Ghost className="w-4 h-4" style={{ color: AMBER }} />
                <div className="text-left">
                  <p className="text-white font-bold text-sm leading-tight">
                    {rnCount > 0 ? `${rnCount} men out right now` : 'See who\u2019s nearby'}
                  </p>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {rnCount > 0 ? 'Don\u2019t guess. See them.' : 'Go Live first, or just browse.'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </button>
          </section>
        )}

        {/* ================================================================ */}
        {/* 5. HNH MESS PROMO CARD                                         */}
        {/* ================================================================ */}
        <section className="px-5 pb-5">
          <div className="rounded-2xl overflow-hidden relative hm-depth border border-white/10 p-5 bg-gradient-to-b from-[#1A1A1C] to-[#121214]">

            <div className="flex gap-4 mb-5">
              {/* Left Column: Text */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="hm-badge">HNH MESS</span>
                  {radioPlaying && <span className="hm-badge-outline" style={{ borderColor: TEAL, color: TEAL }}>Live</span>}
                </div>
                <h2 className="text-[20px] font-black text-white leading-[1.05] mb-2 tracking-tight block">
                  Care hits different<br />when it’s dirty.
                </h2>
                <p className="text-white/50 text-[11px] font-medium leading-relaxed max-w-[140px]">
                  Lube. Aftercare. Radio. No shame. No pretending.
                </p>
              </div>

              {/* Right Column: Portrait Image Frame */}
              <div className="w-32 h-44 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative shadow-2xl shadow-black bg-black">
                <img
                  src="/images/HNHMESS HERO.PNG"
                  alt="HNH MESS Lube"
                  className="w-full h-full object-cover object-[center_60%] opacity-90"
                />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Track Player */}
            <div className="mb-5">
              <TrackPlayer
                trackTitle="HNH MESS — Remastered"
                trackSource={MESS_TRACK_URL}
                artistName="HOTMESS RECORDS"
                minimal={true}
                className="bg-black/40 border-white/5"
                themeColor={AMBER}
              />
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 mb-5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  trackEvent('home_cta_tap', { cta: 'hnh_mess_get_messy' });
                  navigate('/market');
                }}
                className="flex-1 bg-white/5 border border-white/10 text-white font-black text-xs h-12 rounded-xl flex items-center justify-center gap-1.5"
              >
                Get the products <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  openSheet('shop-cart');
                }}
                className="flex-shrink-0 w-12 h-12 bg-[#C8962C] text-black rounded-xl flex items-center justify-center shadow-lg shadow-[#C8962C]/20"
              >
                <ShoppingBag className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Stigma & Nudge Footer */}
            <div className="flex items-end justify-between pt-4 border-t border-white/10">
              <p className="text-white/70 text-[10px] font-bold tracking-wide italic">
                You don’t get to skip aftercare.
              </p>
              <div className="flex items-center gap-1 text-[#C8962C] text-[9px] font-black uppercase tracking-widest text-right">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8962C] animate-pulse" />
                First run.
              </div>
            </div>

          </div>
        </section>


      </div>

      {/* ── Right Now Modal (Go Live flow) ─────────────────────────────── */}
      {showRightNow && (
        <RightNowModal onClose={() => setShowRightNow(false)} />
      )}
    </div>
  );
}
