/**
 * GhostedMode - Proximity Grid (/ghosted)
 *
 * Full-screen edge-to-edge proximity grid. Think Grindr but slicker.
 * No hero banners. No stacked preview widgets. No marketing blocks.
 * Pure people discovery.
 *
 * Layout (top to bottom):
 * 1. Glassmorphic header -- city pill, "GHOSTED" wordmark, filter icon
 * 2. Horizontal tab strip -- All | Online Now | Right Now | Events Tonight
 * 3. 3-column profile grid -- edge-to-edge, near-seamless gap
 * 4. Floating "Right Now" FAB -- hides on scroll down
 *
 * Data: ProfilesGrid (existing infinite-scroll component) + local tab filtering.
 * Auth: supabase.auth.getUser() -- no base44 dependency.
 * Filters: localStorage `hm_ghosted_filters` via L2FiltersSheet.
 *
 * Wireframe:
 * ┌─────────────────────────────────────────┐
 * │ ┌─London─┐   GHOSTED   [filters]       │  sticky, glassmorphic
 * │ │248 near│                              │
 * ├─────────────────────────────────────────┤
 * │ [All] [Online] [Right Now] [Events]     │  pill tabs
 * ├─────────────────────────────────────────┤
 * │┌────┐┌────┐┌────┐                      │  3-col grid, gap-0.5
 * ││IMG ││IMG ││IMG │                       │  aspect-square
 * ││Name││Name││Name│                       │  infinite scroll
 * │└────┘└────┘└────┘                       │
 * │           ...                           │
 * │     [Share your vibe ->]                │  FAB above nav
 * └─────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Ghost, ArrowRight, X, MessageCircle, Heart, Ban, Flag, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { useRightNowCount } from '@/components/globe/useRealtimeBeacons';
import { supabase } from '@/components/utils/supabaseClient';
import { loadGhostedFilters, defaultGhostedFilters } from '@/components/sheets/L2FiltersSheet';
import { useTaps } from '@/hooks/useTaps';
import type { Profile } from '@/features/profilesGrid/types';
import type { TapType } from '@/hooks/useTaps';
import { AppBanner } from '@/components/banners/AppBanner';
import { GhostedAmbientToggle } from '@/components/music/GhostedAmbientToggle';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { usePowerups } from '@/hooks/usePowerups';
import { useGPS } from '@/hooks/useGPS';
import { calculateDistance } from '@/lib/locationUtils';
import { Zap, Eye } from 'lucide-react';

// Lazy load the grid component
import ProfilesGrid from '@/features/profilesGrid/ProfilesGrid';

// ---- Brand constants --------------------------------------------------------
const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';
const MUTED = '#8E8E93';

// ---- Tab definitions --------------------------------------------------------
type TabKey = 'all' | 'online' | 'rightnow' | 'events';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online Now' },
  { key: 'rightnow', label: 'Right Now' },
  { key: 'events', label: 'Events Tonight' },
];

// ---- Filter presets (quick-tap chips below tabs) ----------------------------
type PresetKey = 'nearby' | 'young' | 'hookup' | 'hang' | 'verified';

const FILTER_PRESETS: { key: PresetKey; label: string; filters: Partial<ReturnType<typeof defaultGhostedFilters>> }[] = [
  { key: 'nearby', label: 'Nearby (<1km)', filters: { distanceKm: 1 } },
  { key: 'young', label: '18–25', filters: { ageMin: 18, ageMax: 25 } },
  { key: 'hookup', label: 'Hookup', filters: { vibes: ['hookup'] } },
  { key: 'hang', label: 'Hang', filters: { vibes: ['hang'] } },
  { key: 'verified', label: 'Online only', filters: { onlineOnly: true } },
];

// ---- Filter key for localStorage sync ----------------------------------------
const GHOSTED_FILTERS_KEY = 'hm_ghosted_filters';

// ---- Helpers ----------------------------------------------------------------

/** Count how many non-default filter values are active */
function countActiveFilters(filters: ReturnType<typeof defaultGhostedFilters>): number {
  const def = defaultGhostedFilters();
  let count = 0;
  if (filters.ageMin !== def.ageMin || filters.ageMax !== def.ageMax) count++;
  if (filters.distanceKm !== def.distanceKm) count++;
  if (filters.vibes.length > 0) count++;
  if (filters.onlineOnly) count++;
  return count;
}

