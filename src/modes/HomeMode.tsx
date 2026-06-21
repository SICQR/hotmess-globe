/**
 * HomeMode V4 — Discovery First
 *
 * Order of precedence:
 *   1. What's on right now (venues, partner events)
 *   2. What's coming up (next ritual)
 *   3. Who's out (Ghosted)
 *   4. What's playing (Radio)
 *   5. Quick nav
 *   6. State / admin / commerce (below the fold)
 *
 * Phil 2026-06-16: Home redesign — nightlife discovery leads, admin follows.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Ghost, ShoppingBag, Music, Globe, User, ChevronRight } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useRadio } from '@/contexts/RadioContext';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { supabase } from '@/components/utils/supabaseClient';
import { motionTokens, useReducedMotion } from '@/lib/motionTokens';
import CareSuiteCard from '@/components/care/CareSuiteCard';
import CareSuiteExplainer from '@/components/care/CareSuiteExplainer';
import RightNowModal from '@/components/globe/RightNowModal';
import { trackEvent } from '@/components/utils/analytics';
import { TrackPlayer } from '@/components/music/TrackPlayer';
import { HotmessText } from '@/components/brand/HotmessWordmark';
import SafetyNetworkCard from '@/components/safety/SafetyNetworkCard';
import NextUpCard from '@/components/home/NextUpCard';
import VenueDiscoveryCards from '@/components/home/VenueDiscoveryCards';
import GhostedStrip from '@/components/home/GhostedStrip';
import RadioStrip from '@/components/home/RadioStrip';
import LTGOHomeCard from '@/components/home/LTGOHomeCard';
import LTGOBroadcastButton from '@/components/signals/LTGOBroadcastButton';
import { HnhMessPromoCard } from '@/components/promos/HnhMessPromoCard';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const AMBER = '#C8962C';
const ROOT_BG = '#050507';
const MUTED = '#8E8E93';
const TEAL = '#00C2E0';
const MESS_TRACK_URL =
  'https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/records-audio/hnh-mess-2-remastered.wav';

// ── Lane config ───────────────────────────────────────────────────────────────
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
  const { isPlaying: radioPlaying, currentShowName } = useRadio();
  const reduced = useReducedMotion();

  const [showRightNow, setShowRightNow] = useState(false);
  const [showCareExplainer, setShowCareExplainer] = useState(false);
  const [homeBeaconImgFailed, setHomeBeaconImgFailed] = useState(false);

  // ── Data: right_now_status count ─────────────────────────────────────────
  const { data: rnCount = 0 } = useQuery({
    queryKey: ['home-rn-count'],
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

  // ── Data: active venue/event count ───────────────────────────────────────
  const { data: venueCount = 0 } = useQuery({
    queryKey: ['home-venue-count'],
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

  // ── Data: current user's right_now_status ────────────────────────────────
  const { data: userRnStatus } = useQuery({
    queryKey: ['home-user-rn'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

  // ── State card variant ────────────────────────────────────────────────────
  const profileIncomplete =
    profile?.onboarding_completed &&
    (!profile?.avatar_url || !profile?.bio || !profile?.display_name);

  type CardVariant = 'live' | 'complete-profile' | 'hidden';
  let cardVariant: CardVariant = 'hidden';
  if (userRnStatus) cardVariant = 'live';
  else if (profileIncomplete) cardVariant = 'complete-profile';

  const handleGoLive = useCallback(() => {
    trackEvent('home_cta_tap', { cta: 'go_live' });
    openSheet('go-live', {});
  }, [openSheet]);

  // ── Signal line ───────────────────────────────────────────────────────────
  const signalParts: string[] = [];
  if (rnCount > 0) signalParts.push(`${rnCount} live`);
  if (venueCount > 0) signalParts.push(`${venueCount} venue${venueCount !== 1 ? 's' : ''}`);
  if (radioPlaying && currentShowName) signalParts.push('On air');
  const signalLine = signalParts.length > 0 ? signalParts.join(' · ') : 'Quiet right now';
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
        {/* 1. HERO — compact signal layer, single CTA                     */}
        {/* ================================================================ */}
        <section
          className="relative w-full flex flex-col justify-end px-6 pt-8 pb-5"
          style={{ minHeight: 140 }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 60%, rgba(200,150,44,0.06) 0%, transparent 70%)',
            }}
            {...(reduced ? {} : motionTokens.pulseBreath)}
          />

          <motion.div
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: reduced ? 0 : 0.08 } } }}
            className="relative z-10"
          >
            <motion.p
              variants={reduced ? {} : motionTokens.fadeUpSm}
              className="text-[10px] font-medium uppercase tracking-[0.3em] mb-2"
            >
              <HotmessText accent={AMBER} />
            </motion.p>

            <motion.h1
              variants={reduced ? {} : motionTokens.fadeUpSm}
              className="text-[26px] font-medium text-white leading-[1.1] tracking-tight"
            >
              {userRnStatus ? "You're live." : "Tonight's already started."}
            </motion.h1>

            <motion.div
              variants={reduced ? {} : motionTokens.fadeUpMd}
              className="flex items-center gap-2 mt-2.5"
            >
              {hasSignal && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse flex-shrink-0" />
              )}
              <span
                className="text-xs font-medium tracking-wide"
                style={{ color: hasSignal ? 'rgba(255,255,255,0.5)' : MUTED }}
              >
                {signalLine}
              </span>
            </motion.div>

            <motion.div variants={reduced ? {} : motionTokens.fadeUpMd} className="mt-5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  trackEvent('home_cta_tap', { cta: 'enter_pulse' });
                  navigate('/pulse');
                }}
                className="h-11 px-7 rounded-2xl text-sm font-medium flex items-center gap-2"
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
        {/* 2. VENUE DISCOVERY — what's on tonight (horizontal scroll)     */}
        {/* ================================================================ */}
        <LTGOBroadcastButton />
        <VenueDiscoveryCards />

        {/* ================================================================ */}
        {/* 3. NEXT UP — upcoming ritual (one card, countdown)             */}
        {/* ================================================================ */}
        <section className="px-5 pb-4">
          <NextUpCard slot="next" />
        </section>

        {/* ================================================================ */}
        {/* 4. GHOSTED STRIP — who's out right now                         */}
        {/* ================================================================ */}
        <GhostedStrip rnCount={rnCount} />

        <LTGOHomeCard />

        {/* ================================================================ */}
        {/* 5. RADIO STRIP — tune in                                       */}
        {/* ================================================================ */}
        <RadioStrip />

        {/* ================================================================ */}
        {/* 6. LANE STRIP — quick doors                                    */}
        {/* ================================================================ */}
        <section className="px-5 pb-5">
          <div className="flex gap-2">
            {LANES.map((lane) => {
              const Icon = lane.icon;
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
                  <span className="text-white font-medium text-xs">{lane.label}</span>
                  {lane.route === '/ghosted' && rnCount > 0 && (
                    <span
                      className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-medium text-black px-1"
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
        {/* 7. STATE CARD — contextual (live / complete profile)           */}
        {/* ================================================================ */}
        {cardVariant !== 'hidden' && (
          <section className="px-5 pb-5">
            <motion.div
              className="rounded-2xl p-4"
              style={{ background: '#1C1C1E' }}
              {...(reduced ? {} : motionTokens.cardFloat)}
            >
              {cardVariant === 'live' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                      style={{ background: AMBER }}
                    />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium leading-tight">
                        You&rsquo;re visible
                      </p>
                      <p className="text-[11px] truncate" style={{ color: MUTED }}>
                        {userRnStatus?.intent ?? 'Explore'}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      trackEvent('home_cta_tap', { cta: 'open_ghosted_live' });
                      navigate('/ghosted');
                    }}
                    className="h-9 px-4 rounded-full text-xs font-medium flex items-center gap-1.5 flex-shrink-0"
                    style={{ background: AMBER, color: '#000' }}
                    aria-label="See who's nearby"
                  >
                    <Ghost className="w-3.5 h-3.5" />
                    Nearby
                  </motion.button>
                </div>
              )}
              {cardVariant === 'complete-profile' && (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium leading-tight">
                      Complete your profile
                    </p>
                    <p className="text-[11px]" style={{ color: MUTED }}>
                      Add a photo and bio
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openSheet('edit-profile')}
                    className="h-9 px-4 rounded-full text-xs font-medium flex items-center gap-1.5 flex-shrink-0 ml-3"
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
        )}

        {/* ================================================================ */}
        {/* 8. REMAINING RITUALS — secondary upcoming events               */}
        {/* ================================================================ */}
        <section className="px-5 pb-5">
          <NextUpCard slot="rest" />
        </section>

        {/* ================================================================ */}
        {/* 9. DROP A BEACON — platform's primary write action             */}
        {/* ================================================================ */}
        <section className="px-5 pb-5">
          <div
            role="img"
            aria-label="Drop a Beacon. Let the right people find you."
            className="relative w-full overflow-hidden rounded-2xl border border-white/5"
            style={{ aspectRatio: '3 / 2', background: '#0a0a0a' }}
          >
            {!homeBeaconImgFailed && (
              <img
                src="https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/brand-assets/home/drop-a-beacon.png"
                alt=""
                loading="lazy"
                onError={() => setHomeBeaconImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {homeBeaconImgFailed && (
              <>
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.95) 100%)',
                  }}
                />
                <div className="absolute left-5 top-6 text-[11px] tracking-[0.32em] font-bold text-white/90 select-none">
                  GHOSTED
                </div>
                <div
                  className="absolute left-5 right-5 top-1/3 text-white font-black uppercase leading-[0.95]"
                  style={{ fontSize: 'clamp(28px, 8vw, 48px)' }}
                >
                  Drop a<br />beacon.
                </div>
              </>
            )}
            {/* CTA overlay */}
            <button
              type="button"
              aria-label="Drop a Beacon"
              onClick={() => {
                trackEvent('home_cta_tap', { cta: 'drop_beacon_hero' });
                navigate('/pulse?drop=1');
              }}
              className="absolute left-[4%] w-[44%] h-[9%] active:bg-white/5 transition-colors"
              style={{ top: '57%', background: 'transparent' }}
            />
            <div
              className="absolute left-0 right-0 grid grid-cols-4"
              style={{ top: '76%', bottom: 0 }}
            >
              {[
                { label: 'Be seen — go live', action: handleGoLive, cta: 'be_seen' },
                { label: 'Find others', action: () => navigate('/ghosted'), cta: 'find_others' },
                { label: 'Make a move', action: () => navigate('/pulse'), cta: 'make_a_move' },
                { label: 'Stay in control', action: () => navigate('/safety'), cta: 'stay_in_control' },
              ].map(({ label, action, cta }) => (
                <button
                  key={cta}
                  type="button"
                  aria-label={label}
                  onClick={() => {
                    trackEvent('home_cta_tap', { cta });
                    action();
                  }}
                  className="w-full h-full active:bg-white/5 transition-colors"
                  style={{ background: 'transparent' }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 10. SAFETY NETWORK — below the fold (admin)                    */}
        {/* ================================================================ */}
        <section className="px-5 pb-2">
          <SafetyNetworkCard />
        </section>

        {/* ================================================================ */}
        {/* 11. CARE SUITE — doctrine: care outranks commerce              */}
        {/* ================================================================ */}
        <CareSuiteCard onOpen={() => setShowCareExplainer(true)} />

        {/* ================================================================ */}
        {/* 11b. HNH MESS PROMO — dismissible, MESS20, 7-day cooldown (Phil 2026-06-21) */}
        {/* ================================================================ */}
        <HnhMessPromoCard />

        {/* ================================================================ */}
        {/* 12. HNH MESS — commerce below care, always                     */}
        {/* ================================================================ */}
        <section className="px-5 pb-5">
          <div className="rounded-2xl overflow-hidden relative border border-white/10 p-5 bg-gradient-to-b from-[#1A1A1C] to-[#121214]">
            <div className="flex gap-4 mb-5">
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="hm-badge">HNH MESS</span>
                  {radioPlaying && (
                    <span className="hm-badge-outline" style={{ borderColor: TEAL, color: TEAL }}>
                      Live
                    </span>
                  )}
                </div>
                <h2 className="text-[20px] font-medium text-white leading-[1.05] mb-2 tracking-tight block">
                  Care hits different<br />when it's dirty.
                </h2>
                <p className="text-white/50 text-[11px] font-medium leading-relaxed max-w-[140px]">
                  Lube. Aftercare. Radio. No shame. No pretending.
                </p>
              </div>
              <div className="w-32 h-44 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative shadow-2xl shadow-black bg-black">
                <img
                  src="/images/HNHMESS HERO.PNG"
                  alt="HNH MESS Lube"
                  className="w-full h-full object-cover object-[center_60%] opacity-90"
                />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              </div>
            </div>

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

            <div className="flex items-center gap-3 mb-5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  trackEvent('home_cta_tap', { cta: 'hnh_mess_get_messy' });
                  navigate('/market');
                }}
                className="flex-1 bg-white/5 border border-white/10 text-white font-medium text-xs h-12 rounded-xl flex items-center justify-center gap-1.5"
              >
                Get the products <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => openSheet('cart')}
                className="flex-shrink-0 w-12 h-12 bg-[#C8962C] text-black rounded-xl flex items-center justify-center shadow-lg shadow-[#C8962C]/20"
              >
                <ShoppingBag className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex items-end justify-between pt-4 border-t border-white/10">
              <p className="text-white/70 text-[10px] font-medium tracking-wide italic">
                You don't get to skip aftercare.
              </p>
              <div className="flex items-center gap-1 text-[#C8962C] text-[9px] font-medium uppercase tracking-widest text-right">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8962C] animate-pulse" />
                First run.
              </div>
            </div>
          </div>
        </section>

        {/* Bottom spacer for home indicator */}
        <div style={{ height: 24 }} />

      </div>

      {/* ── Right Now Modal ────────────────────────────────────────────────── */}
      {showRightNow && <RightNowModal onClose={() => setShowRightNow(false)} />}

      {/* ── Care Suite explainer overlay ──────────────────────────────────── */}
      {showCareExplainer && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowCareExplainer(false)}
        >
          <div
            className="w-full sm:max-w-md bg-[#0a0a0c] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/10 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
          >
            <CareSuiteExplainer
              onSetup={() => {
                setShowCareExplainer(false);
                window.location.href = '/safety';
              }}
              onClose={() => setShowCareExplainer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
