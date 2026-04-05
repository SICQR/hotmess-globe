/**
 * MorePage — Control Deck (Behavioral)
 *
 * 4-section hierarchy: SAFETY → YOU → ACTIVITY → SYSTEM
 * Every section: live state + next-action prompt + behavioral nudge
 *
 * Nudge system: priority-based, one nudge at a time, stored in localStorage.
 * Last-action memory: persisted per-section, shown in ACTIVITY subtitle.
 * Next-action prompts: each section shows what to do next, tappable.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, User, Activity, Settings, ChevronRight, ArrowRight,
  Camera, MapPin, Users, Zap,
  Heart, ShoppingBag, Ticket, CalendarDays, Bookmark,
  Bell, Lock, Eye, HelpCircle, Crown, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';

// ═══════════════════════════════════════════════════════════════════════════
// LAST-ACTION MEMORY
// ═══════════════════════════════════════════════════════════════════════════

const MEMORY_KEY = 'hm_control_last_action';

interface LastAction {
  type: string;   // 'viewed_listing' | 'sent_message' | 'tapped_profile' | etc
  label: string;  // human-readable
  ts: number;     // timestamp
}

function getLastAction(): LastAction | null {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

/** Call from anywhere to record last action. */
export function recordAction(type: string, label: string) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ type, label, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