// ---- Quick Action Menu (long-press) -----------------------------------------

interface QuickMenuProps {
  profile: Profile;
  position: { x: number; y: number };
  myEmail: string | null;
  isTapped: (email: string, tapType: TapType) => boolean;
  sendTap: (email: string, name: string, tapType: TapType) => Promise<boolean>;
  onClose: () => void;
  onMessage: (profile: Profile) => void;
  onSave: (profile: Profile) => void;
  onBlock: (profile: Profile) => void;
  onReport: (profile: Profile) => void;
}

function QuickActionMenu({ profile, position, myEmail, isTapped, sendTap, onClose, onMessage, onSave, onBlock, onReport }: QuickMenuProps) {
  const email = String((profile as any)?.email || '');
  const name = String(profile.profileName || 'Someone');
  const hasTapSupport = !!myEmail && !!email;

  const tappedBoo = hasTapSupport ? isTapped(email, 'boo') : false;
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const handleBoo = async () => {
    if (!hasTapSupport) return;
    await sendTap(email, name, 'boo');
    onClose();
  };

  // Clamp position so menu stays on screen
  const menuWidth = 200;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const menuX = Math.min(position.x - menuWidth / 2, vw - menuWidth - 8);
  const clampedX = Math.max(8, menuX);
  const clampedY = Math.max(60, position.y - 200);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        aria-label="Close quick menu"
      />

      {/* Menu */}
      <motion.div
        className="fixed z-50 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
        style={{
          left: clampedX,
          top: clampedY,
          width: menuWidth,
          backgroundColor: '#1C1C1E',
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 400 }}
      >
        {/* Profile preview */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
            {(profile as any)?.photos?.[0]?.url ? (
              <img
                src={(profile as any).photos[0].url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-sm font-bold text-white truncate">{name}</span>
        </div>

        {/* Boo */}
        <button
          onClick={handleBoo}
          disabled={!hasTapSupport}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors disabled:opacity-40"
          aria-label={tappedBoo ? 'Un-boo this person' : 'Boo this person'}
        >
          <Ghost className="w-4 h-4 text-white/60" />
          <span className={tappedBoo ? 'text-[#C8962C]' : 'text-white'}>{tappedBoo ? 'Boo\'d' : 'Boo'}</span>
        </button>

        {/* Message */}
        <button
          onClick={() => { onMessage(profile); onClose(); }}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors"
          aria-label="Message"
        >
          <MessageCircle className="w-4 h-4 text-white/60" />
          <span className="text-white">Message</span>
        </button>

        {/* Save */}
        <button
          onClick={() => { onSave(profile); onClose(); }}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors"
          aria-label="Save profile"
        >
          <Heart className="w-4 h-4 text-white/60" />
          <span className="text-white">Save</span>
        </button>

        {/* Block */}
        {!showBlockConfirm ? (
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors border-t border-white/5"
            aria-label="Block user"
          >
            <Ban className="w-4 h-4 text-red-500/70" />
            <span className="text-red-500">Block</span>
          </button>
        ) : (
          <div className="px-4 py-3 border-t border-white/5">
            <p className="text-xs text-white/50 mb-2">Block {name}? They won't appear in your grid.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onBlock(profile); onClose(); }}
                className="flex-1 py-2 rounded-lg bg-red-500 text-black text-xs font-bold"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-white/10 text-white/60 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Report */}
        <button
          onClick={() => { onReport(profile); onClose(); }}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors"
          aria-label="Report user"
        >
          <Flag className="w-4 h-4 text-white/40" />
          <span className="text-white/60">Report</span>
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors border-t border-white/5"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/40" />
          <span className="text-white/60">Cancel</span>
        </button>
      </motion.div>
    </>
  );
}

// ---- Skeleton grid for loading state ----------------------------------------

function GhostedSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`skel-${i}`}
          className="aspect-square bg-[#1C1C1E] animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
        >
          {/* Gradient shimmer */}
          <div className="w-full h-full relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)`,
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ---- Empty state ------------------------------------------------------------

function GhostedEmpty({ onOpenFilters }: { onOpenFilters: () => void }) {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralCode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', user.id)
            .single();
          if (profile?.referral_code) {
            setReferralCode(profile.referral_code);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch referral code:', err);
      }
    };
    fetchReferralCode();
  }, []);

  const handleInvite = async () => {
    const baseUrl = `https://hotmessldn.com`;
    const url = referralCode ? `${baseUrl}?invite=${referralCode}` : baseUrl;
    if (navigator.share) {
      try {
        await navigator.share({ text: "I'm on HOTMESS — meet me tonight", url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      // toast would be nice but keep it simple
    }
  };

  return (
    <motion.div
      className="col-span-3 flex flex-col items-center justify-center py-20 text-center px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Ghost className="w-12 h-12 mb-4" style={{ color: AMBER }} />
      <h2 className="text-lg font-black text-white mb-2">Nobody nearby yet</h2>
      <p className="text-sm text-[#8E8E93] mb-6 max-w-[260px]">
        HOTMESS is growing in your area. Invite a friend and go live together.
      </p>
      <button
        onClick={handleInvite}
        className="h-12 px-6 text-black font-bold rounded-2xl flex items-center gap-2 active:scale-95 transition-transform mb-3"
        style={{ backgroundColor: AMBER }}
        aria-label="Invite a friend"
      >
        Invite a friend
      </button>
      <button
        onClick={onOpenFilters}
        className="text-sm font-medium"
        style={{ color: MUTED }}
        aria-label="Open filters"
      >
        or adjust filters
      </button>
    </motion.div>
  );
}

// ---- Main Component ---------------------------------------------------------

interface GhostedModeProps {
  className?: string;
}

export function GhostedMode({ className = '' }: GhostedModeProps) {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const onlineCount = useRightNowCount();
  const { isActive: isBoostActive, expiresAt: boostExpiresAt } = usePowerups();
  const { position: myPosition } = useGPS();

  // ---- Auth + profile data ----
  const [city, setCity] = useState('London');
  const [myEmail, setMyEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      const user = session?.user;
      const email = user?.email || null;
      setMyEmail(email);

      if (user?.id) {
        supabase
          .from('profiles')
          .select('city')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (cancelled) return;
            if (profile?.city) setCity(profile.city);
          });
      }
    });

    return () => { cancelled = true; };
  }, []);

  // ---- Taps (for quick menu + amber ring) ----
  const { isTapped, sendTap } = useTaps(myEmail);

  // ---- Filters (persisted in localStorage) ----
  const [filters, setFilters] = useState(loadGhostedFilters);

  // Re-read filters when localStorage changes (fired by L2FiltersSheet on Apply)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === GHOSTED_FILTERS_KEY) {
        setFilters(loadGhostedFilters());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Re-read filters on window focus (covers same-tab updates from sheet)
  useEffect(() => {
    const handleFocus = () => setFilters(loadGhostedFilters());
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Also re-read on a custom event for immediate same-frame sync
  useEffect(() => {
    const handleCustom = () => setFilters(loadGhostedFilters());
    window.addEventListener('hm_filters_updated', handleCustom);
    return () => window.removeEventListener('hm_filters_updated', handleCustom);
  }, []);

  // ---- Local block list for optimistic removal ----
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const activeFilterCount = countActiveFilters(filters);

  // ---- Sort control ----
  type SortKey = 'nearby' | 'last_active' | 'newest';
  const [sortBy, setSortBy] = useState<SortKey>('nearby');

  // ---- Active vibe tag filter (from card chip taps) ----
  const [vibeTagFilter, setVibeTagFilter] = useState<string | null>(null);

  // ---- Active tab ----
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // ---- Active filter preset (quick-tap chip) ----
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  // ---- Profile Bump: load user IDs with active profile_bump boost ----
  const [boostUserIds, setBoostUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchBoosted = async () => {
      try {
        const { data } = await supabase
          .from('user_active_boosts')
          .select('user_id')
          .eq('boost_key', 'profile_bump')
          .gt('expires_at', new Date().toISOString());
        if (data && data.length > 0) {
          setBoostUserIds(new Set(data.map((r: any) => r.user_id)));
        }
      } catch {
        // Non-fatal
      }
    };
    fetchBoosted();
    const iv = setInterval(fetchBoosted, 60_000);
    return () => clearInterval(iv);
  }, []);

  // ---- Events Tonight: load user IDs of people with tonight RSVPs ----
  const [tonightUserIds, setTonightUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeTab !== 'events') return;

    const fetchTonightRsvps = async () => {
      // Build today's date range in UTC
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      try {
        // Get beacon IDs for events happening today
        const { data: beacons } = await supabase
          .from('beacons')
          .select('id')
          .gte('starts_at', todayStart.toISOString())
          .lte('starts_at', todayEnd.toISOString())
          .not('starts_at', 'is', null);

        if (!beacons || beacons.length === 0) return;

        const beaconIds = beacons.map((b: any) => b.id);

        // Get user IDs who RSVPed for those beacons
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('user_id')
          .in('beacon_id', beaconIds)
          .in('status', ['going', 'interested']);

        if (rsvps && rsvps.length > 0) {
          setTonightUserIds(new Set(rsvps.map((r: any) => r.user_id)));
        }
      } catch {
        // Non-fatal — Events Tonight tab will show empty state
      }
    };

    fetchTonightRsvps();
  }, [activeTab]);

  // ---- Quick action handlers ----
  const handleQuickMessage = useCallback((profile: Profile) => {
    const uid = (profile as any)?.authUserId || (profile as any)?.userId || profile.id;
    if (uid) {
      openSheet('chat', {
        toUid: uid,
        title: `Chat with ${profile.profileName || 'Someone'}`,
      });
    }
  }, [openSheet]);

  const handleQuickSave = useCallback(async (profile: Profile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const targetId = (profile as any)?.authUserId || (profile as any)?.userId || profile.id;
      await supabase.from('saved_items').insert({
        user_id: user.id,
        item_type: 'profile',
        item_id: targetId,
        metadata: { title: profile.profileName || 'Profile' },
      });
      toast('Profile saved');
    } catch {
      // Duplicate save or table doesn't exist — still show feedback
      toast('Profile saved');
    }
  }, []);

  const handleQuickBlock = useCallback(async (profile: Profile) => {
    const targetId = (profile as any)?.authUserId || (profile as any)?.userId || profile.id;
    // Optimistic removal from local state
    setBlockedIds((prev) => new Set([...prev, targetId]));
    toast('User blocked');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Write to blocks table
      await supabase.from('blocks').insert({
        blocker_id: user.id,
        blocked_id: targetId,
      }).then(() => {}).catch(() => {});
      // Also try user_blocks for backward compat
      const targetEmail = (profile as any)?.email || targetId;
      await supabase.from('user_blocks').insert({
        blocker_email: user.email || user.id,
        blocked_email: targetEmail,
      }).then(() => {}).catch(() => {});
      window.dispatchEvent(new CustomEvent('hm_pull_refresh'));
    } catch {
      // Best-effort — user is already hidden locally
    }
  }, []);

  const handleQuickReport = useCallback((profile: Profile) => {
    const uid = (profile as any)?.authUserId || (profile as any)?.userId || profile.id;
    openSheet('report', {
      targetType: 'profile',
      targetId: uid,
      targetName: profile.profileName || 'this user',
      profileId: uid,
    });
  }, [openSheet]);

  // ---- Vibe tag click handler (from card chip) ----
  const handleVibeTagClick = useCallback((tag: string) => {
    setVibeTagFilter((prev) => (prev === tag ? null : tag));
  }, []);

  // ---- Combined filter predicate (filters + tab + blocks) ----
  const filterProfiles = useCallback(
    (profile: any) => {
      // Optimistic block: hide immediately
      const profileId = (profile as any)?.authUserId || (profile as any)?.userId || profile.id;
      if (blockedIds.has(profileId)) return false;

      // GDPR: Exclude profiles without a display_name (safety layer)
      const displayName = String(profile?.profileName || '').trim();
      if (!displayName) return false;

      // Distance filter — uses Haversine against viewer GPS
      if (myPosition && filters.distanceKm < 100) {
        const pLat = (profile as any)?.geoLat;
        const pLng = (profile as any)?.geoLng;
        if (typeof pLat === 'number' && typeof pLng === 'number') {
          const distM = calculateDistance(myPosition.lat, myPosition.lng, pLat, pLng);
          if (distM > filters.distanceKm * 1000) return false;
        }
      }

      // Sheet filters first
      if (filters.onlineOnly && !profile.is_online && !profile.onlineNow) return false;

      if (typeof profile.age === 'number') {
        if (profile.age < filters.ageMin || profile.age > filters.ageMax) return false;
      }

      if (filters.vibes.length > 0) {
        const profileVibes: string[] = Array.isArray(profile.looking_for)
          ? profile.looking_for.map((v: unknown) => String(v))
          : [];
        const intentStr = String(profile.intent || profile.vibe || '').toLowerCase();
        const hasVibe = filters.vibes.some(
          (v) =>
            profileVibes.some((pv: string) => pv.toLowerCase().includes(v.toLowerCase())) ||
            intentStr.includes(v.toLowerCase()),
        );
        if (!hasVibe) return false;
      }

      // Tab filters
      if (activeTab === 'online') {
        // Show if is_online OR last_seen within 15 minutes
        const lastSeen = profile.last_seen ? new Date(profile.last_seen).getTime() : 0;
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        const isRecentlyActive = lastSeen > fifteenMinutesAgo;
        if (!profile.is_online && !profile.onlineNow && !isRecentlyActive) return false;
      }

      if (activeTab === 'rightnow') {
        if (!profile.rightNow && !profile.right_now_status) return false;
      }

      if (activeTab === 'events') {
        // Show profiles who have RSVPed for tonight's events
        // Falls back to empty state if no RSVPs loaded yet
        return tonightUserIds.has(profile.id);
      }

      // Vibe tag filter (from card chip tap)
      if (vibeTagFilter) {
        const scenes: string[] = Array.isArray((profile as any)?.public_attributes?.scenes)
          ? (profile as any).public_attributes.scenes
          : [];
        const lookingFor: string[] = Array.isArray(profile.looking_for)
          ? profile.looking_for.map((v: unknown) => String(v))
          : [];
        const allTags = [...scenes, ...lookingFor].map((t) => t.toLowerCase());
        if (!allTags.some((t) => t.includes(vibeTagFilter.toLowerCase()))) return false;
      }

      return true;
    },
    [filters, activeTab, tonightUserIds, vibeTagFilter, blockedIds, myPosition],
  );

  // ---- Profile tap handler ----
  const handleProfileTap = useCallback(
    (profile: Profile) => {
      // Use userId/authUserId (raw UUID) — profile.id has a "profile_" prefix from API
      const uid = String((profile as any)?.userId || (profile as any)?.authUserId || profile.id);
      openSheet('profile', { uid });
    },
    [openSheet],
  );

  // ---- Quick action menu (long-press) ----
  const [quickMenu, setQuickMenu] = useState<{
    profile: Profile;
    position: { x: number; y: number };
  } | null>(null);

  const handleLongPress = useCallback(
    (profile: Profile, position: { x: number; y: number }) => {
      setQuickMenu({ profile, position });
    },
    [],
  );

  // ---- FAB scroll-hide logic ----
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fabVisible, setFabVisible] = useState(true);
  const lastScrollTop = useRef(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const currentScrollTop = el.scrollTop;
    const isScrollingDown = currentScrollTop > lastScrollTop.current && currentScrollTop > 60;
    setFabVisible(!isScrollingDown);
    lastScrollTop.current = currentScrollTop;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ---- Pull-to-refresh ----
  const handleRefresh = useCallback(async () => {
    // Force refetch profiles by dispatching a custom event that ProfilesGrid listens to
    window.dispatchEvent(new CustomEvent('hm_pull_refresh'));
    // Small delay so the user sees the spinner
    await new Promise((r) => setTimeout(r, 800));
  }, []);

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  // ---- Render ----
  return (
    <div
      className={`h-full w-full flex flex-col ${className}`}
      style={{ background: '#050507' }}
    >
      {/* ====== STICKY HEADER (glassmorphic) ====== */}
      <div className="sticky top-0 z-30 border-b border-white/5" style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between h-14">
            {/* Left: city pill + online count */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
                <span className="text-xs font-semibold text-white">{city}</span>
              </div>
              <span className="text-xs text-[#8E8E93] font-medium">
                {onlineCount > 0 ? onlineCount : '--'} nearby
              </span>
            </div>

            {/* Center: GHOSTED wordmark + subtitle */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1
                className="font-black text-base tracking-[0.2em] uppercase leading-tight"
                style={{ color: AMBER }}
              >
                GHOSTED
              </h1>
              <p className="text-[10px] text-white/30 font-medium">
                {city} - Right Now
              </p>
            </div>

            {/* Right: Go Live + Safety + SOS + ambient toggle + filter icon with badge */}
            <div className="flex items-center gap-1.5">
            <button
              onClick={() => openSheet('social', {})}
              className="h-7 px-2.5 rounded-full text-[10px] font-bold active:scale-95 transition-transform"
              style={{ background: 'rgba(200,150,44,0.15)', border: '1px solid rgba(200,150,44,0.3)', color: AMBER }}
              aria-label="Go live"
            >
              Go Live
            </button>
            <button
              onClick={() => navigate('/safety')}
              className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              aria-label="Safety"
            >
              <span className="text-white/50 text-[10px] font-bold">SOS</span>
            </button>
            <GhostedAmbientToggle />
            <button
              data-testid="ghosted-filter-btn"
              onClick={() => openSheet('filters')}
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:scale-95 transition-transform"
              aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            >
              <SlidersHorizontal className="w-4.5 h-4.5 text-white/70" />
              {activeFilterCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-black text-[10px] font-black leading-none"
                  style={{ backgroundColor: AMBER }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
            </div>
          </div>

          {/* ====== TAB STRIP ====== */}
          <div className="flex gap-1 pb-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 relative"
                  style={
                    isActive
                      ? { color: '#fff' }
                      : { color: '#8E8E93' }
                  }
                  aria-label={`Show ${tab.label}`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="ghosted-tab-underline"
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                      style={{ background: AMBER }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ====== SORT CHIPS ====== */}
          <div className="flex gap-1.5 pb-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {([
              { key: 'nearby' as SortKey, label: 'Nearby' },
              { key: 'last_active' as SortKey, label: 'Last Active' },
              { key: 'newest' as SortKey, label: 'Newest' },
            ]).map((sort) => {
              const isActive = sortBy === sort.key;
              return (
                <button
                  key={sort.key}
                  onClick={() => setSortBy(sort.key)}
                  className={`flex-shrink-0 h-7 px-3 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-white/30 border border-white/[0.04]'
                  }`}
                >
                  {sort.label}
                </button>
              );
            })}
            {vibeTagFilter && (
              <button
                onClick={() => setVibeTagFilter(null)}
                className="flex-shrink-0 h-7 px-3 rounded-full text-xs font-bold bg-[#C8962C]/20 text-[#C8962C] border border-[#C8962C]/30 flex items-center gap-1 active:scale-95 transition-all"
              >
                {vibeTagFilter}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ====== FILTER PRESETS (quick-tap chips) ====== */}
          <div className="flex gap-1.5 pb-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {FILTER_PRESETS.map((preset) => {
              const isActive = activePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  onClick={() => {
                    if (isActive) {
                      setActivePreset(null);
                      setFilters(loadGhostedFilters());
                    } else {
                      setActivePreset(preset.key);
                      setFilters({ ...defaultGhostedFilters(), ...preset.filters });
                    }
                  }}
                  className={`flex-shrink-0 h-7 px-3 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    isActive
                      ? 'text-black'
                      : 'text-white/40 border border-white/[0.06]'
                  }`}
                  style={{ backgroundColor: isActive ? AMBER : 'transparent' }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====== INCOGNITO INDICATOR ====== */}
      {isBoostActive('incognito_week') && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5" style={{ background: 'rgba(200,150,44,0.08)' }}>
          <Eye className="w-3.5 h-3.5 text-[#C8962C]" />
          <span className="text-xs font-bold text-[#C8962C]">You're invisible</span>
          {boostExpiresAt('incognito_week') && (
            <span className="text-[10px] text-white/30 ml-auto">
              {(() => {
                const exp = boostExpiresAt('incognito_week');
                if (!exp) return '';
                const m = Math.round((exp.getTime() - Date.now()) / 60000);
                return m < 60 ? `${m}m left` : m < 1440 ? `${Math.round(m / 60)}h left` : `${Math.round(m / 1440)}d left`;
              })()}
            </span>
          )}
        </div>
      )}

      {/* ====== DYNAMIC BANNERS ====== */}
      <AppBanner placement="ghosted_top" variant="strip" />
      <AppBanner placement="ghosted_entry" variant="subtle" className="px-4" />

      {/* ====== FULL-SCREEN 3-COL GRID ====== */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-momentum pb-24 relative z-10"
        {...pullHandlers}
      >
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        <ProfilesGrid
          onOpenProfile={handleProfileTap}
          containerClassName="p-0"
          cols={3}
          showHeader={false}
          filterProfiles={filterProfiles}
          viewerEmail={myEmail}
          onLongPress={handleLongPress}
          emptyComponent={<GhostedEmpty onOpenFilters={() => openSheet('filters')} />}
          onVibeTagClick={handleVibeTagClick}
          boostUserIds={boostUserIds}
        />
      </div>

      {/* ====== "RIGHT NOW" FAB + BOOST BUTTON ====== */}
      <AnimatePresence>
        {fabVisible && (
          <motion.div
            className="fixed z-20 left-1/2 -translate-x-1/2 flex items-center gap-2"
            style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Boost Profile trigger */}
            <button
              onClick={() => {
                if (isBoostActive('profile_bump')) {
                  const exp = boostExpiresAt('profile_bump');
                  const m = exp ? Math.round((exp.getTime() - Date.now()) / 60000) : 0;
                  toast(`Profile Bump active - ${m < 60 ? `${m}m` : `${Math.round(m / 60)}h`} left`, {
                    style: { background: '#1C1C1E', color: '#C8962C', border: '1px solid rgba(200,150,44,0.3)' },
                  });
                } else {
                  openSheet('boost-shop', {});
                }
              }}
              className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
                isBoostActive('profile_bump')
                  ? 'bg-[#C8962C]/20 border border-[#C8962C]/50'
                  : 'bg-white/10 border border-white/15'
              }`}
              style={isBoostActive('profile_bump') ? { boxShadow: '0 0 16px rgba(200,150,44,0.3)' } : undefined}
              aria-label={isBoostActive('profile_bump') ? 'Profile Bump active' : 'Boost your profile'}
            >
              <Zap className={`w-5 h-5 ${isBoostActive('profile_bump') ? 'text-[#C8962C]' : 'text-white/60'}`} />
            </button>

            <button
              onClick={() => openSheet('social', {})}
              className="h-12 px-6 rounded-full flex items-center gap-2 font-bold text-sm text-black shadow-lg active:scale-95 transition-transform"
              style={{
                backgroundColor: AMBER,
                boxShadow: `0 8px 32px rgba(200,150,44,0.35)`,
              }}
              aria-label="Share your vibe right now"
            >
              Share your vibe
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== QUICK ACTION MENU (long-press overlay) ====== */}
      <AnimatePresence>
        {quickMenu && (
          <QuickActionMenu
            profile={quickMenu.profile}
            position={quickMenu.position}
            myEmail={myEmail}
            isTapped={isTapped}
            sendTap={sendTap}
            onClose={() => setQuickMenu(null)}
            onMessage={handleQuickMessage}
            onSave={handleQuickSave}
            onBlock={handleQuickBlock}
            onReport={handleQuickReport}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default GhostedMode;
