/**
 * HomeMode -- Dashboard (route: /)
 *
 * The default landing screen after login. A scrollable OS dashboard that
 * surfaces live/real-time nightlife activity across 6 sections:
 *
 *   1. Top bar -- City selector + wordmark + notification bell
 *   2. Right Now strip -- Active users with intent pills
 *   3. Nearby Events -- Horizontal event cards from beacons VIEW
 *   4. Active Beacons -- Compact list of closest beacons
 *   5. From the Market -- 2-col grid of preloved listings
 *   6. Radio banner -- Live radio with waveform animation
 *
 * Data: TanStack Query (useQuery) for all fetches.
 * Animation: Framer Motion staggered fade-up on mount.
 * Loading: Skeleton loaders (not spinners).
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin,
  ChevronDown,
  Bell,
  Zap,
  ChevronRight,
  Flame,
  Star,
  Play,
  Pause,
  Radio,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useRadio } from '@/contexts/RadioContext';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { supabase } from '@/components/utils/supabaseClient';
import { format, isToday, isTomorrow } from 'date-fns';
import RightNowModal from '@/components/globe/RightNowModal';
import '@/styles/radio-waveform.css';

interface HomeModeProps {
  className?: string;
}

// ---- Brand constants --------------------------------------------------------
const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';
const ROOT_BG = '#050507';
const MUTED = '#8E8E93';

// ---- Intent color mapping ---------------------------------------------------
const INTENT_COLORS: Record<string, { bg: string; text: string }> = {
  hookup:  { bg: AMBER, text: '#000' },
  hang:    { bg: '#7C3AED', text: '#fff' },
  explore: { bg: '#14B8A6', text: '#fff' },
};

function getIntentStyle(intent: string) {
  return INTENT_COLORS[intent?.toLowerCase()] ?? { bg: AMBER, text: '#000' };
}

// ---- Date formatting helpers ------------------------------------------------
function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return 'Tonight';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE d MMM');
}

// ---- Section animation wrapper ----------------------------------------------
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

function AnimatedSection({
  index,
  children,
  className = '',
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      custom={index}
      initial="hidden"
      animate="visible"
      variants={sectionVariants}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ---- Section header ---------------------------------------------------------
function SectionHeader({
  title,
  linkLabel,
  onLink,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-white font-bold text-base">{title}</h2>
      {linkLabel && onLink && (
        <button
          onClick={onLink}
          className="flex items-center gap-0.5 text-xs font-semibold active:opacity-70 transition-opacity"
          style={{ color: AMBER }}
        >
          {linkLabel}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ---- Skeleton primitives ----------------------------------------------------
function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

function RightNowSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
          <ShimmerBox className="w-14 h-14 rounded-full" />
          <ShimmerBox className="w-12 h-3" />
          <ShimmerBox className="w-10 h-4 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EventCardSkeleton() {
  return (
    <div className="w-[260px] flex-shrink-0">
      <div className={`rounded-2xl overflow-hidden border border-white/5`} style={{ background: CARD_BG }}>
        <ShimmerBox className="w-full h-36 rounded-none" />
        <div className="p-3 space-y-2">
          <ShimmerBox className="w-3/4 h-4" />
          <ShimmerBox className="w-1/2 h-3" />
          <ShimmerBox className="w-20 h-5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function BeaconRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ShimmerBox className="w-9 h-9 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <ShimmerBox className="w-2/3 h-4" />
        <ShimmerBox className="w-1/3 h-3" />
      </div>
      <ShimmerBox className="w-12 h-3" />
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className={`rounded-2xl overflow-hidden border border-white/5`} style={{ background: CARD_BG }}>
      <ShimmerBox className="w-full aspect-square rounded-none" />
      <div className="p-3 space-y-2">
        <ShimmerBox className="w-3/4 h-3.5" />
        <ShimmerBox className="w-1/3 h-4" />
      </div>
    </div>
  );
}

// ---- Right Now card ---------------------------------------------------------
function RightNowCard({
  avatarUrl,
  name,
  intent,
  onTap,
}: {
  avatarUrl?: string;
  name: string;
  intent: string;
  onTap: () => void;
}) {
  const style = getIntentStyle(intent);
  return (
    <button
      onClick={onTap}
      className="w-20 flex-shrink-0 snap-start flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
      aria-label={`View ${name}'s profile`}
    >
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-14 h-14 rounded-full object-cover border-2"
            style={{ borderColor: style.bg }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center border-2"
            style={{ borderColor: style.bg, background: `${style.bg}20` }}
          >
            <span className="font-black text-lg" style={{ color: style.bg }}>
              {name[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}
        {/* Online dot */}
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#34C759] rounded-full border-2 border-[#050507]" />
      </div>
      <span className="text-white text-[11px] font-medium truncate w-full text-center leading-tight">
        {name}
      </span>
      <span
        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full leading-tight"
        style={{ background: style.bg, color: style.text }}
      >
        {intent}
      </span>
    </button>
  );
}

