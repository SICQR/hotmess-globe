/**
 * HomeMode -- Full-screen image-driven homepage (route: /)
 *
 * A cinematic vertical scroll of full-bleed image sections with gradient
 * overlays and bottom-anchored CTAs, interleaved with data-driven cards.
 *
 * Sections (in order):
 *   1. Hero — World Entry (hero-world.jpg)
 *   [profile nudge + Right Now + Core Lanes + Nearby Events — data cards]
 *   2. Pulse Panel (hero-pulse.jpg)
 *   3. HNH MESS — Product (hnh-primary.jpg)
 *   4. SMASH / Radio (smash-primary.jpg)
 *   5. HUNG — 2-col grid (hung-black.jpg + hung-white.jpg)
 *   6. Essentials (essentials-primary.jpg)
 *   7. Radio full-screen (hero-pulse.jpg reuse, dimmed)
 *   8. Care — Soft Exit (hnh-secondary.jpg)
 *   [Community posts — data cards]
 *
 * Data: TanStack Query (useQuery) for all fetches.
 * Animation: Framer Motion staggered fade-up on mount.
 * Loading: Skeleton loaders (not spinners).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ChevronDown,
  Bell,
  Zap,
  ChevronRight,
  Play,
  Pause,
  Radio,
  Calendar,
  Heart,
  Moon,
  Globe,
  Ghost,
  ShoppingBag,
  Music,
  Disc3,
  Headphones,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useRadio } from '@/contexts/RadioContext';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { supabase } from '@/components/utils/supabaseClient';
import { nanoid } from 'nanoid';
import { format, isToday, isTomorrow } from 'date-fns';
import RightNowModal from '@/components/globe/RightNowModal';
import { CardMoreButton } from '@/components/ui/CardMoreButton';
import { trackEvent } from '@/components/utils/analytics';
import { AppBanner } from '@/components/banners/AppBanner';
import '@/styles/radio-waveform.css';

interface HomeModeProps {
  className?: string;
}

// ---- Brand constants --------------------------------------------------------
const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';
const ROOT_BG = '#050507';
const MUTED = '#8E8E93';
const NIGHT_BEACON_KEY = 'hm_night_beacon_id';

// ---- Intent color mapping ---------------------------------------------------
const INTENT_COLORS: Record<string, { bg: string; text: string }> = {
  hookup:  { bg: AMBER, text: '#000' },
  hang:    { bg: '#D4A853', text: '#000' },
  explore: { bg: '#8E8E93', text: '#000' },
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
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-4 rounded-full" style={{ background: AMBER }} />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{title}</h2>
      </div>
      {linkLabel && onLink && (
        <button
          onClick={onLink}
          className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider active:opacity-70 transition-opacity"
          style={{ color: AMBER }}
        >
          {linkLabel}
          <ChevronRight className="w-3 h-3" />
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
      <div className="rounded-2xl overflow-hidden border border-white/5" style={{ background: CARD_BG }}>
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
  const [headline] = useState(() => EMPTY_HEADLINES[Math.floor(Math.random() * EMPTY_HEADLINES.length)]);
  return (
    <div className="flex flex-col items-center py-6 px-4 rounded-2xl border border-dashed border-white/10" style={{ background: `${CARD_BG}80` }}>
      <Zap className="w-10 h-10 mb-2" style={{ color: MUTED }} />
      <p className="text-white text-sm font-semibold mb-1">{headline}</p>
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
  id,
  title,
  imageUrl,
  venue,
  startsAt,
  onTap,
}: {
  id?: string;
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
      className="hm-depth hm-tap-lift w-[260px] flex-shrink-0 snap-start text-left rounded-xl overflow-hidden relative"
      aria-label={`View event: ${title}`}
    >
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 flex items-center justify-center" style={{ background: `${AMBER}15` }}>
            <Calendar className="w-10 h-10" style={{ color: `${AMBER}60` }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {datePill && (
          <span
            className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm"
            style={{ background: `${AMBER}dd`, color: '#000' }}
          >
            {datePill}
          </span>
        )}
        {id && <CardMoreButton itemType="event" itemId={id} title={title} className="absolute top-2.5 right-2.5" />}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-bold text-sm leading-tight line-clamp-1 drop-shadow-lg">{title}</p>
          {venue && (
            <p className="text-white/60 text-xs leading-tight mt-0.5 line-clamp-1 drop-shadow">
              {venue}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Pulse-driven headline pools (tone = f(live state)) ──────────────────────
const HERO_TONES = {
  high: [
    "Who's out. Who's up. Who's next.",
    'The city is moving. Are you?',
    "Tonight's already started.",
    'Find trouble. Or be it.',
  ],
  mid: [
    'Right place. Wrong decisions.',
    'Stay messy.',
    'Always too much, yet never enough.',
    'Something\u2019s brewing.',
  ],
  low: [
    'Quiet night. Make it loud.',
    'First ones out always win.',
    'Own the silence.',
    'Be the reason it gets interesting.',
  ],
} as const;

type PulseTone = keyof typeof HERO_TONES;

/** Derive headline tone from live Pulse state */
function deriveTone(liveUsers: number, nearbyUsers: number): PulseTone {
  if (liveUsers > 0) return 'high';
  if (nearbyUsers > 0) return 'mid';
  return 'low';
}

