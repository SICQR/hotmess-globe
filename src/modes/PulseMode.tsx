/**
 * PulseMode -- Multi-Layered Signal Engine (route: /pulse)
 *
 * The immersive globe mode. The Three.js globe renders at L0 (in App.jsx
 * via UnifiedGlobe). This component renders ONLY the HUD overlay that
 * floats above the globe -- all backgrounds are transparent/glassmorphic
 * so the globe shows through.
 *
 * Layout:
 *   1. Top HUD -- dynamic state line (counts + radio status)
 *   2. LayerStrip -- 4 multi-select layer toggles (People/Intent/Drops/Safety)
 *   3. Priority strip -- contextual alerts (events, drops, surges)
 *   4. ActionBar -- floating contextual pills (Go Live, Post, Browse)
 *   5. Bottom drawer -- peek at 140px, swipe up to 55vh
 *      - Right Now (People layer) -- h-scroll avatars
 *      - Events & Beacons (Intent layer)
 *      - Drops Nearby (Commerce layer)
 *      - Pulse Feed
 *      - Radio card
 *      - Scene Scout
 *   6. Beacon FAB -- amber +, tap or long-press to create
 *   7. Legend card -- bottom-left, dismissible
 *
 * Data: TanStack Query (useQuery) with 30s refetch + Supabase realtime.
 * Animations: Framer Motion spring physics on drawer.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import RightNowModal from '@/components/globe/RightNowModal';
import { motion, useMotionValue, useAnimation, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Shield,
  Plus,
  X,
  Calendar,
  Flame,
  AlertTriangle,
  Radio as RadioIcon,
  Zap,
  Sparkles,
  Send,
  MessageSquare,
  Users,
  ShoppingBag,
  Eye,
  Disc3,
  Play,
  FileAudio,
  Music,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useGlobe } from '@/contexts/GlobeContext';
import { useRadio } from '@/contexts/RadioContext';
import { supabase } from '@/components/utils/supabaseClient';
import { format, isToday, isTomorrow } from 'date-fns';
import { useLongPress } from '@/hooks/useLongPress';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AppBanner } from '@/components/banners/AppBanner';
import { usePowerups } from '@/hooks/usePowerups';
import { useVenueIntensity, getConversionLabel, getMomentumLabel, type PlaceIntensity } from '@/hooks/useVenueIntensity';
import type { PulsePlace } from '@/hooks/usePulsePlaces';
import L2RouteSheet from '@/components/sheets/L2RouteSheet';

// ---- Brand constants --------------------------------------------------------
const AMBER = '#C8962C';
const MUTED = '#8E8E93';
const LIME = '#39FF14';
const TEAL = '#00C2E0';
const DROP_GOLD = '#FFD700';
const SAFETY_RED = '#FF3B30';

// ---- Glass utility ----------------------------------------------------------
const glassStyle = (opacity = 0.5, blur = 20): React.CSSProperties => ({
  background: `rgba(0,0,0,${opacity})`,
  backdropFilter: `blur(${blur}px)`,
  WebkitBackdropFilter: `blur(${blur}px)`,
  border: '1px solid rgba(255,255,255,0.08)',
});

// ---- Scene Scout types ------------------------------------------------------
interface SceneScoutPick {
  id: string;
  type: 'event' | 'venue';
  title: string;
  description?: string;
  score: number;
  reasons: string[];
  metadata?: { area?: string; type?: string; vibe?: string };
}

interface SceneScoutData {
  narrative: string | null;
  picks: SceneScoutPick[];
}

// ---- Types ------------------------------------------------------------------
type LayerKey = 'people' | 'intent' | 'drops' | 'safety';

interface BeaconItem {
  id: string;
  title: string;
  kind?: string;
  type?: string;
  address?: string;
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  intensity?: number;
  lat?: number;
  lng?: number;
  severity?: string;
}

interface DropItem {
  id: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  sellerName: string | null;
  createdAt: string;
  dropType?: 'preloved' | 'music_drop';
}

interface RightNowUser {
  id: string;
  userId: string;
  intent: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface PulseModeProps {
  className?: string;
}

// ---- Date helpers -----------------------------------------------------------
function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Tonight';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEE d MMM');
  } catch {
    return '';
  }
}

function formatTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

// ---- Intent color ring for Right Now users ----------------------------------
function getIntentColor(intent: string): string {
  switch (intent) {
    case 'hookup': return '#FF5500';
    case 'crowd':
    case 'hang': return TEAL;
    case 'drop':
    case 'explore': return '#A899D8';
    default: return LIME;
  }
}

// ---- Beacon type icon -------------------------------------------------------
function BeaconIcon({ kind, className = '', color }: { kind?: string; className?: string; color?: string }) {
  const style = color ? { color } : undefined;
  switch (kind) {
    case 'event':
      return <Calendar className={className} style={style} />;
    case 'safety':
      return <AlertTriangle className={className} style={style} />;
    default:
      return <Flame className={className} style={style} />;
  }
}

// ---- Beacon type color (for legend + rows) ----------------------------------
function getBeaconDotColor(kind?: string): string {
  switch (kind) {
    case 'event': return AMBER;
    case 'safety': return SAFETY_RED;
    default: return '#FFFFFF';
  }
}

// =============================================================================
// TopHUD — Dynamic state line
// =============================================================================
function TopHUD({
  city,
  stateLine,
  safetyCount,
  onSafetyTap,
  onCityTap,
}: {
  city: string;
  stateLine: string;
  safetyCount: number;
  onSafetyTap: () => void;
  onCityTap: () => void;
}) {
  return (
    <div
      className="mx-4 rounded-2xl px-4 h-14 flex items-center justify-between"
      style={glassStyle(0.5, 20)}
    >
      {/* Left: city + dynamic state line */}
      <button
        onClick={onCityTap}
        className="flex items-center gap-2 active:scale-95 transition-transform min-w-0 flex-1"
        aria-label={`City: ${city}. ${stateLine}`}
      >
        <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
        <span className="text-white font-bold text-sm truncate">{city}</span>
        <span className="text-white/40 text-[10px] flex-shrink-0 truncate max-w-[140px]">{stateLine}</span>
        <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" />
      </button>

      {/* Center: PULSE wordmark */}
      <h1
        className="text-sm font-black tracking-[0.35em] uppercase select-none flex-shrink-0 mx-2"
        style={{ color: AMBER, textShadow: `0 0 20px ${AMBER}40` }}
      >
        PULSE
      </h1>

      {/* Right: safety indicator */}
      <button
        onClick={onSafetyTap}
        className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-transform"
        aria-label={safetyCount > 0 ? `${safetyCount} safety alerts` : 'No safety alerts'}
      >
        <div className="relative">
          <Shield className="w-5 h-5 text-white/50" />
          {safetyCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#FF3B30] rounded-full animate-pulse" />
          )}
        </div>
      </button>
    </div>
  );
}

// =============================================================================
// LayerStrip — Multi-select layer toggles
// =============================================================================
const LAYERS: { key: LayerKey; label: string; color: string; icon: React.ElementType }[] = [
  { key: 'people', label: 'People', color: LIME, icon: Users },
  { key: 'intent', label: 'Intent', color: AMBER, icon: Flame },
  { key: 'drops', label: 'Drops', color: DROP_GOLD, icon: ShoppingBag },
  { key: 'safety', label: 'Safety', color: SAFETY_RED, icon: Shield },
];