// ---- Right Now empty state --------------------------------------------------
function RightNowEmpty({ onGoLive }: { onGoLive: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 px-4 rounded-2xl border border-dashed border-white/10" style={{ background: `${CARD_BG}80` }}>
      <Zap className="w-10 h-10 mb-2" style={{ color: MUTED }} />
      <p className="text-white text-sm font-semibold mb-1">Be first to share your vibe tonight</p>
      <p className="text-xs mb-3" style={{ color: MUTED }}>Let people nearby know you're out</p>
      <button
        onClick={onGoLive}
        className="h-10 px-5 rounded-full font-bold text-sm flex items-center gap-1.5 active:scale-95 transition-transform"
        style={{ background: AMBER, color: '#000' }}
      >
        <Zap className="w-3.5 h-3.5" />
        Go Live
      </button>
    </div>
  );
}

// ---- Event card -------------------------------------------------------------
function EventCard({
  title,
  imageUrl,
  venue,
  startsAt,
  onTap,
}: {
  title: string;
  imageUrl?: string;
  venue?: string;
  startsAt?: string;
  onTap: () => void;
}) {
  const datePill = formatShortDate(startsAt);
  return (
    <button
      onClick={onTap}
      className="w-[260px] flex-shrink-0 snap-start text-left active:scale-[0.98] transition-transform rounded-2xl overflow-hidden border border-white/5"
      style={{ background: CARD_BG }}
      aria-label={`View event: ${title}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 flex items-center justify-center" style={{ background: `${AMBER}15` }}>
          <Calendar className="w-10 h-10" style={{ color: `${AMBER}60` }} />
        </div>
      )}
      <div className="p-3">
        <p className="text-white font-bold text-sm leading-tight line-clamp-1 mb-1">{title}</p>
        {venue && (
          <p className="text-xs leading-tight mb-2 line-clamp-1" style={{ color: MUTED }}>
            {venue}
          </p>
        )}
        {datePill && (
          <span
            className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${AMBER}20`, color: AMBER }}
          >
            {datePill}
          </span>
        )}
      </div>
    </button>
  );
}

// ---- Beacon row -------------------------------------------------------------
const BEACON_ICONS: Record<string, typeof Flame> = {
  event: Calendar,
  social: Star,
  default: Flame,
};

function BeaconRow({
  title,
  kind,
  distance,
  isLast,
  onTap,
}: {
  title: string;
  kind?: string;
  distance?: string;
  isLast: boolean;
  onTap: () => void;
}) {
  const Icon = BEACON_ICONS[kind ?? ''] ?? BEACON_ICONS.default;
  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors ${
        !isLast ? 'border-b border-white/5' : ''
      }`}
      aria-label={`View beacon: ${title}`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${AMBER}15` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: AMBER }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{title}</p>
      </div>
      {distance && (
        <span className="text-xs font-medium flex-shrink-0" style={{ color: MUTED }}>
          {distance}
        </span>
      )}
    </button>
  );
}

