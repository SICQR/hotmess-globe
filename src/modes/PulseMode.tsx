/**
 * PulseMode -- Globe HUD Overlay (route: /pulse)
 *
 * The immersive globe mode. The Three.js globe renders at L0 (in App.jsx
 * via UnifiedGlobe). This component renders ONLY the HUD overlay that
 * floats above the globe -- all backgrounds are transparent/glassmorphic
 * so the globe shows through.
 *
 * Layout:
 *   1. Top HUD -- city + beacon count | PULSE wordmark | safety indicator
 *   2. Filter chip strip -- All | Events | Hotspots | Safety
 *   3. Bottom drawer -- peek at 80px, swipe up to 50vh
 *      - Upcoming Events (h-scroll cards)
 *      - Active Beacons (compact list)
 *      - Safety Alerts (red-tinted cards)
 *   4. Beacon FAB -- amber +, tap or long-press to create
 *   5. Legend card -- bottom-left, dismissible
 *
 * Data: TanStack Query (useQuery) with 30s refetch + Supabase realtime.
 * Animations: Framer Motion spring physics on drawer.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import RightNowModal from '@/components/globe/RightNowModal';
import { motion, useMotionValue, useAnimation, PanInfo } from 'framer-motion';
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
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { format, isToday, isTomorrow } from 'date-fns';
import { useLongPress } from '@/hooks/useLongPress';
import { toast } from 'sonner';

// ---- Brand constants --------------------------------------------------------
const AMBER = '#C8962C';
const MUTED = '#8E8E93';
const GLASS = 'bg-black/50 backdrop-blur-xl';
const GLASS_BORDER = 'border border-white/10';

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
type FilterType = 'all' | 'events' | 'hotspots' | 'safety';

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
    case 'safety': return '#FF3B30';
    default: return '#FFFFFF';
  }
}

// =============================================================================
// TopHUD
// =============================================================================
function TopHUD({
  city,
  beaconCount,
  safetyCount,
  rightNowCount,
  onSafetyTap,
  onCityTap,
}: {
  city: string;
  beaconCount: number;
  safetyCount: number;
  rightNowCount: number;
  onSafetyTap: () => void;
  onCityTap: () => void;
}) {
  return (
    <div
      className="mx-4 rounded-2xl px-4 h-14 flex items-center justify-between"
      style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Left: city + beacon count */}
      <button
        onClick={onCityTap}
        className="flex items-center gap-2 active:scale-95 transition-transform min-w-0"
        aria-label={`City: ${city}. ${beaconCount} active beacons.`}
      >
        <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
        <span className="text-white font-bold text-sm truncate">{city}</span>
        <span className="text-white/40 text-xs flex-shrink-0">{beaconCount} active</span>
        {rightNowCount > 0 && (
          <span
            className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: '#39FF1430', color: '#39FF14', border: '1px solid #39FF1440' }}
          >
            {rightNowCount} live
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" />
      </button>

      {/* Center: PULSE wordmark */}
      <h1
        className="text-sm font-black tracking-[0.35em] uppercase select-none flex-shrink-0"
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
// FilterChipStrip
// =============================================================================
const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'events', label: 'Events' },
  { key: 'hotspots', label: 'Hotspots' },
  { key: 'safety', label: 'Safety' },
];

