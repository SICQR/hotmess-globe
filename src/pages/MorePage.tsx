/**
 * MorePage — Control Deck
 *
 * 4-section hierarchy: SAFETY → YOU → ACTIVITY → SYSTEM
 * Single mental model. No duplication. Every action has one home.
 *
 * Safety is stateful (not just a warning) — shows real completion status.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, User, Activity, Settings, ChevronRight,
  Camera, MapPin, Users, Zap,
  Heart, ShoppingBag, Ticket, CalendarDays, Bookmark,
  Bell, Lock, Eye, HelpCircle, Crown, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY STATUS
// ═══════════════════════════════════════════════════════════════════════════

type SafetyStatus = {
  contactCount: number;
  hasFakeCall: boolean;
  locationSharing: boolean;
  loaded: boolean;
};

function useSafetyStatus(userId: string | null): SafetyStatus {
  const [status, setStatus] = useState<SafetyStatus>({
    contactCount: 0,
    hasFakeCall: false,
    locationSharing: false,
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
    ]).then(([contactsResult, profileResult]) => {
      const contactCount =
        contactsResult.status === 'fulfilled' ? (contactsResult.value.count ?? 0) : 0;
      const prefs =
        profileResult.status === 'fulfilled' ? profileResult.value.data?.notification_prefs : null;

      setStatus({
        contactCount,
        hasFakeCall: !!prefs?.fake_call_enabled,
        locationSharing: !!prefs?.location_sharing,
        loaded: true,
      });
    });
  }, [userId]);

  return status;
}

function getSafetyLabel(s: SafetyStatus): { text: string; color: string } {
  if (!s.loaded) return { text: 'Checking...', color: '#8E8E93' };
  const issues: string[] = [];
  if (s.contactCount === 0) issues.push('No trusted contacts');
  if (!s.hasFakeCall) issues.push('No fake call');
  if (issues.length === 0) return { text: 'Active', color: '#30D158' };
  if (issues.length === 1) return { text: issues[0], color: '#FF9500' };
  return { text: `${issues.length} items incomplete`, color: '#FF3B30' };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION CARD
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
}

function SectionCard({ title, subtitle, icon: Icon, accent, badge, onTap, delay, elevated }: SectionCardProps) {
  return (
    <motion.button
      onClick={onTap}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-[#1C1C1E] border active:scale-[0.98] active:bg-white/[0.04] transition-all text-left ${
        elevated ? 'border-red-500/30' : 'border-white/[0.06]'
      }`}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
      >
        <Icon className="w-6 h-6" style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wider text-white">{title}</span>
          {badge && (
            <span
              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${badge.color}20`, color: badge.color }}
            >
              {badge.text}
            </span>
          )}
        </div>
        <span className="text-[11px] text-white/40 leading-tight">{subtitle}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0" />
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPANDED SECTION ITEMS
// ═══════════════════════════════════════════════════════════════════════════

interface QuickItem {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  label: string;
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
      {items.map(({ icon: Icon, label, onTap, accent }) => (
        <button
          key={label}
          onClick={onTap}
          className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1C1C1E]/60 border border-white/[0.04] active:scale-[0.97] active:bg-white/[0.04] transition-all text-left"
        >
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: accent || '#8E8E93' }} />
          <span className="text-xs font-semibold text-white/60 truncate">{label}</span>
        </button>
      ))}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MORE PAGE (CONTROL DECK)
// ═══════════════════════════════════════════════════════════════════════════

export default function MorePage() {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Resolve current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  const safety = useSafetyStatus(userId);
  const safetyLabel = getSafetyLabel(safety);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  // ── Quick items for each section ──────────────────────────────────────

  const youItems: QuickItem[] = [
    { icon: User, label: 'Edit Profile', onTap: () => openSheet('edit-profile'), accent: GOLD },
    { icon: Camera, label: 'Photos', onTap: () => openSheet('photos'), accent: GOLD },
    { icon: Users, label: 'Personas', onTap: () => navigate('/profile?action=manage-personas'), accent: GOLD },
    { icon: MapPin, label: 'Location', onTap: () => openSheet('location'), accent: GOLD },
  ];

  const activityItems: QuickItem[] = [
    { icon: Heart, label: 'Taps', onTap: () => openSheet('taps'), accent: '#FF5500' },
    { icon: ShoppingBag, label: 'My Listings', onTap: () => openSheet('my-listings'), accent: '#9E7D47' },
    { icon: Ticket, label: 'Orders & Tickets', onTap: () => openSheet('my-orders'), accent: GOLD },
    { icon: CalendarDays, label: 'Events', onTap: () => openSheet('events'), accent: '#00C2E0' },
    { icon: Bookmark, label: 'Saved', onTap: () => openSheet('favorites'), accent: GOLD },
    { icon: Zap, label: 'Power-Ups', onTap: () => openSheet('boost-shop'), accent: GOLD },
  ];

  const systemItems: QuickItem[] = [
    { icon: Eye, label: 'Privacy', onTap: () => openSheet('privacy') },
    { icon: Bell, label: 'Notifications', onTap: () => openSheet('notifications') },
    { icon: Lock, label: 'Blocked', onTap: () => openSheet('blocked') },
    { icon: HelpCircle, label: 'Help & Support', onTap: () => openSheet('help') },
    { icon: Crown, label: 'Membership', onTap: () => openSheet('membership'), accent: GOLD },
    { icon: FileText, label: 'Legal & Data', onTap: () => openSheet('legal') },
  ];

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

          {/* ── 1. SAFETY ─────────────────────────────────────────── */}
          <SectionCard
            title="Safety"
            subtitle="SOS, check-ins, trusted contacts"
            icon={Shield}
            accent="#FF3B30"
            badge={safetyLabel}
            onTap={() => navigate('/safety')}
            delay={0}
            elevated
          />

          {/* ── 2. YOU ────────────────────────────────────────────── */}
          <SectionCard
            title="You"
            subtitle="Profile, personas, presence"
            icon={User}
            accent={GOLD}
            onTap={() => navigate('/profile')}
            delay={0.04}
          />
          <QuickRow items={youItems} delay={0.06} />

          {/* ── 3. ACTIVITY ───────────────────────────────────────── */}
          <SectionCard
            title="Activity"
            subtitle="Your footprint in HOTMESS"
            icon={Activity}
            accent="#00C2E0"
            onTap={() => openSheet('taps')}
            delay={0.08}
          />
          <QuickRow items={activityItems} delay={0.10} />

          {/* ── 4. SYSTEM ─────────────────────────────────────────── */}
          <SectionCard
            title="System"
            subtitle="Privacy, notifications, support"
            icon={Settings}
            accent="#8E8E93"
            onTap={() => openSheet('settings')}
            delay={0.12}
          />
          <QuickRow items={systemItems} delay={0.14} />

          {/* ── Care (Hand N Hand — always accessible) ──────────── */}
          <motion.button
            onClick={() => navigate('/care')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1C1C1E]/40 border border-white/[0.04] active:scale-[0.98] transition-all text-left mt-2"
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
