/**
 * HomeMode V2 — Activation Layer
 *
 * Not a content feed. An activation surface that launches the user into
 * the live system: Pulse, Ghosted, Market, Music, Radio.
 *
 * Sections:
 *   1. Hero — Globe entry (radial gold glow, staggered text, 2 CTAs)
 *   2. Live Signal Strip — real-time pills (RN count, venues, on-air)
 *   3. State Card — contextual single card (go live / you're live / complete profile)
 *   4. Core Nav Grid — 2x2 fast lanes
 *   5. Ghosted Hook — urgency copy + CTA
 *   6. Travel Card — (data-dependent, shown when cluster available)
 *   7. HNH MESS Shop — product promo
 *   8. Radio — on-air section
 *   9. Spacer — nav clearance
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

// ── Hero headline pools ─────────────────────────────────────────────────────
const HERO_HEADLINES = [
  'The city is live.',
  "Who's out. Who's up. Who's next.",
  "Tonight's already started.",
  'Find trouble. Or be it.',
] as const;

// ── Core nav grid config ────────────────────────────────────────────────────
const CORE_LANES = [
  { label: 'Ghosted', sub: 'Men nearby', icon: Ghost, route: '/ghosted' },
  { label: 'Market', sub: 'Gear up', icon: ShoppingBag, route: '/market' },
  { label: 'Music', sub: 'Releases', icon: Music, route: '/music' },
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
  const [heroIdx, setHeroIdx] = useState(0);

  // Rotate hero headline every 6s
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_HEADLINES.length), 6000);
    return () => clearInterval(t);
  }, []);

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

  // ── Signal strip pills ────────────────────────────────────────────────────
  const signalPills: Array<{ label: string; live: boolean }> = [];
  if (rnCount > 0) signalPills.push({ label: `${rnCount} OUT RIGHT NOW`, live: true });
  if (venueCount > 0) signalPills.push({ label: `${venueCount} VENUE${venueCount !== 1 ? 'S' : ''} LIVE`, live: true });
  if (radioPlaying) signalPills.push({ label: 'ON AIR', live: true });
  if (signalPills.length === 0) signalPills.push({ label: 'QUIET TONIGHT', live: false });

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
        {/* 1. HERO — Globe Entry                                           */}
        {/* ================================================================ */}
        <section
          className="relative w-full flex flex-col justify-end px-6 pb-10"
          style={{ height: 400 }}
        >
          {/* Radial gold glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 60%, rgba(200,150,44,0.08) 0%, transparent 70%)',
            }}
            {...(reduced ? {} : motionTokens.pulseBreath)}
          />

          {/* Staggered text entrance */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: reduced ? 0 : 0.12 } },
            }}
            className="relative z-10"
          >
            {/* Eyebrow */}
            <motion.p
              variants={reduced ? {} : motionTokens.fadeUpSm}
              className="text-[10px] font-black uppercase tracking-[0.3em] mb-3"
              style={{ color: AMBER }}
            >
              HOTMESS
            </motion.p>

            {/* Headline — rotating */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={heroIdx}
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="text-[32px] font-black text-white leading-[1.1] tracking-tight"
              >
                {HERO_HEADLINES[heroIdx]}
              </motion.h1>
            </AnimatePresence>

            {/* Subline */}
            <motion.p
              variants={reduced ? {} : motionTokens.fadeUpMd}
              className="text-sm mt-3 tracking-wide"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Tap in. See who&rsquo;s out. Move.
            </motion.p>

            {/* Single dominant CTA */}
            <motion.div
              variants={reduced ? {} : motionTokens.fadeUpMd}
              className="mt-8"
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleEnterPulse}
                className="h-12 px-8 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors"
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
        {/* 2. LIVE SIGNAL STRIP                                            */}
        {/* ================================================================ */}
        <section className="px-5 pb-6">
          <motion.div
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            {...(reduced ? {} : { animate: { x: [0, -2, 0] }, transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' } })}
          >
            {signalPills.map((pill, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {pill.live && (
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#30D158]"
                    {...(reduced ? {} : motionTokens.statusDotPulse)}
                  />
                )}
                <span className="text-xs font-bold tracking-wider text-white/60">{pill.label}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 3. STATE CARD — single contextual card                          */}
        {/* ================================================================ */}
        <section className="px-5 pb-6">
          <motion.div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            {...(reduced ? {} : motionTokens.cardFloat)}
          >
            {cardVariant === 'live' && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: AMBER }} />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: AMBER }}>
                    You&rsquo;re live
                  </p>
                </div>
                <p className="text-white text-sm font-semibold mb-1">
                  People nearby can see you
                </p>
                <p className="text-xs mb-3" style={{ color: MUTED }}>
                  {userRnStatus?.intent ?? 'Explore'}
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    trackEvent('home_cta_tap', { cta: 'open_ghosted_live' });
                    navigate('/ghosted');
                  }}
                  className="h-10 px-5 rounded-full text-sm font-bold flex items-center gap-1.5"
                  style={{ background: AMBER, color: '#000' }}
                  aria-label="Open Ghosted — see who's nearby"
                >
                  <Ghost className="w-3.5 h-3.5" />
                  See Who&rsquo;s Nearby
                </motion.button>
              </>
            )}
            {cardVariant === 'go-live' && (
              <>
                <p className="text-white text-sm font-semibold mb-1">You&rsquo;re off the grid</p>
                <p className="text-xs mb-4" style={{ color: MUTED }}>
                  Go Live so people nearby can find you
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGoLive}
                  className="h-10 px-5 rounded-full text-sm font-bold flex items-center gap-1.5"
                  style={{ background: AMBER, color: '#000' }}
                  aria-label="Go Live"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Go Live
                </motion.button>
              </>
            )}
            {cardVariant === 'complete-profile' && (
              <>
                <p className="text-white text-sm font-semibold mb-1">Complete your profile</p>
                <p className="text-xs mb-4" style={{ color: MUTED }}>
                  Add a photo and bio so people know who you are.
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openSheet('edit-profile')}
                  className="h-10 px-5 rounded-full text-sm font-bold flex items-center gap-1.5"
                  style={{ background: AMBER, color: '#000' }}
                  aria-label="Edit your profile"
                >
                  <User className="w-3.5 h-3.5" />
                  Edit Profile
                </motion.button>
              </>
            )}
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 4. CORE NAV GRID — 2x2                                          */}
        {/* ================================================================ */}
        <section className="px-5 pb-6">
          <div className="flex gap-2">
            {CORE_LANES.map((lane) => {
              const Icon = lane.icon;
              return (
                <motion.button
                  key={lane.label}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    trackEvent('home_lane_tap', { lane: lane.label });
                    navigate(lane.route);
                  }}
                  className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-3"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  aria-label={`${lane.label} — ${lane.sub}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
                  <span className="text-white font-bold text-xs">{lane.label}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ================================================================ */}
        {/* 5. GHOSTED HOOK                                                 */}
        {/* ================================================================ */}
        <section className="px-5 pb-8">
          <motion.div
            className="rounded-2xl p-5"
            style={{ background: userRnStatus ? `${AMBER}08` : 'rgba(255,255,255,0.03)', border: userRnStatus ? `1px solid ${AMBER}15` : 'none' }}
            {...getMotion('fadeUpMd', reduced)}
          >
            <p className="text-white font-bold text-base leading-snug">
              {userRnStatus
                ? (rnCount > 1 ? `${rnCount} men out right now` : 'Someone nearby is live')
                : 'Men are out right now.'}
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: MUTED }}>
              {userRnStatus ? 'You\u2019re live. See who\u2019s around.' : 'Don\u2019t guess. See them.'}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                trackEvent('home_cta_tap', { cta: 'ghosted_hook' });
                navigate('/ghosted');
              }}
              className="flex items-center gap-1 text-sm font-bold"
              style={{ color: AMBER }}
              aria-label="Open Ghosted"
            >
              Open Ghosted
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 6. TRAVEL CARD — conditional, shown when cluster data exists    */}
        {/* ================================================================ */}
        {/* Travel card intentionally omitted until cluster data source is wired */}

        {/* ================================================================ */}
        {/* 7. HNH MESS SHOP                                                */}
        {/* ================================================================ */}
        <section className="px-5 pb-8">
          <motion.div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            {...getMotion('fadeUpMd', reduced)}
          >
            <p
              className="text-[10px] font-black uppercase tracking-[0.25em] mb-2"
              style={{ color: AMBER }}
            >
              HNH MESS
            </p>
            <p className="text-white font-bold text-lg leading-snug">
              Built for the floor.
            </p>
            <p className="text-xs mt-1 mb-5" style={{ color: MUTED }}>
              Lube. Essentials. No hesitation.
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                trackEvent('home_cta_tap', { cta: 'hnh_shop' });
                navigate('/market');
              }}
              className="h-11 px-6 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ background: AMBER, color: '#000' }}
              aria-label="Shop HNH MESS"
            >
              <ShoppingBag className="w-4 h-4" />
              Shop Now
            </motion.button>
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 8. RADIO                                                        */}
        {/* ================================================================ */}
        <section className="px-5 pb-8">
          <motion.div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(0,194,224,0.04)', border: '1px solid rgba(0,194,224,0.1)' }}
            {...getMotion('fadeUpMd', reduced)}
          >
            <div className="flex items-center gap-2 mb-2">
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: TEAL }}
                {...(reduced ? {} : motionTokens.statusDotPulse)}
              />
              <p
                className="text-[10px] font-black uppercase tracking-[0.25em]"
                style={{ color: TEAL }}
              >
                ON AIR
              </p>
            </div>
            <p className="text-white font-bold text-lg leading-snug">
              HOTMESS Radio
            </p>
            {currentShowName && (
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Now playing: {currentShowName}
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  trackEvent('home_cta_tap', { cta: 'radio_listen' });
                  togglePlay();
                }}
                className="h-11 px-6 rounded-xl text-sm font-bold flex items-center gap-2"
                style={{ background: TEAL, color: '#000' }}
                aria-label={radioPlaying ? 'Pause radio' : 'Listen to HOTMESS Radio'}
              >
                {radioPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {radioPlaying ? 'Pause' : 'Listen'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  trackEvent('home_cta_tap', { cta: 'radio_page' });
                  navigate('/radio');
                }}
                className="h-11 px-5 rounded-xl text-sm font-bold flex items-center gap-1 text-white/60"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                aria-label="Open radio page"
              >
                <Radio className="w-4 h-4" />
                Full Player
              </motion.button>
            </div>
          </motion.div>
        </section>

        {/* ================================================================ */}
        {/* 9. SPACER — nav clearance                                       */}
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
