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
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Ghost, ArrowRight, X } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useRightNowCount } from '@/components/globe/useRealtimeBeacons';
import { supabase } from '@/components/utils/supabaseClient';
import { loadGhostedFilters, defaultGhostedFilters } from '@/components/sheets/L2FiltersSheet';
import { useTaps } from '@/hooks/useTaps';
import type { Profile } from '@/features/profilesGrid/types';
import type { TapType } from '@/hooks/useTaps';

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
}

function QuickActionMenu({ profile, position, myEmail, isTapped, sendTap, onClose }: QuickMenuProps) {
  const email = String((profile as any)?.email || '');
  const name = String(profile.profileName || 'Someone');
  const hasTapSupport = !!myEmail && !!email;

  const tappedTap = hasTapSupport ? isTapped(email, 'tap') : false;
  const tappedWoof = hasTapSupport ? isTapped(email, 'woof') : false;

  const handleTap = async () => {
    if (!hasTapSupport) return;
    await sendTap(email, name, 'tap');
    onClose();
  };

  const handleWoof = async () => {
    if (!hasTapSupport) return;
    await sendTap(email, name, 'woof');
    onClose();
  };

  // Clamp position so menu stays on screen (390px viewport)
  const menuWidth = 180;
  const menuX = Math.min(position.x - menuWidth / 2, 390 - menuWidth - 8);
  const clampedX = Math.max(8, menuX);
  const clampedY = Math.max(60, position.y - 130);

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

        {/* Actions */}
        <button
          onClick={handleTap}
          disabled={!hasTapSupport}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors disabled:opacity-40"
          aria-label={tappedTap ? 'Untap this person' : 'Tap this person'}
        >
          <span className="text-base">{tappedTap ? '👋' : '✋'}</span>
          <span className={tappedTap ? 'text-[#C8962C]' : 'text-white'}>{tappedTap ? 'Tapped' : 'Tap'}</span>
        </button>

        <button
          onClick={handleWoof}
          disabled={!hasTapSupport}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 active:bg-white/5 transition-colors border-t border-white/5 disabled:opacity-40"
          aria-label={tappedWoof ? 'Un-woof this person' : 'Woof this person'}
        >
          <span className="text-base">{tappedWoof ? '🐾' : '🐕'}</span>
          <span className={tappedWoof ? 'text-[#C8962C]' : 'text-white'}>{tappedWoof ? 'Woofed' : 'Woof'}</span>
        </button>

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
  return (
    <motion.div
      className="flex flex-col items-center justify-center px-8 py-20 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Ghost className="w-16 h-16 text-[#8E8E93] mb-6" strokeWidth={1.5} />
      <h2 className="text-xl font-bold text-white mb-2">No one nearby right now</h2>
      <p className="text-sm text-[#8E8E93] mb-6 max-w-[260px]">
        Try expanding your distance or adjusting your filters to see more people.
      </p>
      <button
        onClick={onOpenFilters}
        className="h-12 px-6 bg-[#C8962C] text-black font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-transform"
        aria-label="Open filters to expand search"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Expand your search
      </button>
    </motion.div>
  );
}

// ---- Main Component ---------------------------------------------------------

interface GhostedModeProps {
  className?: string;
}

export function GhostedMode({ className = '' }: GhostedModeProps) {
  const { openSheet } = useSheet();
  const onlineCount = useRightNowCount();

  // ---- Auth + profile data ----
  const [city, setCity] = useState('London');
  const [myEmail, setMyEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const email = data?.user?.email || null;
      setMyEmail(email);

      if (email) {
        supabase
          .from('profiles')
          .select('city')
          .eq('email', email)
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

  const activeFilterCount = countActiveFilters(filters);

  // ---- Active tab ----
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // ---- Combined filter predicate (filters + tab) ----
  const filterProfiles = useCallback(
    (profile: any) => {
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
        if (!profile.is_online && !profile.onlineNow) return false;
      }

      if (activeTab === 'rightnow') {
        if (!profile.rightNow && !profile.right_now_status) return false;
      }

      if (activeTab === 'events') {
        if (!profile.attending_tonight && !profile.has_event_tonight) return false;
      }

      return true;
    },
    [filters, activeTab],
  );

  // ---- Profile tap handler ----
  const handleProfileTap = useCallback(
    (profile: Profile) => {
      const email = (profile as any)?.email;
      if (email) {
        openSheet('profile', { email });
      } else {
        openSheet('profile', { id: profile.id });
      }
    },
    [openSheet],
  );

  // ---- Quick action menu (long-press) ----
  const [quickMenu, setQuickMenu] = useState<{
    profile: Profile;
    position: { x: number; y: number };
  } | null>(null);

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

            {/* Right: filter icon with badge */}
            <button
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

          {/* ====== TAB STRIP ====== */}
          <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                    isActive
                      ? 'text-white'
                      : 'text-[#8E8E93] border border-white/5'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: AMBER }
                      : { backgroundColor: CARD_BG }
                  }
                  aria-label={`Show ${tab.label}`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====== FULL-SCREEN 3-COL GRID ====== */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-momentum pb-24"
      >
        <ProfilesGrid
          onOpenProfile={handleProfileTap}
          containerClassName="p-0"
          cols={3}
          showHeader={false}
          filterProfiles={filterProfiles}
          viewerEmail={myEmail}
        />
      </div>

      {/* ====== "RIGHT NOW" FAB ====== */}
      <AnimatePresence>
        {fabVisible && (
          <motion.div
            className="fixed z-20 left-1/2 -translate-x-1/2"
            style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default GhostedMode;
