/**
 * MorePage — Control Deck (Live)
 *
 * 4-section hierarchy: SAFETY → YOU → ACTIVITY → SYSTEM
 * Every section is stateful — pulls real data, shows live summaries.
 *
 * Safety: tiered progression (Unsafe → Basic → Ready → Fully Set)
 * You: profile completeness %, photo count, active persona
 * Activity: live counters (taps, listings, orders, events)
 * System: notification/privacy/membership state
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, User, Activity, Settings, ChevronRight,
  Camera, MapPin, Users, Zap,
  Heart, ShoppingBag, Ticket, CalendarDays, Bookmark,
  Bell, Lock, Eye, HelpCircle, Crown, FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY — TIERED PROGRESSION
// ═══════════════════════════════════════════════════════════════════════════

type SafetyTier = 'unsafe' | 'basic' | 'ready' | 'full';

interface SafetyState {
  contactCount: number;
  hasFakeCall: boolean;
  locationSharing: boolean;
  alertsOn: boolean;
  loaded: boolean;
}

function useSafetyState(userId: string | null): SafetyState {
  const [state, setState] = useState<SafetyState>({
    contactCount: 0,
    hasFakeCall: false,
    locationSharing: false,
    alertsOn: false,
    loaded: false,
  });

  useEffect(() => {
    if (!userId) return;
    Promise.allSettled([
      supabase
        .from('trusted_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', userId)
        .single(),
    ]).then(([contactsRes, profileRes]) => {
      const contactCount = contactsRes.status === 'fulfilled' ? (contactsRes.value.count ?? 0) : 0;
      const prefs = profileRes.status === 'fulfilled' ? profileRes.value.data?.notification_prefs : null;
      setState({
        contactCount,
        hasFakeCall: !!prefs?.fake_call_enabled,
        locationSharing: !!prefs?.location_sharing,
        alertsOn: !!prefs?.push_enabled,
        loaded: true,
      });
    });
  }, [userId]);

  return state;
}

function getSafetyTier(s: SafetyState): SafetyTier {
  if (!s.loaded) return 'unsafe';
  const score =
    (s.contactCount > 0 ? 1 : 0) +
    (s.hasFakeCall ? 1 : 0) +
    (s.locationSharing ? 1 : 0) +
    (s.alertsOn ? 1 : 0);
  if (score === 0) return 'unsafe';
  if (score <= 1) return 'basic';
  if (score <= 3) return 'ready';
  return 'full';
}

const SAFETY_TIER_CONFIG: Record<SafetyTier, { label: string; color: string; glow: boolean }> = {
  unsafe: { label: 'Unsafe', color: '#FF3B30', glow: true },
  basic: { label: 'Basic', color: '#FF9500', glow: false },
  ready: { label: 'Ready', color: '#30D158', glow: false },
  full: { label: 'Fully Set', color: '#30D158', glow: false },
};

function getSafetySubtitle(s: SafetyState, tier: SafetyTier): string {
  if (!s.loaded) return 'Checking...';
  if (tier === 'full') return `${s.contactCount} contacts · Alerts on · Location sharing`;
  const parts: string[] = [];
  if (s.contactCount > 0) parts.push(`${s.contactCount} contact${s.contactCount > 1 ? 's' : ''}`);
  else parts.push('No contacts');
  if (!s.alertsOn) parts.push('Alerts off');
  if (!s.hasFakeCall) parts.push('No fake call');
  return parts.join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════
// YOU — PROFILE COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════

interface YouState {
  completeness: number;
  photoCount: number;
  activePersona: string;
  loaded: boolean;
}

function useYouState(userId: string | null): YouState {
  const { data } = useQuery({
    queryKey: ['control-deck-you', userId],
    queryFn: async () => {
      if (!userId) return { completeness: 0, photoCount: 0, activePersona: 'MAIN', loaded: false };

      const [profileRes, photosRes, personaRes] = await Promise.allSettled([
        supabase.from('profiles').select('display_name, bio, avatar_url, location, tags, age, looking_for, position').eq('id', userId).single(),
        supabase.from('profile_photos').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('personas').select('name').eq('user_id', userId).eq('is_active', true).single(),
      ]);

      const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
      const photoCount = photosRes.status === 'fulfilled' ? (photosRes.value.count ?? 0) : 0;
      const persona = personaRes.status === 'fulfilled' ? personaRes.value.data?.name : null;

      // Calculate completeness from profile fields
      let filled = 0;
      const total = 8;
      if (profile?.display_name && profile.display_name !== '[deleted]') filled++;
      if (profile?.bio) filled++;
      if (profile?.avatar_url) filled++;
      if (profile?.location) filled++;
      if (profile?.tags?.length > 0) filled++;
      if (profile?.age) filled++;
      if (profile?.looking_for) filled++;
      if (profile?.position) filled++;
      if (photoCount > 0) filled++; // bonus

      return {
        completeness: Math.min(100, Math.round((filled / total) * 100)),
        photoCount,
        activePersona: persona || 'MAIN',
        loaded: true,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return data ?? { completeness: 0, photoCount: 0, activePersona: 'MAIN', loaded: false };
}

function getYouSubtitle(s: YouState): string {
  if (!s.loaded) return 'Loading...';
  const parts: string[] = [];
  parts.push(`${s.completeness}% complete`);
  parts.push(s.photoCount === 0 ? 'No photos' : `${s.photoCount} photo${s.photoCount > 1 ? 's' : ''}`);
  parts.push(s.activePersona);
  return parts.join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY — LIVE COUNTERS
// ═══════════════════════════════════════════════════════════════════════════

interface ActivityState {
  tapCount: number;
  liveListings: number;
  pendingOrders: number;
  upcomingEvents: number;
  loaded: boolean;
}

function useActivityState(userId: string | null): ActivityState {
  const { data } = useQuery({
    queryKey: ['control-deck-activity', userId],
    queryFn: async () => {
      if (!userId) return { tapCount: 0, liveListings: 0, pendingOrders: 0, upcomingEvents: 0, loaded: false };

      const now = new Date().toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [tapsRes, listingsRes, ordersRes, eventsRes] = await Promise.allSettled([
        supabase.from('taps').select('id', { count: 'exact', head: true }).eq('tapped_id', userId).gte('created_at', today.toISOString()),
        supabase.from('preloved_listings').select('id', { count: 'exact', head: true }).eq('seller_id', userId).in('status', ['live', 'active']),
        supabase.from('product_orders').select('id', { count: 'exact', head: true }).eq('buyer_id', userId).in('status', ['pending', 'processing']),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('starts_at', now).or(`created_by.eq.${userId}`),
      ]);

      return {
        tapCount: tapsRes.status === 'fulfilled' ? (tapsRes.value.count ?? 0) : 0,
        liveListings: listingsRes.status === 'fulfilled' ? (listingsRes.value.count ?? 0) : 0,
        pendingOrders: ordersRes.status === 'fulfilled' ? (ordersRes.value.count ?? 0) : 0,
        upcomingEvents: eventsRes.status === 'fulfilled' ? (eventsRes.value.count ?? 0) : 0,
        loaded: true,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return data ?? { tapCount: 0, liveListings: 0, pendingOrders: 0, upcomingEvents: 0, loaded: false };
}

function getActivitySubtitle(s: ActivityState): string {
  if (!s.loaded) return 'Loading...';
  const parts: string[] = [];
  if (s.tapCount > 0) parts.push(`${s.tapCount} tap${s.tapCount > 1 ? 's' : ''} today`);
  if (s.liveListings > 0) parts.push(`${s.liveListings} listing${s.liveListings > 1 ? 's' : ''} live`);
  if (s.pendingOrders > 0) parts.push(`${s.pendingOrders} order${s.pendingOrders > 1 ? 's' : ''} pending`);
  if (s.upcomingEvents > 0) parts.push(`${s.upcomingEvents} event${s.upcomingEvents > 1 ? 's' : ''}`);
  if (parts.length === 0) return 'No activity yet — start something';
  return parts.join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM — ACCOUNT STATE
// ═══════════════════════════════════════════════════════════════════════════

interface SystemState {
  notificationsOn: boolean;
  privacyLevel: 'public' | 'limited' | 'private';
  membershipTier: string;
  loaded: boolean;
}

function useSystemState(userId: string | null): SystemState {
  const { data } = useQuery({
    queryKey: ['control-deck-system', userId],
    queryFn: async () => {
      if (!userId) return { notificationsOn: true, privacyLevel: 'public' as const, membershipTier: 'Free', loaded: false };

      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_prefs, privacy_settings, subscription_tier')
        .eq('id', userId)
        .single();

      const prefs = profile?.notification_prefs;
      const privacy = profile?.privacy_settings;
      const tier = profile?.subscription_tier || 'FREE';

      let privacyLevel: 'public' | 'limited' | 'private' = 'public';
      if (privacy?.hide_online_status && privacy?.hide_distance) privacyLevel = 'private';
      else if (privacy?.hide_online_status || privacy?.hide_distance) privacyLevel = 'limited';

      return {
        notificationsOn: prefs?.push_enabled !== false,
        privacyLevel,
        membershipTier: tier === 'FREE' ? 'Free' : tier === 'CHROME' ? 'Chrome' : tier === 'ELITE' ? 'Elite' : tier,
        loaded: true,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return data ?? { notificationsOn: true, privacyLevel: 'public', membershipTier: 'Free', loaded: false };
}

function getSystemSubtitle(s: SystemState): string {
  if (!s.loaded) return 'Loading...';
  const parts: string[] = [];
  parts.push(s.notificationsOn ? 'Notifications on' : 'Notifications muted');
  parts.push(`Privacy: ${s.privacyLevel.charAt(0).toUpperCase() + s.privacyLevel.slice(1)}`);
  parts.push(s.membershipTier);
  return parts.join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION CARD (with progress ring for YOU)
// ═══════════════════════════════════════════════════════════════════════════

interface SectionCardProps {
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  badge?: { text: string; color: string } | null;
  onTap: () => void;
  delay: number;
  elevated?: boolean;
  glow?: boolean;
  progress?: number; // 0-100 for ring
}

function SectionCard({ title, subtitle, icon: Icon, accent, badge, onTap, delay, elevated, glow, progress }: SectionCardProps) {
  return (
    <motion.button
      onClick={onTap}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.97 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-[#1C1C1E] border transition-all text-left relative overflow-hidden ${
        elevated ? 'border-red-500/30' : 'border-white/[0.06]'
      }`}
    >
      {/* Safety glow pulse */}
      {glow && (
        <div
          className="absolute inset-0 animate-pulse pointer-events-none"
          style={{ background: `radial-gradient(circle at 20% 50%, ${accent}08 0%, transparent 60%)` }}
        />
      )}

      <div className="relative flex-shrink-0">
        {/* Progress ring for YOU */}
        {progress != null && progress > 0 && (
          <svg className="absolute -inset-1 w-14 h-14" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="25" fill="none" stroke={`${accent}15`} strokeWidth="2" />
            <circle
              cx="28" cy="28" r="25"
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 157} 157`}
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
        )}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
        >
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wider text-white">{title}</span>
          {badge && (
            <motion.span
              key={badge.text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${badge.color}20`, color: badge.color }}
            >
              {badge.text}
            </motion.span>
          )}
        </div>
        <motion.p
          key={subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-white/40 leading-tight truncate"
        >
          {subtitle}
        </motion.p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0" />
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK ROW
// ═══════════════════════════════════════════════════════════════════════════

interface QuickItem {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  count?: number;
  onTap: () => void;
  accent?: string;
}

function QuickRow({ items, delay }: { items: QuickItem[]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="grid grid-cols-2 gap-2"
    >
      {items.map(({ icon: Icon, label, count, onTap, accent }) => (
        <motion.button
          key={label}
          onClick={onTap}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1C1E]/60 border border-white/[0.04] transition-all text-left"
        >
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: accent || '#8E8E93' }} />
          <span className="text-xs font-semibold text-white/60 truncate flex-1">{label}</span>
          {count != null && count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full"
              style={{ background: `${accent || GOLD}25`, color: accent || GOLD }}
            >
              {count}
            </motion.span>
          )}
        </motion.button>
      ))}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MORE PAGE (CONTROL DECK — LIVE)