// ── Right Now empty state urgency variants ───────────────────────────────────
const EMPTY_HEADLINES = [
  "No one's live. Own it.",
  'Quiet\u2026 for now.',
  'You could start this.',
  'Be first to share your vibe tonight.',
  "The night's waiting. Are you?",
] as const;

// ---- Core Lanes (2x2 nav grid) ----------------------------------------------
const CORE_LANES = [
  { label: 'Pulse', sub: "See who's around", icon: Globe, route: '/ghosted' },
  { label: 'Ghosted', sub: 'Browse low-key', icon: Ghost, route: '/ghosted' },
  { label: 'Market', sub: 'Shop HNH + more', icon: ShoppingBag, route: '/market' },
  { label: 'Music', sub: "What's playing now", icon: Music, route: '/music' },
] as const;

function CoreLanes({
  onNavigate,
  signals,
  tone,
}: {
  onNavigate: (route: string) => void;
  signals: Record<string, string>;
  tone: PulseTone;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CORE_LANES.map((lane) => {
        const Icon = lane.icon;
        const signal = signals[lane.label];
        return (
          <button
            key={lane.label}
            onClick={() => { trackEvent('home_lane_tap', { lane: lane.label, tone, signal: signal || 'none' }); onNavigate(lane.route); }}
            className="hm-depth hm-tap-lift flex flex-col items-start gap-2 rounded-2xl p-4 text-left"
            aria-label={`${lane.label}: ${lane.sub}`}
          >
            <div className="flex items-center justify-between w-full">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${AMBER}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: AMBER }} />
              </div>
              {signal && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${AMBER}15`, color: AMBER }}>
                  {signal}
                </span>
              )}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{lane.label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{lane.sub}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---- Full-screen image section component ------------------------------------
const IMAGE_GRADIENT = 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0) 70%)';

function ImageSection({
  imageSrc,
  imageStyle,
  children,
  className = '',
  minHeight = '100vh',
}: {
  imageSrc: string;
  imageStyle?: React.CSSProperties;
  children: React.ReactNode;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ minHeight }}>
      <div className="absolute inset-0">
        <img
          src={imageSrc}
          alt=""
          className="w-full h-full object-cover"
          style={imageStyle}
          loading="lazy"
        />
      </div>
      <div className="absolute inset-0" style={{ background: IMAGE_GRADIENT }} />
      <div className="relative z-10 flex flex-col justify-end h-full min-h-[inherit] px-5 pb-12">
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Main HomeMode Component
// =============================================================================
export default function HomeMode({ className = '' }: HomeModeProps) {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const { unreadCount } = useUnreadCount();
  const { profile } = useBootGuard();
  const queryClient = useQueryClient();

  // Profile nudge -- shown once per session if user completed onboarding but has no avatar/bio/display_name
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try { return !!sessionStorage.getItem('hm_nudge_dismissed'); } catch { return false; }
  });
  const dismissNudge = () => {
    try { sessionStorage.setItem('hm_nudge_dismissed', '1'); } catch { /* noop */ }
    setNudgeDismissed(true);
  };
  const showProfileNudge =
    !nudgeDismissed &&
    profile?.onboarding_completed &&
    (!profile?.avatar_url || !profile?.bio || !profile?.display_name);
  const [city, setCity] = useState(() => localStorage.getItem('hm_city') || 'London');
  const [showRightNow, setShowRightNow] = useState(false);
  const [nightMode, setNightMode] = useState(() => localStorage.getItem('hm_night_mode') === 'true');
  const [nightModeBeaconId, setNightModeBeaconId] = useState<string | null>(
    () => localStorage.getItem(NIGHT_BEACON_KEY) || null
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---- Pull-to-refresh -------------------------------------------------------
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  // ---- City picker ----------------------------------------------------------
  const [showCityPicker, setShowCityPicker] = useState(false);
  const CITIES = ['London', 'Berlin', 'New York'];
  const handleCityTap = useCallback(() => setShowCityPicker(true), []);
  const selectCity = useCallback((c: string) => {
    setCity(c);
    localStorage.setItem('hm_city', c);
    setShowCityPicker(false);
  }, []);

  // ---- Night Mode toggle ----------------------------------------------------
  const toggleNightMode = useCallback(async () => {
    const next = !nightMode;
    setNightMode(next);
    localStorage.setItem('hm_night_mode', String(next));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (next) {
        void supabase.from('user_presence').upsert({
          user_id: user.id,
          status: 'online',
          last_seen_at: new Date().toISOString(),
          metadata: { night_mode: true },
        }, { onConflict: 'user_id' }).catch(() => {});

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { data: beacon } = await supabase.from('beacons').insert({
                code: nanoid(8),
                type: 'checkin',
                beacon_category: 'user',
                owner_id: user.id,
                title: 'Night Mode',
                status: 'active',
                active: true,
                geo_lat: pos.coords.latitude,
                geo_lng: pos.coords.longitude,
                city_slug: city.toLowerCase().replace(/\s+/g, '_'),
                starts_at: new Date().toISOString(),
                ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                globe_color: '#C8962C',
                globe_pulse_type: 'standard',
                globe_size_base: 1.0,
                intensity: 3,
              }).select('id').single().catch(() => ({ data: null }));
              if (beacon?.id) {
                setNightModeBeaconId(beacon.id);
                localStorage.setItem(NIGHT_BEACON_KEY, beacon.id);
              }
            },
            () => {},
            { enableHighAccuracy: false, timeout: 5000 },
          );
        }
      } else {
        void supabase.from('user_presence').upsert({
          user_id: user.id,
          status: 'offline',
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).catch(() => {});

        const beaconId = nightModeBeaconId || localStorage.getItem(NIGHT_BEACON_KEY);
        if (beaconId) {
          void supabase.from('beacons')
            .update({ status: 'expired' })
            .eq('id', beaconId)
            .catch(() => {});
        }
        setNightModeBeaconId(null);
        localStorage.removeItem(NIGHT_BEACON_KEY);
      }
    } catch {
      // non-critical
    }
  }, [nightMode, nightModeBeaconId, city]);

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
        .select('id, user_id, intent, location, expires_at')
        .gte('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        userId: r.user_id as string,
        intent: (r.intent as string) || 'Explore',
        name: 'Anon',
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
        .select('id, metadata, starts_at, ends_at, kind, type')
        .gte('ends_at', now)
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
          kind: (b.kind as string) || (b.type as string),
        };
      });
    },
    refetchInterval: 60_000,
  });

  // 3. Community posts preview (3 most recent)
  const {
    data: communityPosts = [],
  } = useQuery({
    queryKey: ['home-community'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, user_name, content, category, like_count, created_at')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  // 4. Latest music drop (newest active release)
  const { data: latestDrop } = useQuery({
    queryKey: ['home-latest-drop'],
    queryFn: async () => {
      const { data } = await supabase
        .from('label_releases')
        .select('id, title, artwork_url, preview_url, catalog_number, release_type, genre, bpm')
        .eq('is_active', true)
        .order('release_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 300_000,
  });

  // ── Pulse state -> tone -> headline rotation ─────────────────────────────────
  const { isPlaying: radioPlaying, currentShowName, togglePlay } = useRadio();
  const tone = deriveTone(rightNowUsers.length, nearbyEvents.length);
  const headlines = HERO_TONES[tone];
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => { setHeroIdx(0); }, [tone]);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % headlines.length), 6000);
    return () => clearInterval(t);
  }, [headlines.length]);

  // ── Live signals for Core Lanes ──
  const laneSignals: Record<string, string> = {};
  if (rightNowUsers.length > 0) laneSignals['Pulse'] = `${rightNowUsers.length} nearby`;
  if (rightNowUsers.length === 0) laneSignals['Ghosted'] = 'Quiet tonight';
  if (rightNowUsers.length > 3) laneSignals['Ghosted'] = `${rightNowUsers.length} lurking`;
  if (radioPlaying) laneSignals['Music'] = 'Live now';

  // ---- Render ---------------------------------------------------------------
  return (
    <div className={`h-full w-full flex flex-col overflow-hidden ${className}`} style={{ background: ROOT_BG }}>

      {/* ---- Top Bar (sticky, noir glass) ---- */}
      <header className="flex-shrink-0 z-20 flex items-center justify-between h-14 px-5 border-b border-white/[0.04]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
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
        <h1 className="text-base font-black tracking-[0.25em] uppercase select-none">
          <span className="text-white">HOT</span><span style={{ color: AMBER }}>MESS</span>
        </h1>

        {/* Night Mode toggle */}
        <button
          onClick={toggleNightMode}
          className={`relative w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all ${
            nightMode ? 'bg-[#C8962C]/20 ring-1 ring-[#C8962C]/40' : 'bg-white/[0.06]'
          }`}
          aria-label={nightMode ? 'Night Mode ON' : 'Night Mode OFF'}
        >
          <Moon className="w-5 h-5" style={{ color: nightMode ? '#C8962C' : 'rgba(255,255,255,0.5)' }} />
        </button>

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
      {isRefreshing && (
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
        className="flex-1 overflow-y-auto scroll-momentum"
        style={{ WebkitOverflowScrolling: 'touch' }}
        {...pullHandlers}
      >
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        <div className="pb-36">

          {/* ================================================================ */}
          {/* SECTION 1: HERO -- WORLD ENTRY                                   */}
          {/* ================================================================ */}
          <ImageSection
            imageSrc="/images/home/hero-world.jpg"
            imageStyle={{ objectPosition: '55% 30%', transform: 'scale(1.35)' }}
          >
            <h2 className="font-black text-4xl tracking-[0.15em] uppercase leading-none drop-shadow-lg">
              <span className="text-white">HOT</span><span style={{ color: AMBER }}>MESS</span>
            </h2>
            <AnimatePresence mode="wait">
              <motion.p
                key={`${tone}-${heroIdx}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4 }}
                className="text-white/60 text-sm mt-2 tracking-wide"
              >
                {headlines[heroIdx]}
              </motion.p>
            </AnimatePresence>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { trackEvent('home_cta_tap', { cta: 'open_pulse', tone, live_users: rightNowUsers.length }); navigate('/pulse'); }}
                className="h-12 px-6 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform"
                style={{ background: AMBER, color: '#000' }}
              >
                <Globe className="w-4 h-4" />
                Open Pulse
              </button>
              <button
                onClick={() => { trackEvent('home_cta_tap', { cta: 'go_live', tone, live_users: rightNowUsers.length }); setShowRightNow(true); }}
                className="h-12 px-6 rounded-xl text-sm font-bold flex items-center gap-2 border border-white/20 text-white active:scale-95 transition-transform active:bg-white/10"
              >
                <Zap className="w-4 h-4" style={{ color: AMBER }} />
                Go Live
              </button>
            </div>
          </ImageSection>

          {/* ================================================================ */}
          {/* MUSIC + PULSE BLOCKS (per brief: music at top of homepage)       */}
          {/* ================================================================ */}
          <div className="px-5 pt-6 pb-2 space-y-3" style={{ background: ROOT_BG }}>

            {/* BLOCK 1: LIVE NOW — HOTMESS RADIO */}
            <button
              onClick={() => { trackEvent('home_cta_tap', { cta: 'radio_live', tone }); togglePlay(); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all border"
              style={{ background: 'rgba(0,194,224,0.06)', borderColor: 'rgba(0,194,224,0.15)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,194,224,0.15)' }}>
                {radioPlaying ? (
                  <Pause className="w-5 h-5" style={{ color: '#00C2E0' }} />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" style={{ color: '#00C2E0' }} />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black uppercase text-white tracking-wide">HOTMESS RADIO</p>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30D158] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30D158]" />
                  </span>
                </div>
                <p className="text-[11px] text-white/40 mt-0.5">{currentShowName || 'Live now'}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: '#00C2E0', color: '#000' }}>
                {radioPlaying ? 'Playing' : 'Listen'}
              </span>
            </button>

            {/* BLOCK 2: DROP LIVE — latest release */}
            {latestDrop && (
              <button
                onClick={() => { trackEvent('home_cta_tap', { cta: 'drop_live', tone }); navigate('/music'); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all border"
                style={{ background: 'rgba(155,27,42,0.06)', borderColor: 'rgba(155,27,42,0.15)' }}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
                  {latestDrop.artwork_url ? (
                    <img src={latestDrop.artwork_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-5 h-5 text-[#9B1B2A]/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9B1B2A' }}>Drop Live</p>
                  </div>
                  <p className="text-sm font-bold text-white truncate mt-0.5">{latestDrop.title}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Smash Daddys · {latestDrop.catalog_number}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: AMBER, color: '#000' }}>
                  {latestDrop.preview_url ? 'Play' : 'View'}
                </span>
              </button>
            )}

            {/* BLOCK 3: WHAT'S MOVING — Pulse */}
            <button
              onClick={() => { trackEvent('home_cta_tap', { cta: 'whats_moving', tone }); navigate('/pulse'); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl active:scale-[0.98] transition-all border"
              style={{ background: `${AMBER}08`, borderColor: `${AMBER}15` }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${AMBER}15` }}>
                <Globe className="w-5 h-5" style={{ color: AMBER }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-black uppercase text-white tracking-wide">What's Moving</p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {rightNowUsers.length > 0 ? `${rightNowUsers.length} people nearby` : 'See who\'s around'}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: AMBER, color: '#000' }}>
                Pulse
              </span>
            </button>
          </div>

          {/* ================================================================ */}
          {/* DATA CARDS: Profile nudge + Right Now + Core Lanes + Events      */}
          {/* ================================================================ */}
          <div className="px-5 py-6 space-y-6" style={{ background: ROOT_BG }}>

            {/* Profile nudge */}
            {showProfileNudge && (
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(200,150,44,0.12)', border: '1px solid rgba(200,150,44,0.2)' }}
              >
                <span className="text-white/70 text-sm flex-1">Add a photo and bio to get more matches</span>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-xs font-bold flex-shrink-0 px-3 py-1.5 rounded-lg"
                  style={{ background: AMBER, color: '#000' }}
                >
                  Complete profile
                </button>
                <button
                  onClick={dismissNudge}
                  className="text-white/30 text-base leading-none flex-shrink-0"
                  aria-label="Dismiss"
                >
                  &#x2715;
                </button>
              </div>
            )}

            {/* Right Now */}
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
                      onTap={() => openSheet('profile', { userId: u.userId })}
                    />
                  ))}
                </div>
              )}
            </AnimatedSection>

            {/* Core Lanes */}
            <AnimatedSection index={1}>
              <CoreLanes onNavigate={(route) => navigate(route)} signals={laneSignals} tone={tone} />
            </AnimatedSection>

            {/* App Banner */}
            <AppBanner placement="home_strip" variant="strip" />

            {/* Nearby Events */}
            {(eventsLoading || nearbyEvents.length > 0) && (
              <AnimatedSection index={2}>
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
                        id={ev.id}
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
          </div>

          {/* ================================================================ */}
          {/* SECTION 2: PULSE PANEL                                           */}
          {/* ================================================================ */}
          <ImageSection
            imageSrc="/images/home/hero-pulse.jpg"
            imageStyle={{ objectPosition: '50% 60%', transform: 'scale(1.3)' }}
          >
            <p
              className="font-black text-2xl tracking-[0.3em] uppercase"
              style={{ color: AMBER }}
            >
              PULSE
            </p>
            <p className="text-white/50 text-sm mt-1.5">
              See who's around &middot; Live map &middot; Real-time
            </p>
            <button
              onClick={() => { trackEvent('home_cta_tap', { cta: 'enter_pulse', tone }); navigate('/pulse'); }}
              className="mt-5 h-12 px-8 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform self-start"
              style={{ background: AMBER, color: '#000' }}
            >
              <Globe className="w-4 h-4" />
              Enter Pulse
            </button>
          </ImageSection>

          {/* ================================================================ */}
          {/* SECTION 3: HNH MESS -- PRIMARY PRODUCT                           */}
          {/* ================================================================ */}
          <ImageSection
            imageSrc="/images/home/hnh-primary.jpg"
            imageStyle={{ objectPosition: '70% 30%', transform: 'scale(1.1)' }}
          >
            <p className="font-black text-xs tracking-[0.25em] uppercase" style={{ color: AMBER }}>
              HNH MESS
            </p>
            <p className="text-white font-bold text-2xl leading-tight mt-1">
              Premium water-based lube
            </p>
            <p className="text-white/50 text-sm mt-1.5">
              50ML &middot; &pound;10 &nbsp;/&nbsp; 250ML &middot; &pound;15
            </p>
            <button
              onClick={() => { trackEvent('home_cta_tap', { cta: 'shop_hnh', tone }); navigate('/market'); }}
              className="mt-5 h-12 px-8 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform self-start"
              style={{ background: AMBER, color: '#000' }}
            >
              <ShoppingBag className="w-4 h-4" />
              Shop HNH MESS
            </button>
          </ImageSection>

          {/* ================================================================ */}
          {/* SECTION 4: SMASH / RADIO                                         */}
          {/* ================================================================ */}
          <ImageSection
            imageSrc="/images/home/smash-primary.jpg"
            imageStyle={{ objectPosition: '50% 45%', transform: 'scale(1.3)' }}
          >
            <p className="font-black text-xs tracking-[0.25em] uppercase" style={{ color: '#9B1B2A' }}>
              RAW CONVICT RECORDS
            </p>
            <p className="text-white font-bold text-xl leading-tight mt-1">
              SMASH DADDYS
            </p>
            <p className="text-white/50 text-sm mt-1">
              Music &middot; Radio &middot; Live
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => { trackEvent('home_cta_tap', { cta: 'listen_now', tone }); navigate('/music'); togglePlay(); }}
                className="h-12 px-6 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform"
                style={{ background: AMBER, color: '#000' }}
              >
                {radioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                Listen Now
              </button>
              {radioPlaying && (
                <div className="waveform" style={{ height: 20 }}>
                  <span className="waveform-bar" style={{ height: 8 }} />
                  <span className="waveform-bar" style={{ height: 8 }} />
                  <span className="waveform-bar" style={{ height: 8 }} />
                  <span className="waveform-bar" style={{ height: 8 }} />
                </div>
              )}
            </div>
          </ImageSection>

          {/* ================================================================ */}
          {/* SECTION 5: HUNG -- 2-COLUMN GRID                                 */}
          {/* ================================================================ */}
          <div className="px-5 py-10" style={{ background: ROOT_BG }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-xl tracking-[0.2em] uppercase" style={{ color: '#C41230' }}>
                HUNG
              </p>
              <button
                onClick={() => { trackEvent('home_cta_tap', { cta: 'shop_hung', tone }); navigate('/market'); }}
                className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider active:opacity-70 transition-opacity"
                style={{ color: '#C41230' }}
              >
                Shop HUNG
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/market')}
                className="rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
                style={{ background: '#000', padding: 16 }}
                aria-label="HUNG Black collection"
              >
                <img
                  src="/images/home/hung-black.jpg"
                  alt="HUNG Black"
                  className="w-full aspect-[3/4] rounded-xl"
                  style={{ objectFit: 'contain', background: '#000' }}
                  loading="lazy"
                />
              </button>
              <button
                onClick={() => navigate('/market')}
                className="rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
                style={{ background: '#000', padding: 16 }}
                aria-label="HUNG White collection"
              >
                <img
                  src="/images/home/hung-white.jpg"
                  alt="HUNG White"
                  className="w-full aspect-[3/4] rounded-xl"
                  style={{ objectFit: 'contain', background: '#000' }}
                  loading="lazy"
                />
              </button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* SECTION 6: ESSENTIALS                                            */}
          {/* ================================================================ */}
          <ImageSection
            imageSrc="/images/home/essentials-primary.jpg"
            imageStyle={{
              objectPosition: '50% 35%',
              transform: 'scale(1.4)',
              filter: 'brightness(0.85) contrast(1.1)',
            }}
          >
            <p className="font-black text-2xl tracking-[0.2em] uppercase text-white">
              ESSENTIALS
            </p>
            <p className="text-white/50 text-sm mt-1">
              Elevated basics
            </p>
            <button
              onClick={() => { trackEvent('home_cta_tap', { cta: 'browse_essentials', tone }); navigate('/market'); }}
              className="mt-5 h-12 px-8 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform self-start"
              style={{ background: AMBER, color: '#000' }}
            >
              Browse
            </button>
          </ImageSection>

          {/* ================================================================ */}
          {/* SECTION 7: RADIO (full-screen reuse of pulse crop)               */}
          {/* ================================================================ */}
          <ImageSection
            imageSrc="/images/home/hero-pulse.jpg"
            imageStyle={{ objectPosition: '65% 40%', transform: 'scale(1.6)', opacity: 0.4 }}
          >
            <p className="font-black text-xs tracking-[0.25em] uppercase" style={{ color: '#00C2E0' }}>
              HOTMESS RADIO
            </p>
            <p className="text-white font-bold text-xl leading-tight mt-1">
              {currentShowName || 'Live now'}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              {radioPlaying && (
                <div className="waveform" style={{ height: 20 }}>
                  <span className="waveform-bar" style={{ height: 8, background: '#00C2E0' }} />
                  <span className="waveform-bar" style={{ height: 8, background: '#00C2E0' }} />
                  <span className="waveform-bar" style={{ height: 8, background: '#00C2E0' }} />
                  <span className="waveform-bar" style={{ height: 8, background: '#00C2E0' }} />
                </div>
              )}
              <span className="text-white/40 text-sm">
                {radioPlaying ? 'Streaming live' : 'Tap to tune in'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                style={{ background: '#00C2E0' }}
                aria-label={radioPlaying ? 'Pause radio' : 'Play radio'}
              >
                {radioPlaying ? (
                  <Pause className="w-5 h-5 text-black" />
                ) : (
                  <Play className="w-5 h-5 text-black ml-0.5" />
                )}
              </button>
              <button
                onClick={() => navigate('/radio')}
                className="h-12 px-6 rounded-xl text-sm font-bold flex items-center gap-2 border text-white active:scale-95 transition-transform active:bg-white/10"
                style={{ borderColor: 'rgba(0,194,224,0.3)' }}
              >
                <Radio className="w-4 h-4" style={{ color: '#00C2E0' }} />
                Full Player
              </button>
            </div>
          </ImageSection>

          {/* ================================================================ */}
          {/* SECTION 8: CARE -- SOFT EXIT                                     */}
          {/* ================================================================ */}
          <ImageSection
            imageSrc="/images/home/hnh-secondary.jpg"
            imageStyle={{ objectPosition: '50% 65%', transform: 'scale(1.2)', opacity: 0.85 }}
          >
            <p className="font-black text-xl tracking-[0.2em] uppercase text-white">
              HAND N HAND
            </p>
            <p className="text-white/50 text-sm mt-1">
              Aftercare &middot; Wellbeing &middot; Support
            </p>
            <button
              onClick={() => { trackEvent('home_cta_tap', { cta: 'enter_care', tone }); navigate('/care'); }}
              className="mt-5 h-12 px-8 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-transform self-start"
              style={{ background: AMBER, color: '#000' }}
            >
              Enter Care
            </button>
          </ImageSection>

          {/* ================================================================ */}
          {/* COMMUNITY POSTS (data-driven, at the very end)                   */}
          {/* ================================================================ */}
          {communityPosts.length > 0 && (
            <div className="px-5 py-6" style={{ background: ROOT_BG }}>
              <AnimatedSection index={6}>
                <SectionHeader
                  title="Community"
                  linkLabel="See all"
                  onLink={() => openSheet('community', {})}
                />
                <div className="rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5" style={{ background: CARD_BG }}>
                  {communityPosts.map((post: Record<string, unknown>) => (
                    <button
                      key={post.id as string}
                      onClick={() => openSheet('community', {})}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${AMBER}20` }}>
                        <span className="text-[11px] font-black" style={{ color: AMBER }}>
                          {((post.user_name as string) || 'A')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-sm leading-snug line-clamp-2">{post.content as string}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs" style={{ color: MUTED }}>{post.user_name as string || 'Anonymous'}</span>
                          {(post.like_count as number) > 0 && (
                            <span className="flex items-center gap-0.5 text-xs" style={{ color: MUTED }}>
                              <Heart className="w-3 h-3" />{post.like_count as number}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => openSheet('community', {})}
                    className="w-full px-4 py-3 text-left text-xs font-semibold active:bg-white/5 transition-colors flex items-center justify-between"
                    style={{ color: AMBER }}
                  >
                    View all posts
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </AnimatedSection>
            </div>
          )}

        </div>
      </div>

      {/* City Picker */}
      <AnimatePresence>
        {showCityPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center"
            onClick={() => setShowCityPicker(false)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full max-w-md rounded-t-2xl p-6 pb-10"
              style={{ background: '#1C1C1E' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#8E8E93' }}>Select city</p>
              <div className="space-y-1">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => selectCity(c)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-colors"
                    style={{
                      background: c === city ? 'rgba(200,150,44,0.15)' : 'transparent',
                      color: c === city ? '#C8962C' : '#fff',
                    }}
                  >
                    <span className="font-semibold">{c}</span>
                    {c === city && <span style={{ color: '#C8962C' }}>{'\u2713'}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RightNowModal isOpen={showRightNow} onClose={() => setShowRightNow(false)} />
    </div>
  );
}