function timeAgoShort(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

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
    contactCount: 0, hasFakeCall: false, locationSharing: false, alertsOn: false, loaded: false,
  });

  useEffect(() => {
    if (!userId) return;
    Promise.allSettled([
      supabase.from('trusted_contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('profiles').select('notification_prefs').eq('id', userId).single(),
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
  const score = (s.contactCount > 0 ? 1 : 0) + (s.hasFakeCall ? 1 : 0) + (s.locationSharing ? 1 : 0) + (s.alertsOn ? 1 : 0);
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

/** Next step prompt for Safety */
function getSafetyNextAction(s: SafetyState, tier: SafetyTier): string | null {
  if (!s.loaded) return null;
  if (tier === 'full') return null;
  if (s.contactCount === 0) return 'Add a trusted contact to unlock Basic';
  if (!s.alertsOn) return 'Turn on alerts to upgrade';
  if (!s.hasFakeCall) return 'Set up fake call to reach Ready';
  if (!s.locationSharing) return 'Enable location sharing for full protection';
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// YOU — PROFILE COMPLETENESS + NEXT ACTION
// ═══════════════════════════════════════════════════════════════════════════

interface YouState {
  completeness: number;
  photoCount: number;
  activePersona: string;
  missingField: string | null;   // first missing field name
  missingSheet: string | null;   // sheet to open for that field
  loaded: boolean;
}

function useYouState(userId: string | null): YouState {
  const { data } = useQuery({
    queryKey: ['control-deck-you', userId],
    queryFn: async () => {
      if (!userId) return { completeness: 0, photoCount: 0, activePersona: 'MAIN', missingField: null, missingSheet: null, loaded: false };

      const [profileRes, photosRes, personaRes] = await Promise.allSettled([
        supabase.from('profiles').select('display_name, bio, avatar_url, location, tags, age, looking_for, position').eq('id', userId).single(),
        supabase.from('profile_photos').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('personas').select('name').eq('user_id', userId).eq('is_active', true).single(),
      ]);

      const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
      const photoCount = photosRes.status === 'fulfilled' ? (photosRes.value.count ?? 0) : 0;
      const persona = personaRes.status === 'fulfilled' ? personaRes.value.data?.name : null;

      // Track each field
      const fields: { name: string; sheet: string; filled: boolean }[] = [
        { name: 'display name', sheet: 'edit-profile', filled: !!(profile?.display_name && profile.display_name !== '[deleted]') },
        { name: 'bio', sheet: 'edit-profile', filled: !!profile?.bio },
        { name: 'avatar', sheet: 'photos', filled: !!profile?.avatar_url },
        { name: 'location', sheet: 'location', filled: !!profile?.location },
        { name: 'interests', sheet: 'edit-profile', filled: !!(profile?.tags?.length > 0) },
        { name: 'age', sheet: 'edit-profile', filled: !!profile?.age },
        { name: 'looking for', sheet: 'edit-profile', filled: !!profile?.looking_for },
        { name: 'position', sheet: 'edit-profile', filled: !!profile?.position },
      ];

      const filled = fields.filter(f => f.filled).length + (photoCount > 0 ? 1 : 0);
      const total = 8;
      const firstMissing = fields.find(f => !f.filled);

      // If all profile fields are filled but no photos, nudge photos
      const missingField = firstMissing ? firstMissing.name : (photoCount === 0 ? 'photos' : null);
      const missingSheet = firstMissing ? firstMissing.sheet : (photoCount === 0 ? 'photos' : null);

      return {
        completeness: Math.min(100, Math.round((filled / total) * 100)),
        photoCount,
        activePersona: persona || 'MAIN',
        missingField,
        missingSheet,
        loaded: true,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  return data ?? { completeness: 0, photoCount: 0, activePersona: 'MAIN', missingField: null, missingSheet: null, loaded: false };
}

function getYouSubtitle(s: YouState): string {
  if (!s.loaded) return 'Loading...';
  const parts: string[] = [];
  parts.push(`${s.completeness}% complete`);
  parts.push(s.photoCount === 0 ? 'No photos' : `${s.photoCount} photo${s.photoCount > 1 ? 's' : ''}`);
  parts.push(s.activePersona);
  return parts.join(' · ');
}

function getYouNextAction(s: YouState): string | null {
  if (!s.loaded || s.completeness >= 100) return null;
  if (s.missingField) return `Add your ${s.missingField} to finish your profile`;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY — LIVE COUNTERS + LAST ACTION
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

function getActivitySubtitle(s: ActivityState, lastAction: LastAction | null): string {
  if (!s.loaded) return 'Loading...';

  const parts: string[] = [];
  // Show last action first if recent (< 24h)
  if (lastAction && (Date.now() - lastAction.ts) < 86400000) {
    parts.push(`Last: ${lastAction.label} · ${timeAgoShort(lastAction.ts)}`);
  }
  if (s.tapCount > 0) parts.push(`${s.tapCount} tap${s.tapCount > 1 ? 's' : ''} today`);
  if (s.liveListings > 0) parts.push(`${s.liveListings} listing${s.liveListings > 1 ? 's' : ''} live`);
  if (s.pendingOrders > 0) parts.push(`${s.pendingOrders} order${s.pendingOrders > 1 ? 's' : ''} pending`);
  if (parts.length === 0) return 'No activity yet — start something';
  return parts.join(' · ');
}

function getActivityNextAction(s: ActivityState): string | null {
  if (!s.loaded) return null;
  if (s.tapCount > 0) return `${s.tapCount} tap${s.tapCount > 1 ? 's' : ''} today — reply now`;
  if (s.liveListings > 0) return `${s.liveListings} listing${s.liveListings > 1 ? 's' : ''} live — boost it`;
  if (s.pendingOrders > 0) return `${s.pendingOrders} order${s.pendingOrders > 1 ? 's' : ''} pending`;
  const total = s.tapCount + s.liveListings + s.pendingOrders + s.upcomingEvents;
  if (total === 0) return "You're invisible — go live";
  return null;
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
  parts.push(`Privacy ${s.privacyLevel === 'public' ? 'open' : 'protected'}`);
  parts.push(s.membershipTier);
  return parts.join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════
// NUDGE SYSTEM — ONE AT A TIME, PRIORITY ORDERED
// ═══════════════════════════════════════════════════════════════════════════

const NUDGE_DISMISS_PREFIX = 'hm_nudge_dismiss_';

interface Nudge {
  id: string;
  section: 'safety' | 'you' | 'activity';
  text: string;
  accent: string;
  action: () => void;
}

function useNudge(
  safety: SafetyState,
  safetyTier: SafetyTier,
  you: YouState,
  activity: ActivityState,
  navigate: (path: string) => void,
  openSheet: (type: string, props?: Record<string, unknown>) => void,
): Nudge | null {
  return useMemo(() => {
    // Priority 1: Safety incomplete
    if (safety.loaded && safetyTier === 'unsafe') {
      const id = 'safety_unsafe';
      if (!localStorage.getItem(NUDGE_DISMISS_PREFIX + id)) {
        return {
          id,
          section: 'safety',
          text: 'Your safety profile is empty — add a trusted contact',
          accent: '#FF3B30',
          action: () => navigate('/safety'),
        };
      }
    }

    // Priority 2: Profile < 60%
    if (you.loaded && you.completeness < 60) {
      const id = 'you_incomplete';
      if (!localStorage.getItem(NUDGE_DISMISS_PREFIX + id)) {
        return {
          id,
          section: 'you',
          text: you.missingField
            ? `Add your ${you.missingField} — ${you.completeness}% complete`
            : `Finish your profile — ${you.completeness}% complete`,
          accent: GOLD,
          action: () => openSheet(you.missingSheet || 'edit-profile'),
        };
      }
    }

    // Priority 3: No activity
    if (activity.loaded) {
      const total = activity.tapCount + activity.liveListings + activity.pendingOrders + activity.upcomingEvents;
      if (total === 0) {
        const id = 'activity_empty';
        if (!localStorage.getItem(NUDGE_DISMISS_PREFIX + id)) {
          return {
            id,
            section: 'activity',
            text: "You're invisible right now — go live or list something",
            accent: '#00C2E0',
            action: () => navigate('/ghosted'),
          };
        }
      }
    }

    return null;
  }, [safety, safetyTier, you, activity, navigate, openSheet]);
}

function dismissNudge(id: string) {
  try {
    // Dismiss for 24h
    localStorage.setItem(NUDGE_DISMISS_PREFIX + id, String(Date.now() + 86400000));
  } catch { /* quota */ }
}

// Check if nudge is dismissed (auto-expire after 24h)
function isNudgeDismissed(id: string): boolean {
  try {
    const val = localStorage.getItem(NUDGE_DISMISS_PREFIX + id);
    if (!val) return false;
    return Date.now() < parseInt(val, 10);
  } catch { return false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION CARD
// ═══════════════════════════════════════════════════════════════════════════

interface SectionCardProps {
  title: string;
  subtitle: string;
  nextAction?: string | null;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  badge?: { text: string; color: string } | null;
  onTap: () => void;
  onNextTap?: () => void;
  delay: number;
  elevated?: boolean;
  glow?: boolean;
  progress?: number;
}

function SectionCard({ title, subtitle, nextAction, icon: Icon, accent, badge, onTap, onNextTap, delay, elevated, glow, progress }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <motion.button
        onClick={onTap}
        whileTap={{ scale: 0.97 }}
        className={`w-full flex items-center gap-4 p-4 bg-[#1C1C1E] border transition-all text-left relative overflow-hidden ${
          elevated ? 'border-red-500/30' : 'border-white/[0.06]'
        } ${nextAction ? 'rounded-t-2xl rounded-b-none' : 'rounded-2xl'}`}
      >
        {glow && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 2, repeat: 0 }}
            style={{ background: `radial-gradient(circle at 20% 50%, ${accent}10 0%, transparent 60%)` }}
          />
        )}

        <div className="relative flex-shrink-0">
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
            transition={{ delay: 0.08 }}
            className="text-[11px] text-white/40 leading-tight truncate"
          >
            {subtitle}
          </motion.p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0" />
      </motion.button>

      {/* Next action prompt — attached to bottom of card */}
      <AnimatePresence>
        {nextAction && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={onNextTap || onTap}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-b-2xl text-left transition-all active:brightness-110"
            style={{ background: `${accent}10`, borderLeft: `1px solid ${accent}20`, borderRight: `1px solid ${accent}20`, borderBottom: `1px solid ${accent}20` }}
          >
            <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: accent }} />
            <span className="text-[11px] font-semibold truncate" style={{ color: accent }}>
              {nextAction}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
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
// NUDGE CARD — SINGLE, DISMISSABLE
// ═══════════════════════════════════════════════════════════════════════════

function NudgeCard({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-3 rounded-2xl"
        style={{ background: `${nudge.accent}08`, border: `0.5px solid ${nudge.accent}25` }}
      >
        <button
          onClick={nudge.action}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-[12px] font-bold text-white leading-tight">{nudge.text}</p>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={nudge.action}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
            style={{ background: nudge.accent, color: nudge.accent === GOLD ? '#000' : '#fff' }}
          >
            Go
          </button>
          <button
            onClick={onDismiss}
            className="text-white/25 text-xs px-1 py-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MORE PAGE (CONTROL DECK — BEHAVIORAL)
// ═══════════════════════════════════════════════════════════════════════════

export default function MorePage() {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

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

  // Last action memory
  const lastAction = useMemo(() => getLastAction(), []);

  // Nudge system
  const nudge = useNudge(safety, safetyTier, you, activity, navigate, openSheet);
  const showNudge = nudge && !nudgeDismissed;

  // Next-action prompts per section
  const safetyNext = getSafetyNextAction(safety, safetyTier);
  const youNext = getYouNextAction(you);
  const activityNext = getActivityNextAction(activity);

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

          {/* ── NUDGE (single, priority-based) ───────────────────── */}
          <AnimatePresence>
            {showNudge && nudge && (
              <NudgeCard
                nudge={nudge}
                onDismiss={() => {
                  dismissNudge(nudge.id);
                  setNudgeDismissed(true);
                }}
              />
            )}
          </AnimatePresence>

          {/* ── 1. SAFETY ─────────────────────────────────────────── */}
          <SectionCard
            title="Safety"
            subtitle={getSafetySubtitle(safety, safetyTier)}
            nextAction={safetyNext}
            icon={Shield}
            accent="#FF3B30"
            badge={{ text: safetyConfig.label, color: safetyConfig.color }}
            onTap={() => navigate('/safety')}
            delay={0}
            elevated
            glow={safetyConfig.glow}
          />

          {/* ── 2. YOU ────────────────────────────────────────────── */}
          <SectionCard
            title="You"
            subtitle={getYouSubtitle(you)}
            nextAction={youNext}
            icon={User}
            accent={GOLD}
            onTap={() => navigate('/profile')}
            onNextTap={() => openSheet(you.missingSheet || 'edit-profile')}
            delay={0.04}
            progress={you.completeness}
          />
          <QuickRow items={youItems} delay={0.06} />

          {/* ── 3. ACTIVITY ───────────────────────────────────────── */}
          <SectionCard
            title="Activity"
            subtitle={getActivitySubtitle(activity, lastAction)}
            nextAction={activityNext}
            icon={Activity}
            accent="#00C2E0"
            onTap={() => openSheet('taps')}
            onNextTap={() => {
              if (activity.tapCount > 0) openSheet('taps');
              else if (activity.liveListings > 0) openSheet('my-listings');
              else navigate('/ghosted');
            }}
            delay={0.08}
          />
          <QuickRow items={activityItems} delay={0.10} />

          {/* ── 4. SYSTEM ─────────────────────────────────────────── */}
          <SectionCard
            title="System"
            subtitle={getSystemSubtitle(system)}
            icon={Settings}
            accent="#8E8E93"
            onTap={() => openSheet('settings')}
            delay={0.12}
          />
          <QuickRow items={systemItems} delay={0.14} />

          {/* ── Care ──────────────────────────────────────────────── */}
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