// ═══════════════════════════════════════════════════════════════════════════

export default function MorePage() {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  // ── Live state hooks ──────────────────────────────────────────────────
  const safety = useSafetyState(userId);
  const safetyTier = getSafetyTier(safety);
  const safetyConfig = SAFETY_TIER_CONFIG[safetyTier];

  const you = useYouState(userId);
  const activity = useActivityState(userId);
  const system = useSystemState(userId);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  // ── Quick items with live counts ──────────────────────────────────────

  const youItems: QuickItem[] = useMemo(() => [
    { icon: User, label: 'Edit Profile', onTap: () => openSheet('edit-profile'), accent: GOLD },
    { icon: Camera, label: 'Photos', count: you.photoCount, onTap: () => openSheet('photos'), accent: GOLD },
    { icon: Users, label: 'Personas', onTap: () => navigate('/profile?action=manage-personas'), accent: GOLD },
    { icon: MapPin, label: 'Location', onTap: () => openSheet('location'), accent: GOLD },
  ], [you.photoCount, openSheet, navigate]);

  const activityItems: QuickItem[] = useMemo(() => [
    { icon: Heart, label: 'Taps', count: activity.tapCount, onTap: () => openSheet('taps'), accent: '#FF5500' },
    { icon: ShoppingBag, label: 'My Listings', count: activity.liveListings, onTap: () => openSheet('my-listings'), accent: '#9E7D47' },
    { icon: Ticket, label: 'Orders', count: activity.pendingOrders, onTap: () => openSheet('my-orders'), accent: GOLD },
    { icon: CalendarDays, label: 'Events', count: activity.upcomingEvents, onTap: () => openSheet('events'), accent: '#00C2E0' },
    { icon: Bookmark, label: 'Saved', onTap: () => openSheet('favorites'), accent: GOLD },
    { icon: Zap, label: 'Power-Ups', onTap: () => openSheet('boost-shop'), accent: GOLD },
  ], [activity, openSheet]);

  const systemItems: QuickItem[] = useMemo(() => [
    { icon: Eye, label: 'Privacy', onTap: () => openSheet('privacy') },
    { icon: Bell, label: 'Notifications', onTap: () => openSheet('notifications') },
    { icon: Lock, label: 'Blocked', onTap: () => openSheet('blocked') },
    { icon: HelpCircle, label: 'Help & Support', onTap: () => openSheet('help') },
    { icon: Crown, label: 'Membership', onTap: () => openSheet('membership'), accent: GOLD },
    { icon: FileText, label: 'Legal & Data', onTap: () => openSheet('legal') },
  ], [openSheet]);

  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#050507' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b border-white/5 px-4"
        style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="flex items-center justify-center h-14">
          <h1 className="font-black text-sm tracking-[0.25em] uppercase" style={{ color: GOLD }}>
            Control
          </h1>
        </div>
      </div>

      {/* Sections */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-momentum pb-24" {...pullHandlers}>
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        <div className="px-4 py-4 space-y-3">

          {/* ── 1. SAFETY (tiered progression) ────────────────────── */}
          <SectionCard
            title="Safety"
            subtitle={getSafetySubtitle(safety, safetyTier)}
            icon={Shield}
            accent="#FF3B30"
            badge={{ text: safetyConfig.label, color: safetyConfig.color }}
            onTap={() => navigate('/safety')}
            delay={0}
            elevated
            glow={safetyConfig.glow}
          />

          {/* ── 2. YOU (profile completeness ring) ────────────────── */}
          <SectionCard
            title="You"
            subtitle={getYouSubtitle(you)}
            icon={User}
            accent={GOLD}
            onTap={() => navigate('/profile')}
            delay={0.04}
            progress={you.completeness}
          />
          <QuickRow items={youItems} delay={0.06} />

          {/* ── 3. ACTIVITY (live dashboard) ──────────────────────── */}
          <SectionCard
            title="Activity"
            subtitle={getActivitySubtitle(activity)}
            icon={Activity}
            accent="#00C2E0"
            onTap={() => openSheet('taps')}
            delay={0.08}
          />
          <QuickRow items={activityItems} delay={0.10} />

          {/* ── 4. SYSTEM (account state) ─────────────────────────── */}
          <SectionCard
            title="System"
            subtitle={getSystemSubtitle(system)}
            icon={Settings}
            accent="#8E8E93"
            onTap={() => openSheet('settings')}
            delay={0.12}
          />
          <QuickRow items={systemItems} delay={0.14} />

          {/* ── Care (Hand N Hand) ────────────────────────────────── */}
          <motion.button
            onClick={() => navigate('/care')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1C1C1E]/40 border border-white/[0.04] transition-all text-left mt-2"
          >
            <div className="w-8 h-8 rounded-lg bg-[#C8962C]/10 flex items-center justify-center">
              <Heart className="w-4 h-4" style={{ color: GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-white/50">Hand N Hand</span>
              <span className="text-[10px] text-white/25 ml-2">Aftercare + wellbeing</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/10 flex-shrink-0" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