function LayerStrip({
  activeLayers,
  onToggle,
  counts,
}: {
  activeLayers: Set<LayerKey>;
  onToggle: (key: LayerKey) => void;
  counts: Record<LayerKey, number>;
}) {
  return (
    <div className="mx-4 flex gap-2 overflow-x-auto scrollbar-hide py-1">
      {LAYERS.map(({ key, label, color, icon: Icon }) => {
        // Hide Safety chip unless there are alerts
        if (key === 'safety' && counts.safety === 0) return null;

        const isActive = activeLayers.has(key);
        const count = counts[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className="flex-shrink-0 h-10 px-4 rounded-full text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5"
            style={
              isActive
                ? { background: `${color}20`, border: `1.5px solid ${color}60`, color }
                : { ...glassStyle(0.5, 16), color: 'rgba(255,255,255,0.5)' }
            }
            aria-label={`Layer: ${label}${count > 0 ? ` (${count})` : ''}. ${isActive ? 'Active' : 'Inactive'}`}
            aria-pressed={isActive}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count > 0 && (
              <span className={`text-xs ${isActive ? 'opacity-80' : 'opacity-40'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// LegendCard
// =============================================================================
function LegendCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl px-3 py-2.5 flex items-center gap-3"
      style={glassStyle(0.5, 16)}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: LIME }} />
          <span className="text-[10px] text-white/60">People</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: AMBER }} />
          <span className="text-[10px] text-white/60">Intent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: DROP_GOLD }} />
          <span className="text-[10px] text-white/60">Drops</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
          <span className="text-[10px] text-white/60">Safety</span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors ml-1"
        aria-label="Dismiss legend"
      >
        <X className="w-3 h-3 text-white/50" />
      </button>
    </motion.div>
  );
}

// =============================================================================
// EventCard (horizontal scroll)
// =============================================================================
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
      className="w-[220px] flex-shrink-0 snap-start text-left active:scale-[0.97] transition-transform rounded-2xl overflow-hidden"
      style={glassStyle(0.6, 16)}
      aria-label={`View event: ${title}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-28 object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-28 flex items-center justify-center" style={{ background: `${AMBER}12` }}>
          <Calendar className="w-8 h-8" style={{ color: `${AMBER}50` }} />
        </div>
      )}
      <div className="p-3">
        <p className="text-white font-bold text-sm leading-tight line-clamp-1 mb-0.5">{title}</p>
        {venue && (
          <p className="text-xs leading-tight mb-1.5 line-clamp-1" style={{ color: MUTED }}>
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

// =============================================================================
// BeaconRow (compact list)
// =============================================================================
function BeaconRow({
  beacon,
  isLast,
  onTap,
  isFocused,
}: {
  beacon: BeaconItem;
  isLast: boolean;
  onTap: () => void;
  isFocused?: boolean;
}) {
  const dotColor = getBeaconDotColor(beacon.kind);
  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-white/5 transition-colors ${
        !isLast ? 'border-b border-white/5' : ''
      } ${isFocused ? 'border-l-2 border-[#C8962C] pl-2.5' : ''}`}
      aria-label={`View beacon: ${beacon.title}`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${dotColor}15` }}
      >
        <BeaconIcon kind={beacon.kind} className="w-4 h-4" color={dotColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{beacon.title}</p>
        {beacon.address && (
          <p className="text-xs truncate" style={{ color: MUTED }}>{beacon.address}</p>
        )}
      </div>
      <span className="text-xs font-medium flex-shrink-0" style={{ color: MUTED }}>
        {formatTimeAgo(beacon.startsAt)}
      </span>
    </button>
  );
}

// =============================================================================
// SafetyAlertCard
// =============================================================================
function SafetyAlertCard({
  beacon,
  onTap,
}: {
  beacon: BeaconItem;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="w-full p-3 rounded-xl text-left active:scale-[0.98] transition-transform"
      style={{
        background: 'rgba(255, 59, 48, 0.1)',
        border: '1px solid rgba(255, 59, 48, 0.2)',
      }}
      aria-label={`Safety alert: ${beacon.title}`}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-[#FF3B30] rounded-full animate-pulse flex-shrink-0" />
        <span className="text-[#FF6961] text-sm font-semibold truncate">{beacon.title}</span>
      </div>
      {beacon.address && (
        <p className="text-red-400/60 text-xs mt-1 truncate ml-4">{beacon.address}</p>
      )}
    </button>
  );
}

// =============================================================================
// RightNowUserCard (horizontal scroll in People layer)
// =============================================================================
function RightNowUserCard({
  user,
  onTap,
}: {
  user: RightNowUser;
  onTap: () => void;
}) {
  const intentColor = getIntentColor(user.intent);
  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16 active:scale-95 transition-transform"
      aria-label={`View profile: ${user.displayName}`}
    >
      <div
        className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
        style={{ border: `2px solid ${intentColor}`, padding: '2px' }}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-white/30" />
          </div>
        )}
      </div>
      <span className="text-[10px] text-white/70 truncate w-full text-center font-medium">
        {user.displayName}
      </span>
      <span className="text-[8px] font-bold uppercase truncate" style={{ color: intentColor }}>
        {formatTimeAgo(user.createdAt)}
      </span>
    </button>
  );
}

// =============================================================================
// DropCard (horizontal scroll in Commerce layer)
// =============================================================================
function DropCard({
  drop,
  onTap,
}: {
  drop: DropItem;
  onTap: () => void;
}) {
  const isMusic = drop.dropType === 'music_drop';
  const accentColor = isMusic ? '#9B1B2A' : DROP_GOLD;

  return (
    <button
      onClick={onTap}
      className="w-[140px] flex-shrink-0 snap-start text-left active:scale-[0.97] transition-transform rounded-xl overflow-hidden"
      style={{
        ...glassStyle(0.6, 16),
        ...(isMusic ? { border: '1px solid rgba(200,150,44,0.25)' } : {}),
      }}
      aria-label={`View drop: ${drop.title}`}
    >
      <div className="relative">
        {drop.imageUrl ? (
          <img src={drop.imageUrl} alt="" className="w-full h-[100px] object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-[100px] flex items-center justify-center" style={{ background: `${accentColor}08` }}>
            {isMusic ? (
              <Disc3 className="w-6 h-6" style={{ color: `${accentColor}60` }} />
            ) : (
              <ShoppingBag className="w-6 h-6" style={{ color: `${accentColor}40` }} />
            )}
          </div>
        )}
        {isMusic && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
            style={{ background: DROP_GOLD, color: '#000' }}
          >
            Drop
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-1">{drop.title}</p>
        {isMusic ? (
          <p className="text-[10px] font-bold mt-0.5" style={{ color: DROP_GOLD }}>
            {drop.sellerName || 'Smash Daddys'}
          </p>
        ) : drop.price != null ? (
          <p className="text-xs font-bold mt-0.5" style={{ color: DROP_GOLD }}>
            {'\u00A3'}{drop.price.toFixed(2)}
          </p>
        ) : null}
      </div>
    </button>
  );
}

// =============================================================================
// MusicDropPanel — mini release bottom sheet (replaces hard redirect to /music)
// =============================================================================
function MusicDropPanel({
  drop,
  onClose,
  onOpenMusic,
  onUnlockStems,
}: {
  drop: DropItem;
  onClose: () => void;
  onOpenMusic: () => void;
  onUnlockStems: () => void;
}) {
  const isRecent = Date.now() - new Date(drop.createdAt).getTime() < 24 * 60 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl px-6 pt-5 pb-10 z-10"
        style={{ ...glassStyle(0.85, 24), borderTop: '1px solid rgba(200,150,44,0.15)' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Content */}
        <div className="flex gap-4 items-start">
          {/* Artwork */}
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
            {drop.imageUrl ? (
              <img src={drop.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc3 className="w-8 h-8 text-[#9B1B2A]/40" />
              </div>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: isRecent ? '#30D158' : AMBER }}>
              {isRecent ? 'Live right now' : 'Trending right now'}
            </p>
            <h3 className="text-lg font-black text-white truncate mt-1">{drop.title}</h3>
            <p className="text-xs text-white/40 mt-0.5">{drop.sellerName || 'Smash Daddys'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}
          >
            <Play className="w-4 h-4" fill={AMBER} />
            Preview
          </button>
          <button
            onClick={onOpenMusic}
            className="flex-1 h-11 rounded-xl bg-[#C8962C] text-black font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Music className="w-4 h-4" />
            Open Music
          </button>
        </div>

        {/* Stems CTA */}
        <button
          onClick={onUnlockStems}
          className="w-full mt-3 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase active:scale-[0.97] transition-transform"
          style={{ background: 'rgba(155,27,42,0.08)', color: '#9B1B2A', border: '1px solid rgba(155,27,42,0.15)' }}
        >
          <FileAudio className="w-3.5 h-3.5" />
          Unlock Stems
        </button>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// UserSignalPanel — user pin micro flow
// =============================================================================
function UserSignalPanel({
  user,
  onClose,
  onViewProfile,
  onChat,
}: {
  user: { id: string; userId: string; intent: string; name: string; avatarUrl?: string; distance?: string };
  onClose: () => void;
  onViewProfile: () => void;
  onChat: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center"
    >
      <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl px-6 pt-5 pb-10 z-10"
        style={{ ...glassStyle(0.85, 24), borderTop: '1px solid rgba(200,150,44,0.12)' }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-white/5">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white/20" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">{user.name || 'Nearby'}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{user.intent} {user.distance ? `\u00B7 ${user.distance}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onViewProfile} className="flex-1 h-11 rounded-xl bg-[#C8962C] text-black font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            View Profile
          </button>
          <button onClick={onChat} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase active:scale-[0.97] transition-transform" style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}>
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// ClusterPanel — area cluster micro flow
// =============================================================================
function ClusterPanel({
  cluster,
  onClose,
  onBrowse,
  onGoLive,
}: {
  cluster: { title: string; count: number; type: string; lat: number; lng: number };
  onClose: () => void;
  onBrowse: () => void;
  onGoLive: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center"
    >
      <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl px-6 pt-5 pb-10 z-10"
        style={{ ...glassStyle(0.85, 24), borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${AMBER}15` }}>
            <Flame className="w-6 h-6" style={{ color: AMBER }} />
          </div>
          <div>
            <p className="text-white font-bold text-base">{cluster.title || 'Active Area'}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{cluster.count} signal{cluster.count !== 1 ? 's' : ''} \u00B7 {cluster.type}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onBrowse} className="flex-1 h-11 rounded-xl bg-[#C8962C] text-black font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            Browse Nearby
          </button>
          <button onClick={onGoLive} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase active:scale-[0.97] transition-transform" style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}>
            <Zap className="w-4 h-4" /> Go Live Here
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// EventPanel — event pin micro flow
// =============================================================================
function EventPanel({
  event,
  onClose,
  onView,
  onSave,
}: {
  event: { id: string; title: string; startsAt?: string; kind?: string; venue?: string };
  onClose: () => void;
  onView: () => void;
  onSave: () => void;
}) {
  const timeStr = event.startsAt ? (() => {
    const d = new Date(event.startsAt);
    if (isToday(d)) return `Today \u00B7 ${format(d, 'h:mm a')}`;
    if (isTomorrow(d)) return `Tomorrow \u00B7 ${format(d, 'h:mm a')}`;
    return format(d, 'EEE d MMM \u00B7 h:mm a');
  })() : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center"
    >
      <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl px-6 pt-5 pb-10 z-10"
        style={{ ...glassStyle(0.85, 24), borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,194,224,0.08)' }}>
            <Calendar className="w-6 h-6 text-[#00C2E0]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">{event.title}</p>
            {timeStr && <p className="text-[11px] text-white/40 mt-0.5">{timeStr}</p>}
            {event.venue && <p className="text-[10px] text-white/30 mt-0.5 truncate">{event.venue}</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onView} className="flex-1 h-11 rounded-xl bg-[#C8962C] text-black font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            View Event
          </button>
          <button onClick={onSave} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase active:scale-[0.97] transition-transform" style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}>
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// VenuePanel — venue/curated place micro flow with intensity header
// =============================================================================
function VenuePanel({
  place,
  intensity,
  distanceText,
  onClose,
  onCheckIn,
  onRoute,
}: {
  place: PulsePlace;
  intensity: PlaceIntensity | null;
  distanceText: string | null;
  onClose: () => void;
  onCheckIn: () => void;
  onRoute: () => void;
}) {
  const level = intensity?.intensity_level ?? 0;
  const count = intensity?.checkins_4h ?? 0;
  const fakeIntensity = {
    slug: place.slug, name: place.name, type: place.type,
    lat: place.lat, lng: place.lng, checkins_30m: 0, checkins_1h: 0,
    checkins_4h: count, effective_count: intensity?.effective_count ?? 0,
    intensity_level: level, momentum: intensity?.momentum ?? 0,
    last_checkin_at: intensity?.last_checkin_at ?? null,
  } as PlaceIntensity;
  const convLabel = getConversionLabel(fakeIntensity);
  const momLabel = getMomentumLabel(fakeIntensity);
  const tier = (place as any).tier || 'free';
  const isPro = tier === 'pro';
  const isCommunity = tier === 'community';
  const isGold = place.type === 'curated' || isPro;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end justify-center"
    >
      <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full rounded-t-3xl px-6 pt-5 pb-10 z-10"
        style={{ ...glassStyle(0.85, 24), borderTop: `1px solid ${isGold ? 'rgba(200,150,44,0.2)' : 'rgba(255,255,255,0.08)'}` }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

        {/* Conversion label header — only for Level 3+ */}
        {convLabel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3"
          >
            <span
              className="text-[11px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full"
              style={{
                background: level >= 4 ? 'rgba(200,150,44,0.2)' : 'rgba(255,255,255,0.08)',
                color: level >= 4 ? AMBER : '#fff',
                border: `1px solid ${level >= 4 ? 'rgba(200,150,44,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {convLabel}
            </span>
          </motion.div>
        )}

        {/* Pro tier: subtle trending label when event active or high intensity */}
        {isPro && (place as any).event_active && !convLabel && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
            <span className="text-[11px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full"
              style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}>
              FEATURED TONIGHT
            </span>
          </motion.div>
        )}
        {isPro && level >= 2 && !convLabel && !(place as any).event_active && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
            <span className="text-[11px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full"
              style={{ background: 'rgba(200,150,44,0.08)', color: `${AMBER}90`, border: '1px solid rgba(200,150,44,0.15)' }}>
              TRENDING TONIGHT
            </span>
          </motion.div>
        )}

        {/* Community tier: calm header */}
        {isCommunity && (
          <div className="mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#5588AA' }} />
            <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">Safe space</span>
          </div>
        )}

        {/* Venue info */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isCommunity ? 'rgba(85,136,170,0.08)' : isGold ? 'rgba(200,150,44,0.12)' : 'rgba(255,255,255,0.06)' }}
          >
            <MapPin className="w-6 h-6" style={{ color: isCommunity ? '#5588AA' : isGold ? AMBER : '#fff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">{place.name}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {place.notes || place.country || place.type}
              {distanceText && <span className="text-white/60 font-medium"> · {distanceText}</span>}
            </p>
          </div>
        </div>

        {/* Who's there — anonymous silhouettes (community venues: private, no public counts) */}
        {count > 0 && !isCommunity && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              {/* Silhouette dots — anonymous presence indicators */}
              <div className="flex -space-x-1.5">
                {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: isGold
                        ? `rgba(200,150,44,${0.08 + i * 0.02})`
                        : `rgba(255,255,255,${0.05 + i * 0.02})`,
                      border: `1px solid ${isGold ? 'rgba(200,150,44,0.15)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Users className="w-3 h-3" style={{ color: isGold ? `${AMBER}60` : 'rgba(255,255,255,0.25)' }} />
                  </div>
                ))}
                {count > 8 && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: isGold ? 'rgba(200,150,44,0.15)' : 'rgba(255,255,255,0.08)',
                      color: isGold ? AMBER : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${isGold ? 'rgba(200,150,44,0.2)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    +{count - 8}
                  </div>
                )}
              </div>
              <div>
                <span className="text-white text-lg font-bold">{count}</span>
                <span className="text-white/40 text-sm ml-1.5">here now</span>
              </div>
            </div>
            {momLabel && (
              <p className="text-xs font-semibold mt-1.5" style={{ color: AMBER }}>
                {momLabel}
              </p>
            )}
          </div>
        )}
        {count === 0 && !isCommunity && (
          <p className="text-white/30 text-sm mt-3">No one here yet — be the first</p>
        )}
        {isCommunity && (
          <p className="text-white/30 text-sm mt-3">Private space — check-ins are not displayed publicly</p>
        )}

        {/* CTAs */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCheckIn}
            className="flex-1 h-11 rounded-xl text-black font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{ background: isCommunity ? '#5588AA' : AMBER }}
          >
            {isCommunity ? 'Check in privately' : count === 0 ? 'Be the first' : 'Check in'}
          </button>
          {distanceText && (
            <button
              onClick={onRoute}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase active:scale-[0.97] transition-transform"
              style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}
            >
              Route · {distanceText}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// ActionBar — floating contextual pills (replaces lime FAB + purple FAB)
// =============================================================================
function ActionBar({
  onGoLive,
  onPost,
  onBrowseNearby,
  rightNowCount,
}: {
  onGoLive: () => void;
  onPost: () => void;
  onBrowseNearby: () => void;
  rightNowCount: number;
}) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {/* Go Live */}
      <button
        onClick={onGoLive}
        className="h-10 px-4 rounded-full flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform"
        style={{
          ...glassStyle(0.5, 16),
          borderColor: `${LIME}40`,
          color: LIME,
        }}
        aria-label={`Go live${rightNowCount > 0 ? ` (${rightNowCount} live now)` : ''}`}
      >
        <Zap className="w-3.5 h-3.5" />
        Go Live
        {rightNowCount > 0 && (
          <span
            className="text-[9px] font-black px-1 py-0.5 rounded-full ml-0.5"
            style={{ background: `${LIME}20` }}
          >
            {rightNowCount}
          </span>
        )}
      </button>

      {/* Post */}
      <button
        onClick={onPost}
        className="h-10 px-4 rounded-full flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform"
        style={{
          ...glassStyle(0.5, 16),
          borderColor: `${AMBER}40`,
          color: AMBER,
        }}
        aria-label="Post to Pulse"
      >
        <Send className="w-3.5 h-3.5" />
        Post
      </button>

      {/* Browse Nearby */}
      <button
        onClick={onBrowseNearby}
        className="h-10 px-4 rounded-full flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform"
        style={{
          ...glassStyle(0.5, 16),
          borderColor: `${TEAL}40`,
          color: TEAL,
        }}
        aria-label="Browse nearby profiles"
      >
        <Eye className="w-3.5 h-3.5" />
        Nearby
      </button>
    </div>
  );
}

// =============================================================================
// BeaconFAB
// =============================================================================
function BeaconFAB({ onTap, onLongPress, showPulse = false }: { onTap: () => void; onLongPress: () => void; showPulse?: boolean }) {
  const [showLabel, setShowLabel] = useState(false);

  const longPressHandlers = useLongPress(() => {
    setShowLabel(true);
    onLongPress();
    setTimeout(() => setShowLabel(false), 2000);
  }, 600);

  return (
    <div className="relative">
      {/* Tooltip label */}
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute -top-10 right-0 px-3 py-1.5 rounded-lg whitespace-nowrap"
          style={glassStyle(0.8, 8)}
        >
          <span className="text-xs font-medium text-white">Create beacon</span>
        </motion.div>
      )}
      {/* Ambient pulse ring when empty */}
      {showPulse && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${AMBER}` }}
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <button
        onClick={onTap}
        {...longPressHandlers}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
        style={{
          background: AMBER,
          boxShadow: `0 4px 24px ${AMBER}40`,
        }}
        aria-label="Create a beacon"
      >
        <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
      </button>
    </div>
  );
}

// =============================================================================
// BottomDrawer
// =============================================================================
const PEEK_HEIGHT = 140; // px visible when collapsed
const EXPANDED_HEIGHT_VH = 55; // vh when expanded

function BottomDrawer({
  events,
  beacons,
  safetyAlerts,
  rightNowUsers,
  drops,
  eventsLoading,
  beaconsLoading,
  rightNowLoading,
  dropsLoading,
  activeLayers,
  onEventTap,
  onBeaconTap,
  onSafetyTap,
  onProfileTap,
  onDropTap,
  onSeeAllEvents,
  sceneScoutSection,
  pulseFeedSection,
  focusedBeaconId,
  emptyState,
}: {
  events: BeaconItem[];
  beacons: BeaconItem[];
  safetyAlerts: BeaconItem[];
  rightNowUsers: RightNowUser[];
  drops: DropItem[];
  eventsLoading: boolean;
  beaconsLoading: boolean;
  rightNowLoading: boolean;
  dropsLoading: boolean;
  activeLayers: Set<LayerKey>;
  focusedBeaconId?: string | null;
  onEventTap: (id: string) => void;
  onBeaconTap: (id: string) => void;
  onSafetyTap: (id: string) => void;
  onProfileTap: (userId: string) => void;
  onDropTap: (id: string) => void;
  onSeeAllEvents: () => void;
  sceneScoutSection?: React.ReactNode;
  pulseFeedSection?: React.ReactNode;
  emptyState?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const controls = useAnimation();
  const dragY = useMotionValue(0);

  // Calculate maximum drawer height for the expanded state
  const getExpandedOffset = useCallback(() => {
    if (typeof window === 'undefined') return 400;
    return window.innerHeight * (EXPANDED_HEIGHT_VH / 100);
  }, []);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (expanded) {
      if (velocity > 300 || offset > 80) {
        setExpanded(false);
        controls.start({ y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } });
      } else {
        controls.start({ y: -getExpandedOffset() + PEEK_HEIGHT, transition: { type: 'spring', damping: 30, stiffness: 300 } });
      }
    } else {
      if (velocity < -300 || offset < -60) {
        setExpanded(true);
        controls.start({ y: -getExpandedOffset() + PEEK_HEIGHT, transition: { type: 'spring', damping: 30, stiffness: 300 } });
      } else {
        controls.start({ y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } });
      }
    }
  }, [expanded, controls, getExpandedOffset]);

  const toggleExpanded = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      controls.start({ y: -getExpandedOffset() + PEEK_HEIGHT, transition: { type: 'spring', damping: 30, stiffness: 300 } });
    } else {
      controls.start({ y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } });
    }
  }, [expanded, controls, getExpandedOffset]);

  const showPeople = activeLayers.has('people');
  const showIntent = activeLayers.has('intent');
  const showDrops = activeLayers.has('drops');
  const showSafety = activeLayers.has('safety');

  const hasAnyContent =
    (showPeople && (rightNowUsers.length > 0 || rightNowLoading)) ||
    (showIntent && (events.length > 0 || beacons.length > 0 || eventsLoading || beaconsLoading)) ||
    (showDrops && (drops.length > 0 || dropsLoading)) ||
    (showSafety && safetyAlerts.length > 0) ||
    !!sceneScoutSection ||
    !!pulseFeedSection;

  return (
    <motion.div
      animate={controls}
      drag="y"
      dragConstraints={{ top: -getExpandedOffset() + PEEK_HEIGHT, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      style={{
        ...glassStyle(0.65, 24),
        borderBottom: 'none',
        height: `${EXPANDED_HEIGHT_VH}vh`,
        y: dragY,
      }}
      className="rounded-t-3xl overflow-hidden touch-pan-y"
      role="region"
      aria-label="Nearby activity drawer"
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        onClick={toggleExpanded}
        role="button"
        aria-label={expanded ? 'Collapse drawer' : 'Expand drawer'}
        tabIndex={0}
      >
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Drawer header */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 rounded-full" style={{ background: AMBER }} />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Nearby now</h2>
        </div>
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-1 active:opacity-70 transition-opacity"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronUp className="w-4 h-4 text-white/40" />
          )}
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto scroll-momentum px-4 pb-8"
        style={{
          maxHeight: `calc(${EXPANDED_HEIGHT_VH}vh - 64px)`,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Empty state when nothing is live */}
        {!hasAnyContent && !eventsLoading && !beaconsLoading && !rightNowLoading && !dropsLoading && emptyState}

        {/* ---- Right Now section (People layer) ---- */}
        {showPeople && (rightNowLoading || rightNowUsers.length > 0) && (
          <section className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-0.5 h-3.5 rounded-full" style={{ background: LIME }} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Right Now</h3>
              {rightNowUsers.length > 0 && (
                <span className="text-[10px] font-bold" style={{ color: LIME }}>{rightNowUsers.length} live</span>
              )}
            </div>
            {rightNowLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-16 flex-shrink-0 flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full animate-pulse bg-white/[0.04]" />
                    <div className="h-2 w-10 animate-pulse bg-white/[0.04] rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
                {rightNowUsers.map((u) => (
                  <RightNowUserCard
                    key={u.id}
                    user={u}
                    onTap={() => onProfileTap(u.userId)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---- Events & Beacons section (Intent layer) ---- */}
        {showIntent && (eventsLoading || events.length > 0) && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3.5 rounded-full" style={{ background: AMBER }} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Events</h3>
              </div>
              {events.length > 0 && (
                <button
                  onClick={onSeeAllEvents}
                  className="text-xs font-semibold active:opacity-70 transition-opacity"
                  style={{ color: AMBER }}
                >
                  See all
                </button>
              )}
            </div>
            {eventsLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {[0, 1].map((i) => (
                  <div key={i} className="w-[220px] flex-shrink-0 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-full h-28 animate-pulse bg-white/[0.04]" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse bg-white/[0.04] rounded" />
                      <div className="h-3 w-1/2 animate-pulse bg-white/[0.04] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-4 px-4">
                {events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    title={ev.title}
                    imageUrl={ev.imageUrl}
                    venue={ev.address}
                    startsAt={ev.startsAt}
                    onTap={() => onEventTap(ev.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {showIntent && (beaconsLoading || beacons.length > 0) && (
          <section className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-0.5 h-3.5 rounded-full" style={{ background: AMBER }} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Active Beacons</h3>
            </div>
            {beaconsLoading ? (
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-white/5 last:border-0">
                    <div className="w-9 h-9 rounded-xl animate-pulse bg-white/[0.04]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-2/3 animate-pulse bg-white/[0.04] rounded" />
                      <div className="h-3 w-1/3 animate-pulse bg-white/[0.04] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {beacons.map((b, i) => (
                  <BeaconRow
                    key={b.id}
                    beacon={b}
                    isLast={i === beacons.length - 1}
                    onTap={() => onBeaconTap(b.id)}
                    isFocused={b.id === focusedBeaconId}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---- Drops Nearby section (Commerce layer) ---- */}
        {showDrops && (dropsLoading || drops.length > 0) && (
          <section className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-0.5 h-3.5 rounded-full" style={{ background: DROP_GOLD }} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Drops Nearby</h3>
              {drops.length > 0 && (
                <span className="text-[10px] font-bold" style={{ color: DROP_GOLD }}>{drops.length}</span>
              )}
            </div>
            {dropsLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-[140px] flex-shrink-0 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-full h-[100px] animate-pulse bg-white/[0.04]" />
                    <div className="p-2.5 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse bg-white/[0.04] rounded" />
                      <div className="h-3 w-1/2 animate-pulse bg-white/[0.04] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-4 px-4">
                {drops.map((d) => (
                  <DropCard
                    key={d.id}
                    drop={d}
                    onTap={() => onDropTap(d.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---- Safety alerts section ---- */}
        {showSafety && safetyAlerts.length > 0 && (
          <section className="mb-5">
            <h3 className="text-[#FF6961] text-xs font-semibold uppercase tracking-wider mb-2.5">
              Safety Alerts
            </h3>
            <div className="space-y-2">
              {safetyAlerts.map((alert) => (
                <SafetyAlertCard
                  key={alert.id}
                  beacon={alert}
                  onTap={() => onSafetyTap(alert.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Scene Scout section */}
        {sceneScoutSection}

        {/* Pulse feed section */}
        {pulseFeedSection}

        {/* Cross-links */}
        <section className="mb-5 space-y-2">
          <button
            onClick={() => window.location.assign('/ghosted')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-all"
            style={{ background: 'rgba(200,150,44,0.06)', border: '1px solid rgba(200,150,44,0.15)' }}
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold" style={{ color: AMBER }}>Who's nearby</p>
              <p className="text-[10px] text-white/40">See people around you on Ghosted</p>
            </div>
          </button>
          {events.length > 0 && (
            <button
              onClick={() => onSeeAllEvents()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-all"
              style={{ background: 'rgba(200,150,44,0.06)', border: '1px solid rgba(200,150,44,0.15)' }}
            >
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold" style={{ color: AMBER }}>Tonight's events</p>
                <p className="text-[10px] text-white/40">{events.length} event{events.length !== 1 ? 's' : ''} happening</p>
              </div>
            </button>
          )}
        </section>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main PulseMode
// =============================================================================
// ---- Vibe intent mapping (UI label -> DB enum value) -----------------------
const VIBE_INTENTS: { label: string; emoji: string; value: string }[] = [
  { label: 'OUT TONIGHT', emoji: '\uD83D\uDD25', value: 'hookup' },
  { label: 'LOOKING TO CHAT', emoji: '\uD83D\uDCAC', value: 'crowd' },
  { label: 'AT AN EVENT', emoji: '\uD83C\uDF89', value: 'drop' },
];

// ---- City -> Country code mapping -------------------------------------------
const CITY_COUNTRY: Record<string, string> = {
  london: 'GB', berlin: 'DE', amsterdam: 'NL', barcelona: 'ES',
  paris: 'FR', new_york: 'US', los_angeles: 'US', san_francisco: 'US',
  tokyo: 'JP', sydney: 'AU', rio: 'BR', las_vegas: 'US', mexico_city: 'MX',
};

// ---- Post Composer Component -----------------------------------------------
function PostComposer({ onClose, city, onPosted }: { onClose: () => void; city: string; onPosted?: () => void }) {
  const [text, setText] = useState('');
  const [vibe, setVibe] = useState('hookup');
  const [showOnGlobe, setShowOnGlobe] = useState(true);
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) { toast.error('Write something first'); return; }
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in'); return; }

      // Only request GPS when "Show on globe" is enabled
      let locationWkt: string | null = null;
      if (showOnGlobe) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: false, timeout: 5000 })
          );
          locationWkt = `SRID=4326;POINT(${pos.coords.longitude} ${pos.coords.latitude})`;
        } catch {
          // location denied -- post without coords
        }
      }

      const citySlug = city.toLowerCase().replace(/\s+/g, '_');
      const { error } = await supabase.from('right_now_posts').insert({
        user_id: user.id,
        text: text.trim(),
        intent: vibe,
        city: citySlug,
        country: CITY_COUNTRY[citySlug] ?? 'GB',
        show_on_globe: showOnGlobe,
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        ...(locationWkt ? { location: locationWkt } : {}),
      });

      if (error) throw error;
      toast.success('Posted to Pulse');
      onPosted?.();   // caller emits globe burst
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post';
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-x-0 bottom-0 z-[200] bg-[#0D0D0D] border-t border-white/10 rounded-t-3xl p-5 pb-8 pointer-events-auto"
      style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-black text-sm uppercase tracking-wider">Post to Pulse</h3>
        <button onClick={onClose} className="text-white/40 active:text-white" aria-label="Close composer"><X className="w-5 h-5" /></button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 140))}
        placeholder="What's happening right now..."
        className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl text-white text-sm p-3 h-20 resize-none focus:border-[#C8962C] focus:outline-none placeholder:text-white/20"
        maxLength={140}
      />
      <p className="text-right text-[10px] text-white/20 mt-1">{text.length}/140</p>

      <div className="flex gap-2 mt-3 flex-wrap">
        {VIBE_INTENTS.map((v) => (
          <button
            key={v.value}
            onClick={() => setVibe(v.value)}
            className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${
              vibe === v.value
                ? 'bg-[#C8962C]/20 border-[#C8962C]/40 text-[#C8962C]'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            {v.emoji} {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <label className="flex items-center gap-2 text-xs text-white/40">
          <input
            type="checkbox"
            checked={showOnGlobe}
            onChange={(e) => setShowOnGlobe(e.target.checked)}
            className="accent-[#C8962C]"
          />
          Show on globe
        </label>
        <button
          onClick={handlePost}
          disabled={posting || !text.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C8962C] text-black font-black text-sm rounded-2xl active:scale-95 transition-transform disabled:opacity-30"
        >
          {posting ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          Post
        </button>
      </div>
    </motion.div>
  );
}

export function PulseMode({ className = '' }: PulseModeProps) {
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const { isActive: isBoostActive, expiresAt: boostExpiresAt } = usePowerups();
  const { isPlaying: radioIsPlaying } = useRadio();

  // ---- Pull-to-refresh -------------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });
  const navigate = useNavigate();

  // ---- GlobeContext -- shared state drives both the Three.js canvas and this HUD
  const {
    selectedCity,
    setSelectedCity,
    activeFilter,
    setActiveFilter,
    focusedBeaconId,
    setFocusedBeaconId,
    emitPulse,
    cameraCity,
    focusedPlace,
    setFocusedPlace,
  } = useGlobe();

  // Prefer the live camera city (auto-updates as globe rotates) over the saved picker value
  const displayCity = cameraCity || selectedCity || 'London';
  const [legendDismissed, setLegendDismissed] = useState(
    () => localStorage.getItem('hm_legend_dismissed') === 'true'
  );
  const [rightNowOpen, setRightNowOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [musicDropPanelItem, setMusicDropPanelItem] = useState<DropItem | null>(null);
  const [userPanelItem, setUserPanelItem] = useState<{ id: string; userId: string; intent: string; name: string; avatarUrl?: string } | null>(null);
  const [clusterPanelItem, setClusterPanelItem] = useState<{ title: string; count: number; type: string; lat: number; lng: number } | null>(null);
  const [eventPanelItem, setEventPanelItem] = useState<{ id: string; title: string; startsAt?: string; kind?: string; venue?: string } | null>(null);
  const [venuePanelItem, setVenuePanelItem] = useState<PulsePlace | null>(null);
  const [routeDestination, setRouteDestination] = useState<{ label: string; lat: number; lng: number; type?: string; slug?: string } | null>(null);

  // Venue intensity for conversion hooks
  const { intensityMap: venueIntensityMap } = useVenueIntensity();

  // Sync focusedPlace from GlobeContext → open VenuePanel
  useEffect(() => {
    if (focusedPlace && focusedPlace.type !== 'city') {
      setVenuePanelItem(focusedPlace as PulsePlace);
      setFocusedPlace(null); // consume it
    }
  }, [focusedPlace, setFocusedPlace]);

  // ---- Layer toggle state (multi-select) ------------------------------------
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(() => new Set(['people', 'intent', 'drops']));

  const handleLayerToggle = useCallback((key: LayerKey) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Sync activeFilter in GlobeContext from layer toggles (best-effort mapping)
  useEffect(() => {
    if (activeLayers.has('intent') && activeLayers.has('people')) {
      setActiveFilter('all');
    } else if (activeLayers.has('intent') && !activeLayers.has('people')) {
      setActiveFilter('events');
    } else if (activeLayers.has('safety')) {
      setActiveFilter('safety');
    } else {
      setActiveFilter('all');
    }
  }, [activeLayers, setActiveFilter]);

  // Auto-show safety layer when alerts exist
  useEffect(() => {
    // Handled via the LayerStrip hiding the chip when count is 0
  }, []);

  // ---- Scene Scout state ----------------------------------------------------
  const [sceneScoutLoading, setSceneScoutLoading] = useState(false);
  const [sceneScoutData, setSceneScoutData] = useState<SceneScoutData | null>(null);
  const [sceneScoutOpen, setSceneScoutOpen] = useState(false);

  // City tap -> opens city-picker sheet (globe flies to selected city)
  const handleCityTap = useCallback(() => {
    openSheet('city-picker', {
      currentCity: selectedCity,
      onSelect: (c: string) => {
        setSelectedCity(c);
        localStorage.setItem('hm_city', c);
      },
    });
  }, [openSheet, selectedCity, setSelectedCity]);

  // Dismiss legend
  const handleDismissLegend = useCallback(() => {
    setLegendDismissed(true);
    localStorage.setItem('hm_legend_dismissed', 'true');
  }, []);

  // ---- Data: Upcoming events ------------------------------------------------
  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ['pulse-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, metadata, starts_at, ends_at, lat, lng, kind, type, title')
        .or(`type.eq.event,kind.eq.event`)
        .gte('ends_at', now)
        .order('starts_at', { ascending: true })
        .limit(12);
      if (error) {
        console.error('[pulse] events query error:', error.message);
        return [];
      }
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        return {
          id: b.id as string,
          title: (b.title as string) || meta.title || meta.name || 'Event',
          imageUrl: meta.image_url || undefined,
          address: meta.address || meta.venue_address || undefined,
          startsAt: b.starts_at as string,
          endsAt: b.ends_at as string,
          kind: 'event',
          type: 'event',
          lat: b.lat as number,
          lng: b.lng as number,
        } as BeaconItem;
      });
    },
    refetchInterval: 30_000,
  });

  // ---- Data: All beacons (non-event) ----------------------------------------
  const {
    data: allBeacons = [],
    isLoading: beaconsLoading,
  } = useQuery({
    queryKey: ['pulse-beacons'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, metadata, starts_at, ends_at, latitude, longitude, kind, type, intensity, title')
        .or('ends_at.is.null,ends_at.gte.' + now)
        .order('starts_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('[pulse] beacons query error:', error.message);
        return [];
      }
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        const kind = (b.kind as string) || (b.type as string) || 'hotspot';
        return {
          id: b.id as string,
          title: (b.title as string) || meta.title || meta.name || 'Beacon',
          address: meta.address || meta.venue_address || undefined,
          imageUrl: meta.image_url || undefined,
          startsAt: b.starts_at as string,
          endsAt: b.ends_at as string,
          kind,
          type: b.type as string,
          intensity: b.intensity as number,
          lat: b.latitude as number,
          lng: b.longitude as number,
          severity: meta.severity || undefined,
        } as BeaconItem;
      });
    },
    refetchInterval: 30_000,
  });

  // ---- Data: Safety alerts --------------------------------------------------
  const {
    data: safetyAlerts = [],
  } = useQuery({
    queryKey: ['pulse-safety'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, metadata, starts_at, ends_at, latitude, longitude, kind, type, title')
        .or(`type.eq.safety,kind.eq.safety`)
        .or('ends_at.is.null,ends_at.gte.' + now)
        .order('starts_at', { ascending: false })
        .limit(10);
      if (error) {
        console.error('[pulse] safety query error:', error.message);
        return [];
      }
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        return {
          id: b.id as string,
          title: (b.title as string) || meta.title || 'Safety Alert',
          address: meta.address || meta.venue_address || undefined,
          startsAt: b.starts_at as string,
          kind: 'safety',
          type: 'safety',
          severity: meta.severity || 'warning',
          lat: b.latitude as number,
          lng: b.longitude as number,
        } as BeaconItem;
      });
    },
    refetchInterval: 30_000,
  });

  // ---- Data: Pulse feed (right_now_posts) -----------------------------------
  const {
    data: pulsePosts = [],
    isLoading: postsLoading,
  } = useQuery({
    queryKey: ['pulse-feed-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('right_now_posts')
        .select(`
          id, text, intent, city, created_at, expires_at,
          crowd_count, host_beacon_id, show_on_globe,
          user_id
        `)
        .is('deleted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('[pulse] posts query error:', error.message);
        return [];
      }
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  // ---- Data: Right Now count ------------------------------------------------
  const { data: rightNowCount = 0 } = useQuery({
    queryKey: ['pulse-right-now-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('right_now_status')
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString());
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  // ---- Data: Right Now users (full rows for People layer) -------------------
  const {
    data: rightNowUsers = [],
    isLoading: rightNowUsersLoading,
  } = useQuery({
    queryKey: ['pulse-right-now-users'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('right_now_status')
        .select('id, user_id, intent, created_at, profiles!inner(display_name, avatar_url)')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('[pulse] right now users query error:', error.message);
        return [];
      }
      return (data ?? []).map((row: Record<string, unknown>) => {
        const profile = row.profiles as Record<string, unknown> | null;
        return {
          id: row.id as string,
          userId: row.user_id as string,
          intent: (row.intent as string) || 'explore',
          displayName: (profile?.display_name as string) || 'Someone',
          avatarUrl: (profile?.avatar_url as string) || null,
          createdAt: row.created_at as string,
        } as RightNowUser;
      });
    },
    refetchInterval: 30_000,
  });

  // ---- Data: Drops Nearby (preloved_listings + music_drops) ------------------
  const {
    data: dropsNearby = [],
    isLoading: dropsLoading,
  } = useQuery({
    queryKey: ['pulse-drops-nearby'],
    queryFn: async () => {
      // Fetch preloved listings
      const { data: prelovedData, error: prelovedErr } = await supabase
        .from('preloved_listings')
        .select('id, title, price, image_urls, seller_name, created_at')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(6);
      if (prelovedErr) console.error('[pulse] preloved drops error:', prelovedErr.message);

      const prelovedDrops: DropItem[] = (prelovedData ?? []).map((row: Record<string, unknown>) => {
        const imgUrls = row.image_urls as string[] | null;
        return {
          id: row.id as string,
          title: (row.title as string) || 'Listing',
          price: (row.price as number) ?? null,
          imageUrl: imgUrls?.[0] || null,
          sellerName: (row.seller_name as string) || null,
          createdAt: row.created_at as string,
          dropType: 'preloved' as const,
        };
      });

      // Fetch music drops (releases from last 24h, or latest 3)
      const { data: musicData, error: musicErr } = await supabase
        .from('label_releases')
        .select('id, title, artwork_url, catalog_number, release_date')
        .eq('is_active', true)
        .order('release_date', { ascending: false })
        .limit(3);
      if (musicErr) console.error('[pulse] music drops error:', musicErr.message);

      const musicDrops: DropItem[] = (musicData ?? []).map((row: Record<string, unknown>) => ({
        id: `music_${row.id as string}`,
        title: (row.title as string) || 'Release',
        price: null,
        imageUrl: (row.artwork_url as string) || null,
        sellerName: 'Smash Daddys',
        createdAt: (row.release_date as string) || new Date().toISOString(),
        dropType: 'music_drop' as const,
      }));

      // Merge and sort by date (newest first)
      return [...musicDrops, ...prelovedDrops].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    refetchInterval: 30_000,
  });

  // ---- Realtime subscriptions -----------------------------------------------
  useEffect(() => {
    // Beacons realtime -- immediately invalidate queries so new beacons appear
    const beaconsChannel = supabase
      .channel('pulse-beacons-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beacons' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pulse-beacons'] });
        queryClient.invalidateQueries({ queryKey: ['pulse-events'] });
        queryClient.invalidateQueries({ queryKey: ['pulse-safety'] });
      })
      .subscribe();

    // Right Now realtime
    const rightNowChannel = supabase
      .channel('pulse-right-now-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'right_now_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pulse-right-now-count'] });
        queryClient.invalidateQueries({ queryKey: ['pulse-right-now-users'] });
        queryClient.invalidateQueries({ queryKey: ['right-now-users-globe'] });
      })
      .subscribe();

    // Pulse feed realtime -- new posts appear immediately
    const postsChannel = supabase
      .channel('pulse-posts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'right_now_posts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pulse-feed-posts'] });
      })
      .subscribe();

    // Drops realtime
    const dropsChannel = supabase
      .channel('pulse-drops-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'preloved_listings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pulse-drops-nearby'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(beaconsChannel);
      supabase.removeChannel(rightNowChannel);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(dropsChannel);
    };
  }, [queryClient]);

  // ---- Filtered beacons for drawer list -------------------------------------
  const nonEventBeacons = allBeacons.filter(
    (b) => b.kind !== 'event' && b.type !== 'event' && b.kind !== 'safety' && b.type !== 'safety'
  );

  // ---- Layer counts for chips -----------------------------------------------
  const layerCounts: Record<LayerKey, number> = {
    people: rightNowCount,
    intent: events.length + nonEventBeacons.length,
    drops: dropsNearby.length,
    safety: safetyAlerts.length,
  };

  // ---- Dynamic state line for TopHUD ----------------------------------------
  const stateLines = useMemo(() => {
    const lines: string[] = [];

    const totalActive = events.length + nonEventBeacons.length;
    if (totalActive > 0 || rightNowCount > 0 || dropsNearby.length > 0) {
      const parts: string[] = [];
      if (totalActive > 0) parts.push(`${totalActive} active`);
      if (rightNowCount > 0) parts.push(`${rightNowCount} live`);
      if (dropsNearby.length > 0) parts.push(`${dropsNearby.length} drop${dropsNearby.length !== 1 ? 's' : ''}`);
      lines.push(parts.join(' \u00B7 '));
    }

    // Rotating contextual labels
    lines.push('Active right now');
    if (rightNowCount > 2) lines.push('Trending nearby');
    if (events.length > 0) lines.push('Something just started');
    if (radioIsPlaying) lines.push('Radio live');

    // Conversion hooks in state line
    if (hottestVenue) {
      const label = getConversionLabel(hottestVenue as PlaceIntensity);
      if (label) lines.push(`${hottestVenue.name} · ${label}`);
    }

    return lines;
  }, [events.length, nonEventBeacons.length, rightNowCount, dropsNearby.length, radioIsPlaying, hottestVenue]);

  // Rotate through state lines every 4s
  const [stateLineIdx, setStateLineIdx] = useState(0);
  useEffect(() => {
    if (stateLines.length <= 1) return;
    const t = setInterval(() => setStateLineIdx(i => (i + 1) % stateLines.length), 4000);
    return () => clearInterval(t);
  }, [stateLines.length]);

  const stateLine = stateLines[stateLineIdx % stateLines.length] || 'Active right now';

  // ---- Priority beacon -- highest-intensity event starting within 24 h ------
  const priorityBeacon = useMemo(() => {
    const in24h = events.filter((e) => {
      if (!e.startsAt) return false;
      const diff = new Date(e.startsAt).getTime() - Date.now();
      return diff > 0 && diff < 24 * 60 * 60 * 1000;
    });
    if (in24h.length === 0) return null;
    return in24h.sort((a, b) => ((b.intensity ?? 0) - (a.intensity ?? 0)))[0];
  }, [events]);

  // ---- Priority alerts (drops + surges) ------------------------------------
  const priorityDropAlert = useMemo(() => {
    if (dropsNearby.length === 0) return null;
    const newest = dropsNearby[0];
    const age = Date.now() - new Date(newest.createdAt).getTime();
    // Only show if drop was created in last 30 minutes
    if (age > 30 * 60 * 1000) return null;
    return newest;
  }, [dropsNearby]);

  // ---- Hottest venue alert (conversion hook in priority strip) ---------------
  const hottestVenue = useMemo(() => {
    const entries = Array.from(venueIntensityMap.values());
    const hot = entries.filter(v => v.intensity_level >= 3).sort((a, b) => b.intensity_level - a.intensity_level || b.effective_count - a.effective_count);
    return hot[0] ?? null;
  }, [venueIntensityMap]);

  // ---- Sheet navigation handlers --------------------------------------------
  const handleEventTap = useCallback((id: string) => {
    openSheet('event', { id });
  }, [openSheet]);

  const handleBeaconTap = useCallback((id: string) => {
    setFocusedBeaconId(id);          // globe rotates to beacon + scales it
    openSheet('beacon', { beaconId: id });
  }, [openSheet, setFocusedBeaconId]);

  const handleSafetyTap = useCallback((id: string) => {
    openSheet('beacon', { beaconId: id });
  }, [openSheet]);

  const handleProfileTap = useCallback((userId: string) => {
    openSheet('profile', { id: userId });
  }, [openSheet]);

  const handleDropTap = useCallback((id: string) => {
    if (id.startsWith('music_')) {
      const drop = dropsNearby.find((d) => d.id === id);
      if (drop) {
        setMusicDropPanelItem(drop);
      } else {
        navigate('/music');
      }
    } else {
      openSheet('preloved', { id });
    }
  }, [openSheet, navigate, dropsNearby]);

  // Venue panel open handler — called from Globe.jsx onPlaceClick
  const handleVenueTap = useCallback((place: PulsePlace) => {
    setVenuePanelItem(place);
  }, []);

  // Proximity: simple haversine distance for "X min away"
  const getProximityText = useCallback((lat: number, lng: number): string | null => {
    if (!navigator.geolocation) return null;
    // Use cached position if available
    const pos = (window as any).__hm_last_pos;
    if (!pos?.lat || !pos?.lng) return null;
    const R = 6371; // km
    const dLat = (lat - pos.lat) * Math.PI / 180;
    const dLng = (lng - pos.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(pos.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d > 3) return null; // too far, don't show
    const walkMin = Math.round(d / 0.08); // ~5km/h walking
    if (walkMin <= 2) return '2 min walk';
    if (walkMin <= 20) return `${walkMin} min walk`;
    const rideMin = Math.max(3, Math.round(d / 0.5)); // ~30km/h ride
    return `${rideMin} min ride`;
  }, []);

  // Cache user position for proximity
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { (window as any).__hm_last_pos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleCreateBeacon = useCallback(() => {
    openSheet('beacon', { mode: 'create' });
  }, [openSheet]);

  const handleAmplify = useCallback(() => {
    openSheet('amplify', {});
  }, [openSheet]);

  const handleSeeAllEvents = useCallback(() => {
    openSheet('events', {});
  }, [openSheet]);

  // Safety indicator tap -> toggle safety layer
  const handleSafetyIndicatorTap = useCallback(() => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has('safety')) {
        next.delete('safety');
      } else {
        next.add('safety');
      }
      return next;
    });
  }, []);

  // ---- Scene Scout handler (CHROME gated) -----------------------------------
  const handleSceneScout = useCallback(async () => {
    if (sceneScoutLoading) return;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) {
        toast('Sign in to use Scene Scout');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('email', authUser.email)
        .single();

      const tier = (profile?.subscription_tier || 'FREE').toUpperCase();
      if (tier !== 'CHROME' && tier !== 'ELITE') {
        toast('Upgrade to CHROME to unlock Scene Scout', {
          style: { background: '#1C1C1E', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        });
        return;
      }

      setSceneScoutLoading(true);
      setSceneScoutOpen(true);
      setSceneScoutData(null);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/scene-scout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ userEmail: authUser.email }),
      });

      if (!res.ok) throw new Error('Scene Scout error');
      const data = await res.json();
      setSceneScoutData({ narrative: data.narrative, picks: data.picks || [] });
    } catch {
      toast.error('Scene Scout is resting. Try again later.');
      setSceneScoutOpen(false);
    } finally {
      setSceneScoutLoading(false);
    }
  }, [sceneScoutLoading]);

  // ---- Scene Scout section JSX (passed into BottomDrawer) -------------------
  const sceneScoutSection = (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: AMBER }} />
          Scene Scout
          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded" style={{ background: `${AMBER}20`, color: AMBER }}>CHROME</span>
        </h3>
        {sceneScoutOpen && (
          <button
            onClick={() => { setSceneScoutOpen(false); setSceneScoutData(null); }}
            className="text-white/30 active:text-white/60 transition-colors"
            aria-label="Close Scene Scout"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!sceneScoutOpen ? (
        <button
          onClick={handleSceneScout}
          className="w-full py-3 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{
            background: `${AMBER}15`,
            border: `1px solid ${AMBER}40`,
            color: AMBER,
          }}
          aria-label="Get AI nightlife recommendations"
        >
          <Sparkles className="w-4 h-4" />
          Where should I go tonight?
        </button>
      ) : sceneScoutLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(200,150,44,0.08)' }} />
          ))}
        </div>
      ) : sceneScoutData ? (
        <div className="space-y-2">
          {sceneScoutData.narrative && (
            <p className="text-white/60 text-xs leading-relaxed mb-3">{sceneScoutData.narrative}</p>
          )}
          {sceneScoutData.picks.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Nothing matched tonight. Drop a beacon!</p>
          ) : (
            sceneScoutData.picks.slice(0, 3).map((pick) => (
              <div
                key={pick.id}
                className="px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{pick.title}</p>
                    {pick.metadata?.area && (
                      <p className="text-white/40 text-xs">{pick.metadata.area}</p>
                    )}
                    {pick.reasons?.[0] && (
                      <p className="text-xs mt-1" style={{ color: AMBER }}>{pick.reasons[0]}</p>
                    )}
                  </div>
                  <span
                    className="flex-shrink-0 text-xs font-black px-1.5 py-0.5 rounded"
                    style={{ background: `${AMBER}20`, color: AMBER }}
                  >
                    {pick.type === 'event' ? '\uD83D\uDCC5' : '\uD83D\uDCCD'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );

  // ---- Pulse feed section JSX (radio card + posts) --------------------------
  const pulseFeedSection = (
    <section className="mb-5">
      {/* Radio card -- always pinned */}
      <button
        onClick={() => navigate('/radio')}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3 active:scale-[0.98] transition-all"
        style={{ background: '#00C2E015', border: '1px solid #00C2E030' }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#00C2E020' }}>
          <RadioIcon className="w-4 h-4" style={{ color: TEAL }} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold text-white/80 truncate">HOTMESS RADIO</p>
          <p className="text-[10px] text-white/40 truncate">
            {radioIsPlaying ? 'Playing now' : 'Late Night Mess'}
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: '#00C2E020', color: TEAL }}>
          {radioIsPlaying ? '\u23F8 PLAYING' : '\u25B6 LISTEN'}
        </span>
      </button>

      {/* Posts feed */}
      <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
        <MessageSquare className="w-3.5 h-3.5" style={{ color: '#A855F7' }} />
        Pulse Feed
      </h3>
      {postsLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(168,85,247,0.06)' }} />
          ))}
        </div>
      ) : pulsePosts.length === 0 ? (
        <p className="text-white/20 text-xs text-center py-6">
          No pulse posts yet. Be the first -- tap Post above.
        </p>
      ) : (
        <div className="space-y-2">
          {pulsePosts.map((post: Record<string, unknown>) => (
            <div
              key={String(post.id)}
              className="px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#A855F7]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3 h-3" style={{ color: '#A855F7' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white/70 text-xs leading-relaxed">{String(post.text || '')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {post.intent && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: '#A855F720', color: '#A855F7' }}>
                        {VIBE_INTENTS.find(v => v.value === post.intent)?.label || String(post.intent)}
                      </span>
                    )}
                    <span className="text-[10px] text-white/20">{formatTimeAgo(String(post.created_at || ''))}</span>
                    {post.city && <span className="text-[10px] text-white/15 capitalize">{String(post.city)}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // ---- Behavioral empty state -----------------------------------------------
  const emptyState = (
    <div className="flex flex-col items-center py-10">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: `${AMBER}10` }}>
        <Zap className="w-8 h-8" style={{ color: MUTED }} />
      </div>
      <p className="text-white text-base font-bold mb-1">Nothing live nearby</p>
      <p className="text-sm text-center mb-5" style={{ color: MUTED }}>
        Be the signal
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setRightNowOpen(true)}
          className="h-12 px-6 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          style={{ background: `${LIME}15`, border: `1.5px solid ${LIME}40`, color: LIME }}
        >
          Go Live
        </button>
        <button
          onClick={handleCreateBeacon}
          className="h-12 px-6 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          style={{ background: `${AMBER}15`, border: `1.5px solid ${AMBER}40`, color: AMBER }}
        >
          Drop a Beacon
        </button>
      </div>
    </div>
  );

  // ---- Render ---------------------------------------------------------------
  return (
    <div className={`h-full w-full relative pointer-events-none ${className}`}>
      {/* All interactive children get pointer-events-auto so the globe
          remains clickable through the transparent regions of this overlay */}

      {/* Top HUD */}
      <div
        className="fixed top-0 left-0 right-0 z-40 pointer-events-auto"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <div className="space-y-3 pt-1">
          <TopHUD
            city={displayCity}
            stateLine={stateLine}
            safetyCount={safetyAlerts.length}
            onSafetyTap={handleSafetyIndicatorTap}
            onCityTap={handleCityTap}
          />

          {/* Priority alert strip -- highest-intensity event starting within 24 h */}
          {priorityBeacon && (
            <div
              className="mx-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'rgba(200,150,44,0.12)', border: '1px solid rgba(200,150,44,0.25)', color: '#C8962C' }}
              onClick={() => handleBeaconTap(priorityBeacon.id)}
              role="button"
              aria-label={`Priority event: ${priorityBeacon.title}`}
            >
              <Flame className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate flex-1">{priorityBeacon.title}</span>
              <span className="flex-shrink-0 text-white/40 font-normal">
                {priorityBeacon.startsAt
                  ? isToday(new Date(priorityBeacon.startsAt))
                    ? `Tonight \u00B7 ${format(new Date(priorityBeacon.startsAt), 'HH:mm')}`
                    : isTomorrow(new Date(priorityBeacon.startsAt))
                    ? `Tomorrow \u00B7 ${format(new Date(priorityBeacon.startsAt), 'HH:mm')}`
                    : format(new Date(priorityBeacon.startsAt), 'MMM d \u00B7 HH:mm')
                  : ''}
              </span>
            </div>
          )}

          {/* Drop alert strip -- new drop in last 30 min */}
          {!priorityBeacon && priorityDropAlert && (
            <div
              className="mx-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: `${DROP_GOLD}12`, border: `1px solid ${DROP_GOLD}25`, color: DROP_GOLD }}
              onClick={() => handleDropTap(priorityDropAlert.id)}
              role="button"
              aria-label={`New drop: ${priorityDropAlert.title}`}
            >
              <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate flex-1">{priorityDropAlert.title}</span>
              <span className="flex-shrink-0 text-white/40 font-normal">
                {formatTimeAgo(priorityDropAlert.createdAt)}
              </span>
            </div>
          )}

          {/* Right Now surge strip */}
          {!priorityBeacon && !priorityDropAlert && rightNowCount >= 5 && (
            <div
              className="mx-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: `${LIME}10`, border: `1px solid ${LIME}20`, color: LIME }}
              onClick={() => setRightNowOpen(true)}
              role="button"
              aria-label={`${rightNowCount} people just went live nearby`}
            >
              <Zap className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate flex-1">{rightNowCount} people live nearby</span>
            </div>
          )}

          {/* Venue conversion strip — hottest venue Level 3+ */}
          {!priorityBeacon && !priorityDropAlert && rightNowCount < 5 && hottestVenue && (() => {
            const fakeI = { ...hottestVenue } as PlaceIntensity;
            const label = getConversionLabel(fakeI);
            const mom = getMomentumLabel(fakeI);
            return (
              <div
                className="mx-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform"
                style={{
                  background: hottestVenue.intensity_level >= 4 ? 'rgba(200,150,44,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${hottestVenue.intensity_level >= 4 ? 'rgba(200,150,44,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: hottestVenue.intensity_level >= 4 ? AMBER : '#fff',
                }}
                onClick={() => {
                  // Find the place data and open venue panel
                  setVenuePanelItem({ slug: hottestVenue.slug, name: hottestVenue.name, type: hottestVenue.type as any, lat: hottestVenue.lat, lng: hottestVenue.lng } as PulsePlace);
                }}
                role="button"
                aria-label={`${hottestVenue.name}: ${label}`}
              >
                <Flame className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate flex-1">
                  {hottestVenue.name} · {label || 'Active'}
                </span>
                {mom && <span className="flex-shrink-0 text-white/40 font-normal">{mom}</span>}
              </div>
            );
          })()}

          <LayerStrip
            activeLayers={activeLayers}
            onToggle={handleLayerToggle}
            counts={layerCounts}
          />
        </div>
      </div>

      {/* Dynamic Pulse banner */}
      <div className="fixed left-4 right-4 z-30 pointer-events-auto" style={{ top: 'calc(110px + env(safe-area-inset-top, 0px))' }}>
        <AppBanner placement="pulse_top" variant="subtle" />
      </div>

      {/* Legend card (bottom-left, above drawer) */}
      {!legendDismissed && (
        <div className="fixed left-4 z-30 pointer-events-auto" style={{ bottom: 'calc(280px + env(safe-area-inset-bottom, 0px))' }}>
          <LegendCard onDismiss={handleDismissLegend} />
        </div>
      )}

      {/* Amplify + Globe Glow pills (bottom-right, above FAB) */}
      <div className="fixed right-4 z-[45] pointer-events-auto flex flex-col gap-2 items-end" style={{ bottom: 'calc(250px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Globe Glow toggle */}
        <button
          onClick={() => {
            if (isBoostActive('globe_glow')) {
              const exp = boostExpiresAt('globe_glow');
              const m = exp ? Math.round((exp.getTime() - Date.now()) / 60000) : 0;
              toast(`Globe Glow active - ${m < 60 ? `${m}m` : `${Math.round(m / 60)}h`} left`, {
                style: { background: '#1C1C1E', color: '#C8962C', border: '1px solid rgba(200,150,44,0.3)' },
              });
            } else {
              openSheet('boost-shop', {});
            }
          }}
          className="flex items-center gap-1.5 px-3.5 h-10 rounded-full text-xs font-bold transition-all active:scale-95"
          style={{
            background: isBoostActive('globe_glow') ? 'rgba(200,150,44,0.15)' : 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isBoostActive('globe_glow') ? `1.5px solid ${AMBER}` : `1px solid ${AMBER}40`,
            color: AMBER,
            boxShadow: isBoostActive('globe_glow') ? `0 0 20px ${AMBER}30` : 'none',
          }}
          aria-label={isBoostActive('globe_glow') ? 'Globe Glow active' : 'Activate Globe Glow'}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isBoostActive('globe_glow') ? 'Glowing' : 'Glow'}
        </button>

        <button
          onClick={handleAmplify}
          className="flex items-center gap-1.5 px-3.5 h-10 rounded-full text-xs font-bold transition-all active:scale-95"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${AMBER}40`,
            color: AMBER,
          }}
          aria-label="Amplify your venue"
        >
          <Zap className="w-3.5 h-3.5" />
          Amplify
        </button>
      </div>

      {/* ActionBar (floating, centered, above bottom drawer) */}
      <div className="fixed left-0 right-0 z-[45] pointer-events-auto flex justify-center" style={{ bottom: 'calc(230px + env(safe-area-inset-bottom, 0px))' }}>
        <ActionBar
          onGoLive={() => setRightNowOpen(true)}
          onPost={() => setComposerOpen(true)}
          onBrowseNearby={() => navigate('/ghosted')}
          rightNowCount={rightNowCount}
        />
      </div>

      {/* Beacon FAB (bottom-right, above nav) */}
      <div className="fixed bottom-24 right-4 z-[45] pointer-events-auto">
        <BeaconFAB
          onTap={handleCreateBeacon}
          onLongPress={handleCreateBeacon}
          showPulse={allBeacons.length === 0 && !beaconsLoading}
        />
      </div>

      {/* Right Now Modal */}
      <RightNowModal isOpen={rightNowOpen} onClose={() => setRightNowOpen(false)} />

      {/* Bottom Drawer */}
      <div
        className="fixed left-0 right-0 z-40 pointer-events-auto"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        <BottomDrawer
          events={events}
          beacons={nonEventBeacons}
          safetyAlerts={safetyAlerts}
          rightNowUsers={rightNowUsers}
          drops={dropsNearby}
          eventsLoading={eventsLoading}
          beaconsLoading={beaconsLoading}
          rightNowLoading={rightNowUsersLoading}
          dropsLoading={dropsLoading}
          activeLayers={activeLayers}
          onEventTap={handleEventTap}
          onBeaconTap={handleBeaconTap}
          onSafetyTap={handleSafetyTap}
          onProfileTap={handleProfileTap}
          onDropTap={handleDropTap}
          onSeeAllEvents={handleSeeAllEvents}
          sceneScoutSection={sceneScoutSection}
          pulseFeedSection={pulseFeedSection}
          focusedBeaconId={focusedBeaconId}
          emptyState={emptyState}
        />
      </div>

      {/* Post composer sheet */}
      {composerOpen && (
        <PostComposer
          onClose={() => setComposerOpen(false)}
          city={displayCity}
          onPosted={() => {
            // Emit a burst pulse into the globe so new posts ripple visually
            emitPulse({ type: 'burst', lat: 0, lng: 0 });
          }}
        />
      )}

      {/* ── Micro Flow Panels ─────────────────────────────────────────── */}
      <AnimatePresence>
        {musicDropPanelItem && (
          <MusicDropPanel
            drop={musicDropPanelItem}
            onClose={() => setMusicDropPanelItem(null)}
            onOpenMusic={() => { setMusicDropPanelItem(null); navigate('/music'); }}
            onUnlockStems={() => { setMusicDropPanelItem(null); navigate('/music'); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {userPanelItem && (
          <UserSignalPanel
            user={userPanelItem}
            onClose={() => setUserPanelItem(null)}
            onViewProfile={() => { setUserPanelItem(null); openSheet('profile', { id: userPanelItem.userId }); }}
            onChat={() => { setUserPanelItem(null); openSheet('chat', { profileId: userPanelItem.userId }); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clusterPanelItem && (
          <ClusterPanel
            cluster={clusterPanelItem}
            onClose={() => setClusterPanelItem(null)}
            onBrowse={() => { setClusterPanelItem(null); navigate('/ghosted'); }}
            onGoLive={() => { setClusterPanelItem(null); setRightNowOpen(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {eventPanelItem && (
          <EventPanel
            event={eventPanelItem}
            onClose={() => setEventPanelItem(null)}
            onView={() => { setEventPanelItem(null); openSheet('event', { id: eventPanelItem.id }); }}
            onSave={() => { setEventPanelItem(null); toast('Saved'); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {venuePanelItem && (
          <VenuePanel
            place={venuePanelItem}
            intensity={venueIntensityMap.get(venuePanelItem.slug) ?? null}
            distanceText={getProximityText(venuePanelItem.lat, venuePanelItem.lng)}
            onClose={() => setVenuePanelItem(null)}
            onCheckIn={() => { setVenuePanelItem(null); navigate(`/v/${venuePanelItem.slug}`); }}
            onRoute={() => {
              const dest = { label: venuePanelItem.name, lat: venuePanelItem.lat, lng: venuePanelItem.lng, type: 'pulse_place', slug: venuePanelItem.slug };
              setVenuePanelItem(null);
              setRouteDestination(dest);
            }}
          />
        )}
      </AnimatePresence>

      {/* Route Sheet */}
      <AnimatePresence>
        {routeDestination && (
          <L2RouteSheet
            destination={routeDestination}
            onClose={() => setRouteDestination(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default PulseMode;
