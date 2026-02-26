/**
 * ProfileMode - User Authority Surface
 *
 * The personal OS settings hub. NOT a public profile view (that's a sheet).
 * This is your identity, settings, and management centre.
 *
 * Layout:
 *   1. Hero section   -- Avatar (long-press -> persona switcher), persona badge, name, intent
 *   2. Quick stats    -- Taps received, Listed items, Events attended
 *   3. Settings groups -- Identity / Activity / Safety / Account
 *   4. Sign out + version
 *
 * Data: TanStack Query for profile + all counts.
 * Animation: Framer Motion stagger on mount, amber ring on avatar long-press.
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useLongPress } from '@/hooks/useLongPress';
import PersonaSwitcherSheet from '@/components/sheets/PersonaSwitcherSheet';
import {
  User,
  Settings,
  Shield,
  Heart,
  ShoppingBag,
  LogOut,
  ChevronRight,
  Bell,
  Lock,
  Eye,
  HelpCircle,
  Star,
  Camera,
  MapPin,
  Edit3,
  Package,
  AlertTriangle,
  Ticket,
  Users,
  Trophy,
  Zap,
  Crown,
  MessageSquare,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { usePersona } from '@/contexts/PersonaContext';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

// ---- Brand constants --------------------------------------------------------
const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';
const ROOT_BG = '#050507';
const MUTED = '#8E8E93';
const DESTRUCTIVE = '#FF3B30';

// ---- Intent styling ---------------------------------------------------------
const INTENT_STYLES: Record<string, { bg: string; text: string }> = {
  hookup:  { bg: AMBER,    text: '#000' },
  hang:    { bg: '#7C3AED', text: '#fff' },
  explore: { bg: '#14B8A6', text: '#fff' },
};

function getIntentStyle(intent: string) {
  return INTENT_STYLES[intent?.toLowerCase()] ?? { bg: AMBER, text: '#000' };
}

// ---- Section stagger animation ----------------------------------------------
const groupVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ---- Skeleton primitives ----------------------------------------------------
function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

function ProfileSkeleton() {
  return (
    <div className={`h-full w-full overflow-y-auto pb-36`} style={{ background: ROOT_BG }}>
      {/* Hero skeleton */}
      <div className="pt-10 pb-6 flex flex-col items-center gap-3 px-6" style={{ background: CARD_BG }}>
        <ShimmerBox className="w-20 h-20 rounded-full" />
        <ShimmerBox className="w-20 h-5 rounded-full" />
        <ShimmerBox className="w-32 h-5" />
        <ShimmerBox className="w-28 h-3" />
      </div>
      {/* Stats skeleton */}
      <div className="flex gap-0 mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: CARD_BG }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 py-4 flex flex-col items-center gap-2">
            <ShimmerBox className="w-8 h-5" />
            <ShimmerBox className="w-14 h-3" />
          </div>
        ))}
      </div>
      {/* Rows skeleton */}
      <div className="px-4 mt-6 space-y-6">
        {[0, 1, 2, 3].map((g) => (
          <div key={g}>
            <ShimmerBox className="w-16 h-3 mb-2" />
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG }}>
              {[0, 1, 2].map((r) => (
                <div key={r} className="flex items-center gap-3 p-4 border-b border-white/5 last:border-b-0">
                  <ShimmerBox className="w-8 h-8 rounded-lg" />
                  <ShimmerBox className="flex-1 h-4" />
                  <ShimmerBox className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Types ------------------------------------------------------------------
interface MenuRow {
  icon: LucideIcon;
  label: string;
  action: () => void;
  iconColor?: string;
}

interface MenuSection {
  title: string;
  items: MenuRow[];
}

interface ProfileModeProps {
  className?: string;
}

// ---- Component --------------------------------------------------------------
export function ProfileMode({ className = '' }: ProfileModeProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { openSheet } = useSheet();
  const { activePersona } = usePersona();

  // Long-press handler for avatar
  const avatarLongPress = useLongPress(() => {
    setIsLongPressing(false);
    setShowSwitcher(true);
  });

  // ---- Data fetching with TanStack Query ------------------------------------

  // Profile (current user)
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile-mode-current'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  // Right-now intent status
  const { data: rightNowStatus } = useQuery({
    queryKey: ['profile-mode-right-now'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('right_now_status')
        .select('intent, active')
        .eq('user_email', user.email)
        .eq('active', true)
        .maybeSingle();

      return data;
    },
    staleTime: 30_000,
  });

  // Taps received count
  const { data: tapsCount = 0 } = useQuery({
    queryKey: ['profile-mode-taps-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return 0;

      const { count, error } = await supabase
        .from('taps')
        .select('*', { count: 'exact', head: true })
        .eq('tapped_email', user.email);

      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  // Listed items count
  const { data: listingsCount = 0 } = useQuery({
    queryKey: ['profile-mode-listings-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('preloved_listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('status', 'active');

      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  // Events attended count
  const { data: eventsCount = 0 } = useQuery({
    queryKey: ['profile-mode-events-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  // ---- Handlers -------------------------------------------------------------

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      // Auth state listener in BootGuardContext will handle redirect
    } catch {
      toast.error('Failed to sign out');
      setSigningOut(false);
    }
  }, []);

  const handleViewPublicProfile = useCallback(() => {
    if (profile?.id) {
      openSheet('profile', { id: profile.id, email: profile.email });
    }
  }, [profile, openSheet]);

  // ---- Loading state --------------------------------------------------------

  if (profileLoading) {
    return <ProfileSkeleton />;
  }

  // ---- Error state ----------------------------------------------------------

  if (profileError) {
    return (
      <div className={`h-full w-full flex flex-col items-center justify-center gap-4 px-6 ${className}`} style={{ background: ROOT_BG }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${DESTRUCTIVE}15` }}>
          <AlertTriangle className="w-8 h-8" style={{ color: DESTRUCTIVE }} />
        </div>
        <p className="text-white text-lg font-bold">Could not load profile</p>
        <p className="text-sm text-center" style={{ color: MUTED }}>
          Check your connection and try again.
        </p>
        <button
          onClick={() => refetchProfile()}
          className="h-12 px-8 rounded-xl font-semibold text-white active:scale-95 transition-transform"
          style={{ background: AMBER }}
          aria-label="Retry loading profile"
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- Initials fallback ----------------------------------------------------

  const initials = (profile?.display_name || '')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ---- Persona badge --------------------------------------------------------

  const personaType = activePersona?.type?.toUpperCase() || 'MAIN';

  // ---- Intent pill ----------------------------------------------------------

  const activeIntent = rightNowStatus?.intent;
  const intentStyle = activeIntent ? getIntentStyle(activeIntent) : null;

  // ---- Menu sections --------------------------------------------------------

  const menuSections: MenuSection[] = [
    {
      title: 'IDENTITY',
      items: [
        { icon: Edit3, label: 'Edit Profile', action: () => openSheet('edit-profile', {}) },
        { icon: Camera, label: 'Photos', action: () => openSheet('photos', {}) },
        { icon: MapPin, label: 'Location Settings', action: () => openSheet('location', {}) },
        { icon: Users, label: 'Personas', action: () => setShowSwitcher(true) },
      ],
    },
    {
      title: 'ACTIVITY',
      items: [
        { icon: MessageSquare, label: 'Community', action: () => openSheet('community', {}) },
        { icon: Trophy, label: 'Achievements', action: () => openSheet('achievements', {}) },
        { icon: Users, label: 'Squads', action: () => openSheet('squads', {}) },
        { icon: Zap, label: 'Sweat Coins', action: () => openSheet('sweat-coins', {}) },
        { icon: Crown, label: 'Creator Subscriptions', action: () => openSheet('creator-subscription', {}) },
        { icon: Package, label: 'My Listings', action: () => openSheet('my-listings', {}) },
        { icon: ShoppingBag, label: 'My Orders', action: () => openSheet('my-orders', {}) },
        { icon: Ticket, label: 'Vault (Tickets & Passes)', action: () => openSheet('vault', {}) },
        { icon: Heart, label: 'Favourites', action: () => openSheet('favorites', {}) },
      ],
    },
    {
      title: 'SAFETY',
      items: [
        { icon: AlertTriangle, label: 'SOS & Emergency Contacts', action: () => openSheet('emergency-contact', {}), iconColor: AMBER },
        { icon: Eye, label: 'Privacy', action: () => openSheet('privacy', {}) },
        { icon: Lock, label: 'Blocked Users', action: () => openSheet('blocked', {}) },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { icon: Bell, label: 'Notifications', action: () => openSheet('notifications', {}), iconColor: MUTED },
        { icon: Star, label: 'Membership', action: () => openSheet('membership', {}), iconColor: MUTED },
        { icon: HelpCircle, label: 'Help', action: () => openSheet('help', {}), iconColor: MUTED },
        { icon: Settings, label: 'Settings', action: () => openSheet('settings', {}), iconColor: MUTED },
      ],
    },
  ];

  // ---- Render ---------------------------------------------------------------

  return (
    <>
      <div
        className={`h-full w-full overflow-y-auto pb-36 ${className}`}
        style={{ background: ROOT_BG }}
      >
        {/* ---- Hero Section ------------------------------------------------- */}
        <div
          className="relative pt-10 pb-6 flex flex-col items-center"
          style={{ background: CARD_BG }}
        >
          {/* Subtle gradient overlay at top */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, ${AMBER}08 0%, transparent 60%)`,
            }}
          />

          {/* Avatar with long-press */}
          <div className="relative z-10 mb-3">
            <motion.div
              onTouchStart={() => {
                setIsLongPressing(true);
                avatarLongPress.onTouchStart();
              }}
              onTouchEnd={() => {
                setIsLongPressing(false);
                avatarLongPress.onTouchEnd();
              }}
              onMouseDown={() => {
                setIsLongPressing(true);
                avatarLongPress.onMouseDown();
              }}
              onMouseUp={() => {
                setIsLongPressing(false);
                avatarLongPress.onMouseUp();
              }}
              onMouseLeave={() => {
                setIsLongPressing(false);
                avatarLongPress.onMouseLeave();
              }}
              animate={{
                scale: isLongPressing ? 1.08 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative cursor-pointer"
              role="button"
              aria-label="Long press to switch persona"
              tabIndex={0}
            >
              {/* Amber ring that appears on long-press */}
              <motion.div
                className="absolute -inset-1 rounded-full"
                animate={{
                  opacity: isLongPressing ? 1 : 0,
                  scale: isLongPressing ? 1 : 0.95,
                }}
                transition={{ duration: 0.2 }}
                style={{
                  border: `2px solid ${AMBER}`,
                  boxShadow: `0 0 20px ${AMBER}40`,
                }}
              />

              {/* Avatar circle */}
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '2px solid rgba(255,255,255,0.1)',
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : initials ? (
                  <span className="text-xl font-bold text-white/60">{initials}</span>
                ) : (
                  <User className="w-8 h-8 text-white/30" />
                )}
              </div>

              {/* Verified badge */}
              {profile?.verified && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: AMBER }}
                >
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.div>
          </div>

          {/* Persona badge */}
          <div
            className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest mb-2"
            style={{ background: `${AMBER}20`, color: AMBER }}
          >
            {personaType}
          </div>

          {/* Display name */}
          <h1 className="text-xl font-bold text-white mb-1 px-6 text-center">
            {profile?.display_name || 'Anonymous'}
          </h1>

          {/* View public profile link */}
          <button
            onClick={handleViewPublicProfile}
            className="text-sm mb-3 active:opacity-70 transition-opacity flex items-center gap-1"
            style={{ color: MUTED }}
            aria-label="View your public profile"
          >
            View public profile
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Intent pill or "Not sharing" */}
          {activeIntent && intentStyle ? (
            <div
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: intentStyle.bg, color: intentStyle.text }}
            >
              {activeIntent.charAt(0).toUpperCase() + activeIntent.slice(1)}
            </div>
          ) : (
            <span className="text-xs" style={{ color: `${MUTED}80` }}>
              Not sharing right now
            </span>
          )}
        </div>

        {/* ---- Quick Stats Row ---------------------------------------------- */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={groupVariants}
          className="mx-4 mt-4 rounded-2xl overflow-hidden flex"
          style={{ background: CARD_BG }}
        >
          <StatCell label="Taps" value={tapsCount} />
          <div className="w-px bg-white/5" />
          <StatCell label="Listed" value={listingsCount} />
          <div className="w-px bg-white/5" />
          <StatCell label="Events" value={eventsCount} />
        </motion.div>

        {/* ---- Settings Sections -------------------------------------------- */}
        <div className="px-4 pt-6 pb-4 space-y-6">
          {menuSections.map((section, sectionIdx) => (
            <motion.div
              key={section.title}
              initial="hidden"
              animate="visible"
              custom={sectionIdx + 1}
              variants={groupVariants}
            >
              {/* Section label */}
              <p
                className="text-[10px] uppercase tracking-[0.15em] font-bold mb-2 px-1"
                style={{ color: `${MUTED}99` }}
              >
                {section.title}
              </p>

              {/* Grouped card */}
              <div
                className="rounded-2xl overflow-hidden divide-y divide-white/5"
                style={{ background: CARD_BG }}
              >
                {section.items.map((item) => (
                  <SettingsRow
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    iconColor={item.iconColor}
                    onTap={item.action}
                  />
                ))}
              </div>
            </motion.div>
          ))}

          {/* ---- Sign Out --------------------------------------------------- */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={menuSections.length + 1}
            variants={groupVariants}
          >
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all active:bg-white/5 disabled:opacity-50"
              style={{ background: CARD_BG, color: DESTRUCTIVE }}
              aria-label="Sign out of your account"
            >
              {signingOut ? (
                <div
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: `${DESTRUCTIVE}30`, borderTopColor: DESTRUCTIVE }}
                />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </motion.div>

          {/* ---- Version ---------------------------------------------------- */}
          <motion.p
            initial="hidden"
            animate="visible"
            custom={menuSections.length + 2}
            variants={groupVariants}
            className="text-center text-xs py-4"
            style={{ color: `${MUTED}40` }}
          >
            HOTMESS OS v1.0.0
          </motion.p>
        </div>
      </div>

      {/* ---- Persona Switcher Sheet ----------------------------------------- */}
      <AnimatePresence>
        {showSwitcher && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSwitcher(false)}
            />
            <PersonaSwitcherSheet onClose={() => setShowSwitcher(false)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ---- Sub-components ---------------------------------------------------------

/** Single stat cell in the quick stats row */
function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 py-4 flex flex-col items-center gap-0.5">
      <motion.span
        className="text-lg font-bold text-white"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {value}
      </motion.span>
      <span className="text-[11px]" style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  );
}

/** Single row in a settings section */
function SettingsRow({
  icon: Icon,
  label,
  iconColor,
  onTap,
}: {
  icon: LucideIcon;
  label: string;
  iconColor?: string;
  onTap: () => void;
}) {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors"
      style={{ minHeight: 48 }}
      aria-label={label}
    >
      {/* Icon container */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color: iconColor || AMBER }} />
      </div>

      {/* Label */}
      <span className="flex-1 text-[15px] font-semibold text-white">{label}</span>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: `${MUTED}60` }} />
    </motion.button>
  );
}

export default ProfileMode;