// ---- Product card -----------------------------------------------------------
function ProductCard({
  title,
  imageUrl,
  price,
  onTap,
}: {
  title: string;
  imageUrl?: string;
  price?: number;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="text-left active:scale-[0.98] transition-transform rounded-2xl overflow-hidden border border-white/5"
      style={{ background: CARD_BG }}
      aria-label={`View product: ${title}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center" style={{ background: `${AMBER}10` }}>
          <Sparkles className="w-8 h-8" style={{ color: `${AMBER}60` }} />
        </div>
      )}
      <div className="p-3">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2 mb-1">{title}</p>
        {price != null && (
          <p className="text-sm font-bold" style={{ color: AMBER }}>
            &pound;{price}
          </p>
        )}
      </div>
    </button>
  );
}

// ---- Radio banner -----------------------------------------------------------
function RadioBanner({ onNavigate }: { onNavigate: () => void }) {
  const { isPlaying, currentShowName, togglePlay } = useRadio();

  return (
    <div
      className="rounded-2xl border border-white/5 p-4 flex items-center gap-4 cursor-pointer"
      style={{ background: CARD_BG }}
      onClick={onNavigate}
      role="link"
      aria-label="Open HOTMESS Radio"
    >
      {/* Left: Radio icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${AMBER}15` }}
      >
        <Radio className="w-6 h-6" style={{ color: AMBER }} />
      </div>

      {/* Middle: Info + waveform */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-xs tracking-wider mb-0.5" style={{ color: AMBER }}>
          HOTMESS RADIO
        </p>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-[11px]">
            {currentShowName || 'Live now'}
          </span>
          {isPlaying && (
            <div className="waveform" style={{ height: 16 }}>
              <span className="waveform-bar" style={{ height: 6 }} />
              <span className="waveform-bar" style={{ height: 6 }} />
              <span className="waveform-bar" style={{ height: 6 }} />
              <span className="waveform-bar" style={{ height: 6 }} />
            </div>
          )}
        </div>
      </div>

      {/* Right: Play/Pause */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
        style={{ background: AMBER }}
        aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-black" />
        ) : (
          <Play className="w-5 h-5 text-black ml-0.5" />
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Main HomeMode Component
// =============================================================================
export function HomeMode({ className = '' }: HomeModeProps) {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const { unreadCount } = useUnreadCount();
  const queryClient = useQueryClient();
  const [city, setCity] = useState(() => localStorage.getItem('hm_city') || 'London');
  const [showRightNow, setShowRightNow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---- Pull-to-refresh state ------------------------------------------------
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current > 0 && scrollRef.current && scrollRef.current.scrollTop === 0) {
      pullDistance.current = e.touches[0].clientY - touchStartY.current;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 80 && !refreshing) {
      setRefreshing(true);
      queryClient.invalidateQueries().then(() => {
        setTimeout(() => setRefreshing(false), 600);
      });
    }
    touchStartY.current = 0;
    pullDistance.current = 0;
  }, [refreshing, queryClient]);

  // ---- City cycling ---------------------------------------------------------
  const handleCityTap = useCallback(() => {
    const CITIES = ['London', 'Berlin', 'New York'];
    const idx = CITIES.indexOf(city);
    const next = CITIES[(idx + 1) % CITIES.length];
    setCity(next);
    localStorage.setItem('hm_city', next);
  }, [city]);

  // ---- Data queries ---------------------------------------------------------

  // 1. Right Now status
  const {
    data: rightNowUsers = [],
    isLoading: rightNowLoading,
  } = useQuery({
    queryKey: ['home-right-now'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('right_now_status')
        .select('id, user_email, intent, active, location, expires_at')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        email: r.user_email as string,
        intent: (r.intent as string) || 'Explore',
        name: ((r.user_email as string) ?? '').split('@')[0] ?? 'Anon',
        avatarUrl: undefined as string | undefined,
      }));
    },
    refetchInterval: 30_000,
  });

  // 2. Nearby events from beacons VIEW
  const {
    data: nearbyEvents = [],
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, metadata, starts_at, end_at, lat, lng, kind')
        .gte('end_at', now)
        .order('starts_at', { ascending: true })
        .limit(8);
      if (error) throw error;
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        return {
          id: b.id as string,
          title: meta.title || meta.name || 'Event',
          imageUrl: meta.image_url || undefined,
          venue: meta.address || undefined,
          startsAt: b.starts_at as string,
          kind: b.kind as string,
        };
      });
    },
    refetchInterval: 60_000,
  });

  // 3. Active beacons (non-event, closest)
  const {
    data: activeBeacons = [],
    isLoading: beaconsLoading,
  } = useQuery({
    queryKey: ['home-beacons'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, metadata, starts_at, end_at, lat, lng, kind, intensity')
        .gte('end_at', now)
        .order('starts_at', { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        return {
          id: b.id as string,
          title: meta.title || 'Beacon',
          kind: b.kind as string,
          intensity: b.intensity as number,
        };
      });
    },
    refetchInterval: 60_000,
  });

  // 4. Preloved listings
  const {
    data: marketListings = [],
    isLoading: marketLoading,
  } = useQuery({
    queryKey: ['home-market'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preloved_listings')
        .select('id, title, price, images, category')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        title: (p.title as string) || 'Item',
        price: p.price as number,
        imageUrl: Array.isArray(p.images) ? (p.images[0] as string) : undefined,
      }));
    },
    refetchInterval: 120_000,
  });

  // ---- Render ---------------------------------------------------------------
  return (
    <div className={`h-full w-full flex flex-col overflow-hidden ${className}`} style={{ background: ROOT_BG }}>

      {/* ---- Top Bar (sticky, glassmorphic) ---- */}
      <header className="flex-shrink-0 z-20 flex items-center justify-between h-14 px-5" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* City pill */}
        <button
          onClick={handleCityTap}
          className="flex items-center gap-1 bg-white/[0.06] backdrop-blur-md rounded-full px-3 py-1.5 active:scale-95 transition-transform"
          aria-label={`Current city: ${city}. Tap to change.`}
        >
          <MapPin className="w-3.5 h-3.5" style={{ color: AMBER }} />
          <span className="text-white font-bold text-sm">{city}</span>
          <ChevronDown className="w-3 h-3 text-white/40" />
        </button>

        {/* Wordmark */}
        <h1
          className="text-base font-black tracking-[0.25em] uppercase select-none"
          style={{ color: AMBER }}
        >
          HOTMESS
        </h1>

        {/* Notification bell */}
        <button
          onClick={() => openSheet('notifications')}
          className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.06] active:scale-95 transition-transform"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-5 h-5 text-white/70" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full"
              style={{ background: AMBER }}
            />
          )}
        </button>
      </header>

      {/* ---- Pull-to-refresh indicator ---- */}
      {refreshing && (
        <div className="flex justify-center py-2">
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: AMBER, borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {/* ---- Scrollable content ---- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-5 pt-4 pb-36 space-y-6">

          {/* ── Section 1: Right Now ── */}
          <AnimatedSection index={0}>
            <SectionHeader
              title="Right Now"
              linkLabel="Go live"
              onLink={() => setShowRightNow(true)}
            />
            {rightNowLoading ? (
              <RightNowSkeleton />
            ) : rightNowUsers.length === 0 ? (
              <RightNowEmpty onGoLive={() => setShowRightNow(true)} />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                {rightNowUsers.map((u) => (
                  <RightNowCard
                    key={u.id}
                    avatarUrl={u.avatarUrl}
                    name={u.name}
                    intent={u.intent}
                    onTap={() => openSheet('profile', { email: u.email })}
                  />
                ))}
              </div>
            )}
          </AnimatedSection>

          {/* ── Section 2: Nearby Events ── */}
          {(eventsLoading || nearbyEvents.length > 0) && (
            <AnimatedSection index={1}>
              <SectionHeader
                title="Happening near you"
                linkLabel="See all"
                onLink={() => navigate('/pulse')}
              />
              {eventsLoading ? (
                <div className="flex gap-3 overflow-hidden">
                  <EventCardSkeleton />
                  <EventCardSkeleton />
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
                  {nearbyEvents.map((ev) => (
                    <EventCard
                      key={ev.id}
                      title={ev.title}
                      imageUrl={ev.imageUrl}
                      venue={ev.venue}
                      startsAt={ev.startsAt}
                      onTap={() => openSheet('event', { id: ev.id })}
                    />
                  ))}
                </div>
              )}
            </AnimatedSection>
          )}

          {/* ── Section 3: Active Beacons ── */}
          {(beaconsLoading || activeBeacons.length > 0) && (
            <AnimatedSection index={2}>
              <SectionHeader title="Active Beacons" />
              <div className="rounded-2xl overflow-hidden border border-white/5" style={{ background: CARD_BG }}>
                {beaconsLoading ? (
                  <>
                    <BeaconRowSkeleton />
                    <BeaconRowSkeleton />
                    <BeaconRowSkeleton />
                  </>
                ) : (
                  activeBeacons.map((b, i) => (
                    <BeaconRow
                      key={b.id}
                      title={b.title}
                      kind={b.kind}
                      isLast={i === activeBeacons.length - 1}
                      onTap={() => openSheet('beacon', { id: b.id })}
                    />
                  ))
                )}
              </div>
            </AnimatedSection>
          )}

          {/* ── Section 4: From the Market ── */}
          {(marketLoading || marketListings.length > 0) && (
            <AnimatedSection index={3}>
              <SectionHeader
                title="Fresh drops"
                linkLabel="Browse market"
                onLink={() => navigate('/market')}
              />
              {marketLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  <ProductCardSkeleton />
                  <ProductCardSkeleton />
                  <ProductCardSkeleton />
                  <ProductCardSkeleton />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {marketListings.map((p) => (
                    <ProductCard
                      key={p.id}
                      title={p.title}
                      imageUrl={p.imageUrl}
                      price={p.price}
                      onTap={() => openSheet('product', { id: p.id })}
                    />
                  ))}
                </div>
              )}
            </AnimatedSection>
          )}

          {/* ── Section 5: Radio Banner ── */}
          <AnimatedSection index={4}>
            <RadioBanner onNavigate={() => navigate('/radio')} />
          </AnimatedSection>

        </div>
      </div>

      {/* Right Now modal (existing) */}
      <RightNowModal isOpen={showRightNow} onClose={() => setShowRightNow(false)} />
    </div>
  );
}

export default HomeMode;
