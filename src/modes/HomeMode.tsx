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

// ── Brand tokens ────────────────────────────────────────────────────────────
const AMBER = '#C8962C';
const ROOT_BG = '#050507';
const MUTED = '#8E8E93';
const TEAL = '#00C2E0';

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
  const { isPlaying: radioPlaying, currentShowName, togglePlay } = useRadio();
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
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* ================================================================ */}
        {/* 1. HERO — Compact, signal-integrated, single CTA               */}
        {/* ================================================================ */}
        <section
          className="relative w-full flex flex-col justify-end px-6 pb-6"
          style={{ height: 260 }}
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
        {/* 5. SECONDARY STRIP — HNH MESS + Radio, compressed             */}
        {/* ================================================================ */}
        <section className="px-5 pb-5 space-y-2">
          {/* HNH MESS — compact row */}
          <button
            onClick={() => {
              trackEvent('home_cta_tap', { cta: 'hnh_shop' });
              navigate('/market');
            }}
            className="w-full rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.98] transition-transform"
            style={{ background: 'rgba(255,255,255,0.03)' }}
            aria-label="Shop HNH MESS"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4" style={{ color: AMBER }} />
              <div className="text-left">
                <p className="text-white font-bold text-sm leading-tight">HNH MESS</p>
                <p className="text-[11px]" style={{ color: MUTED }}>Lube + essentials. From £10.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </button>

          {/* Radio — compact row */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: 'rgba(0,194,224,0.03)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Radio className="w-4 h-4 flex-shrink-0" style={{ color: TEAL }} />
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-bold text-sm leading-tight">HOTMESS Radio</p>
                  {radioPlaying && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: TEAL }} />
                  )}
                </div>
                <p className="text-[11px] truncate" style={{ color: MUTED }}>
                  {radioPlaying && currentShowName ? currentShowName : 'Live shows + mixes'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  trackEvent('home_cta_tap', { cta: 'radio_listen' });
                  togglePlay();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: TEAL }}
                aria-label={radioPlaying ? 'Pause radio' : 'Play radio'}
              >
                {radioPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-black" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-black" />
                )}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  trackEvent('home_cta_tap', { cta: 'radio_page' });
                  navigate('/radio');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                aria-label="Full radio player"
              >
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              </motion.button>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 6. SPACER — nav clearance                                      */}
        {/* ================================================================ */}
        <div className="h-24" />

      </div>

      {/* ── Right Now Modal (Go Live flow) ─────────────────────────────── */}
      {showRightNow && (
        <RightNowModal onClose={() => setShowRightNow(false)} />
      )}
    </div>
  );
}