function FilterChipStrip({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: FilterType;
  onFilterChange: (f: FilterType) => void;
  counts: Record<FilterType, number>;
}) {
  return (
    <div className="mx-4 flex gap-2 overflow-x-auto scrollbar-hide py-1">
      {FILTERS.map(({ key, label }) => {
        const isActive = activeFilter === key;
        const count = counts[key];
        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`flex-shrink-0 h-10 px-4 rounded-full text-sm font-medium transition-all active:scale-95 ${
              isActive
                ? 'text-white shadow-lg'
                : `${GLASS} ${GLASS_BORDER} text-white/70`
            }`}
            style={isActive ? { background: AMBER } : undefined}
            aria-label={`Filter: ${label}${count > 0 ? ` (${count})` : ''}`}
            aria-pressed={isActive}
          >
            {label}
            {key !== 'all' && count > 0 && (
              <span className={`ml-1.5 ${isActive ? 'text-white/80' : 'text-white/40'}`}>
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
      style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: AMBER }} />
          <span className="text-[10px] text-white/60">Event</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span className="text-[10px] text-white/60">Hotspot</span>
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
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
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
}: {
  beacon: BeaconItem;
  isLast: boolean;
  onTap: () => void;
}) {
  const dotColor = getBeaconDotColor(beacon.kind);
  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-white/5 transition-colors ${
        !isLast ? 'border-b border-white/5' : ''
      }`}
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
          style={{
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
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
const EXPANDED_HEIGHT_VH = 50; // vh when expanded

function BottomDrawer({
  events,
  beacons,
  safetyAlerts,
  eventsLoading,
  beaconsLoading,
  onEventTap,
  onBeaconTap,
  onSafetyTap,
  onSeeAllEvents,
  sceneScoutSection,
}: {
  events: BeaconItem[];
  beacons: BeaconItem[];
  safetyAlerts: BeaconItem[];
  eventsLoading: boolean;
  beaconsLoading: boolean;
  onEventTap: (id: string) => void;
  onBeaconTap: (id: string) => void;
  onSafetyTap: (id: string) => void;
  onSeeAllEvents: () => void;
  sceneScoutSection?: React.ReactNode;
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
      // Currently expanded: swipe down to collapse
      if (velocity > 300 || offset > 80) {
        setExpanded(false);
        controls.start({ y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } });
      } else {
        controls.start({ y: -getExpandedOffset() + PEEK_HEIGHT, transition: { type: 'spring', damping: 30, stiffness: 300 } });
      }
    } else {
      // Currently collapsed: swipe up to expand
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

  const hasContent = events.length > 0 || beacons.length > 0 || safetyAlerts.length > 0 || eventsLoading || beaconsLoading || !!sceneScoutSection;

  if (!hasContent && !eventsLoading && !beaconsLoading) return null;

  return (
    <motion.div
      animate={controls}
      drag="y"
      dragConstraints={{ top: -getExpandedOffset() + PEEK_HEIGHT, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      style={{ y: dragY }}
      className="rounded-t-3xl overflow-hidden touch-pan-y"
      role="region"
      aria-label="Nearby activity drawer"
      {...{
        style: {
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          height: `${EXPANDED_HEIGHT_VH}vh`,
          y: dragY,
        }
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        onClick={toggleExpanded}
        role="button"
        aria-label={expanded ? 'Collapse drawer' : 'Expand drawer'}
        tabIndex={0}
      >
        <div className="w-10 h-1 rounded-full bg-white/30" />
      </div>

      {/* Drawer header */}
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="text-white font-bold text-base">Nearby now</h2>
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
        className="overflow-y-auto overscroll-contain px-4 pb-8"
        style={{
          maxHeight: `calc(${EXPANDED_HEIGHT_VH}vh - 64px)`,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Scene Scout section */}
        {sceneScoutSection}

        {/* Events section */}
        {(eventsLoading || events.length > 0) && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                Upcoming Events
              </h3>
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

        {/* Beacons section */}
        {(beaconsLoading || beacons.length > 0) && (
          <section className="mb-5">
            <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2.5">
              Active Beacons
            </h3>
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
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Safety alerts section */}
        {safetyAlerts.length > 0 && (
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

        {/* Empty state (all sections empty after load) */}
        {!eventsLoading && !beaconsLoading && events.length === 0 && beacons.length === 0 && safetyAlerts.length === 0 && (
          <div className="flex flex-col items-center py-8">
            <RadioIcon className="w-10 h-10 mb-3" style={{ color: MUTED }} />
            <p className="text-white text-sm font-semibold mb-1">Nothing nearby right now</p>
            <p className="text-xs text-center" style={{ color: MUTED }}>
              Drop a beacon to let people know what is happening
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main PulseMode
// =============================================================================
export function PulseMode({ className = '' }: PulseModeProps) {
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [city, setCity] = useState(() => localStorage.getItem('hm_city') || 'London');
  const [legendDismissed, setLegendDismissed] = useState(
    () => localStorage.getItem('hm_legend_dismissed') === 'true'
  );
  const [rightNowOpen, setRightNowOpen] = useState(false);

  // ---- Scene Scout state ----------------------------------------------------
  const [sceneScoutLoading, setSceneScoutLoading] = useState(false);
  const [sceneScoutData, setSceneScoutData] = useState<SceneScoutData | null>(null);
  const [sceneScoutOpen, setSceneScoutOpen] = useState(false);

  // City cycling
  const handleCityTap = useCallback(() => {
    const CITIES = ['London', 'Berlin', 'New York', 'Barcelona', 'Amsterdam'];
    const idx = CITIES.indexOf(city);
    const next = CITIES[(idx + 1) % CITIES.length];
    setCity(next);
    localStorage.setItem('hm_city', next);
  }, [city]);

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
        .select('id, metadata, starts_at, end_at, lat, lng, kind, type')
        .or(`type.eq.event,kind.eq.event`)
        .gte('end_at', now)
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
          title: meta.title || meta.name || 'Event',
          imageUrl: meta.image_url || undefined,
          address: meta.address || undefined,
          startsAt: b.starts_at as string,
          endsAt: b.end_at as string,
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
        .select('id, metadata, starts_at, end_at, lat, lng, kind, type, intensity')
        .or('end_at.is.null,end_at.gte.' + now)
        .order('created_at', { ascending: false })
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
          title: meta.title || meta.name || 'Beacon',
          address: meta.address || undefined,
          imageUrl: meta.image_url || undefined,
          startsAt: b.starts_at as string,
          endsAt: b.end_at as string,
          kind,
          type: b.type as string,
          intensity: b.intensity as number,
          lat: b.lat as number,
          lng: b.lng as number,
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
        .select('id, metadata, starts_at, end_at, lat, lng, kind, type')
        .or(`type.eq.safety,kind.eq.safety`)
        .or('end_at.is.null,end_at.gte.' + now)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        console.error('[pulse] safety query error:', error.message);
        return [];
      }
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        return {
          id: b.id as string,
          title: meta.title || 'Safety Alert',
          address: meta.address || undefined,
          startsAt: b.starts_at as string,
          kind: 'safety',
          type: 'safety',
          severity: meta.severity || 'warning',
          lat: b.lat as number,
          lng: b.lng as number,
        } as BeaconItem;
      });
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
        .eq('active', true)
        .gt('expires_at', new Date().toISOString());
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  // ---- Realtime subscriptions -----------------------------------------------
  useEffect(() => {
    // Beacons realtime — immediately invalidate queries so new beacons appear
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
        queryClient.invalidateQueries({ queryKey: ['right-now-users-globe'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(beaconsChannel);
      supabase.removeChannel(rightNowChannel);
    };
  }, [queryClient]);

  // ---- Filtered beacons for drawer list -------------------------------------
  const nonEventBeacons = allBeacons.filter(
    (b) => b.kind !== 'event' && b.type !== 'event' && b.kind !== 'safety' && b.type !== 'safety'
  );

  const filteredBeacons = (() => {
    switch (activeFilter) {
      case 'events':
        return { events, beacons: [], safety: [] };
      case 'hotspots':
        return { events: [], beacons: nonEventBeacons, safety: [] };
      case 'safety':
        return { events: [], beacons: [], safety: safetyAlerts };
      default:
        return { events, beacons: nonEventBeacons, safety: safetyAlerts };
    }
  })();

  // ---- Counts for chips -----------------------------------------------------
  const filterCounts: Record<FilterType, number> = {
    all: events.length + nonEventBeacons.length + safetyAlerts.length,
    events: events.length,
    hotspots: nonEventBeacons.length,
    safety: safetyAlerts.length,
  };

  // ---- Sheet navigation handlers --------------------------------------------
  const handleEventTap = useCallback((id: string) => {
    openSheet('event', { id });
  }, [openSheet]);

  const handleBeaconTap = useCallback((id: string) => {
    openSheet('beacon', { beaconId: id });
  }, [openSheet]);

  const handleSafetyTap = useCallback((id: string) => {
    openSheet('beacon', { beaconId: id });
  }, [openSheet]);

  const handleCreateBeacon = useCallback(() => {
    openSheet('beacon', { mode: 'create' });
  }, [openSheet]);

  const handleAmplify = useCallback(() => {
    openSheet('amplify', {});
  }, [openSheet]);

  const handleSeeAllEvents = useCallback(() => {
    openSheet('events', {});
  }, [openSheet]);

  const handleSafetyIndicatorTap = useCallback(() => {
    if (safetyAlerts.length > 0) {
      setActiveFilter('safety');
    }
  }, [safetyAlerts.length]);

  // ---- Scene Scout handler (CHROME gated) -----------------------------------
  const handleSceneScout = useCallback(async () => {
    if (sceneScoutLoading) return;

    // CHROME tier gate
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) {
        toast('Sign in to use Scene Scout');
        return;
      }

      const { data: profile } = await supabase
        .from('User')
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
                    {pick.type === 'event' ? '📅' : '📍'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
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
            city={city}
            beaconCount={allBeacons.length}
            safetyCount={safetyAlerts.length}
            rightNowCount={rightNowCount}
            onSafetyTap={handleSafetyIndicatorTap}
            onCityTap={handleCityTap}
          />
          <FilterChipStrip
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={filterCounts}
          />
        </div>
      </div>

      {/* Legend card (bottom-left, above drawer) */}
      {!legendDismissed && (
        <div className="fixed left-4 z-30 pointer-events-auto" style={{ bottom: 'calc(180px + env(safe-area-inset-bottom, 0px))' }}>
          <LegendCard onDismiss={handleDismissLegend} />
        </div>
      )}

      {/* Amplify pill (bottom-right, above FAB) */}
      <div className="fixed right-4 z-[45] pointer-events-auto" style={{ bottom: 'calc(250px + env(safe-area-inset-bottom, 0px))' }}>
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

      {/* Right Now FAB (bottom-left, lime) */}
      <div className="fixed left-4 z-[45] pointer-events-auto" style={{ bottom: 'calc(180px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="relative">
          {rightNowCount > 0 && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid #39FF14' }}
              animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <button
            onClick={() => setRightNowOpen(true)}
            className="w-14 h-14 rounded-full flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
            style={{ background: '#39FF1415', border: '1.5px solid #39FF14', boxShadow: '0 4px 24px #39FF1430' }}
            aria-label="Go Right Now"
          >
            <Zap className="w-5 h-5" style={{ color: '#39FF14' }} />
            {rightNowCount > 0 && (
              <span className="text-[8px] font-black leading-none" style={{ color: '#39FF14' }}>
                {rightNowCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Beacon FAB (bottom-right, above drawer) */}
      <div className="fixed right-4 z-[45] pointer-events-auto" style={{ bottom: 'calc(180px + env(safe-area-inset-bottom, 0px))' }}>
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
          events={filteredBeacons.events}
          beacons={filteredBeacons.beacons}
          safetyAlerts={filteredBeacons.safety}
          eventsLoading={eventsLoading}
          beaconsLoading={beaconsLoading}
          onEventTap={handleEventTap}
          onBeaconTap={handleBeaconTap}
          onSafetyTap={handleSafetyTap}
          onSeeAllEvents={handleSeeAllEvents}
          sceneScoutSection={sceneScoutSection}
        />
      </div>
    </div>
  );
}

export default PulseMode;
