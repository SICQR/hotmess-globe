/**
 * PulseVenueDrawer
 *
 * Pull-up drawer for /pulse — gives the globe a browseable surface.
 * Three snap states: peek (handle only) → half (list) → full (full-screen).
 *
 * Data: receives pre-fetched places + event beacons from Globe.jsx.
 * Interaction: tapping a row fires onSelect which Globe.jsx uses to fly the
 * camera and open the L2 beacon sheet.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { VENUE_PIN_COLORS } from '@/components/globe/beaconIconFactory';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { ChevronUp, MapPin, Calendar, X, Navigation, Ticket } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import type { PulsePlace } from '@/hooks/usePulsePlaces';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DrawerBeacon {
  id: string;
  title: string;
  type: 'venue' | 'event';
  beacon_category: string;
  geo_lat: number;
  geo_lng: number;
  starts_at?: string | null;
  ends_at?: string | null;
  address?: string | null;
  description?: string | null;
  image_url?: string | null;
  venue_name?: string | null;
}

interface Props {
  places: PulsePlace[];
  eventBeacons: DrawerBeacon[];
  onSelect: (beacon: DrawerBeacon) => void;
  navHeight?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GOLD  = '#C8962C';
const PINK  = '#FF4F9A';
const BG    = 'rgba(10, 10, 10, 0.97)';

const PEEK_HEIGHT  = 72;
const HALF_RATIO   = 0.48;
const FULL_RATIO   = 0.88;

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',       label: 'All'      },
  { id: 'club',      label: 'Clubs'    },
  { id: 'sauna',     label: 'Saunas'   },
  { id: 'leather',   label: 'Leather'  },
  { id: 'cruising',  label: 'Cruising' },
  { id: 'cafe',      label: 'Cafés'    },
  { id: 'aftercare', label: 'Care'     },
  { id: 'gym',       label: 'Gyms'     },
];

// Single source of truth — the SAME per-category colours as the globe pins
// (VENUE_PIN_COLORS). A sauna is teal here AND on the map; leather oxblood here
// AND on the map. (D5X doctrine: one colour system across every surface.)
const CATEGORY_COLORS: Record<string, string> = VENUE_PIN_COLORS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTonight(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isThisWeekend(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const day = d.getDay();
  if (day !== 0 && day !== 6) return false;
  return (d.getTime() - Date.now()) / 86_400_000 <= 7;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function catColor(cat: string): string {
  return CATEGORY_COLORS[cat] || GOLD;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeFilter = 'tonight' | 'weekend' | 'all';
type SnapPoint  = 'peek' | 'half' | 'full';

// ─── Component ───────────────────────────────────────────────────────────────

export default function PulseVenueDrawer({ places, eventBeacons, onSelect, navHeight = 56 }: Props) {
  const { openSheet } = useSheet();
  const [snap, setSnap]           = useState<SnapPoint>('peek');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [catFilter, setCatFilter]  = useState('all');
  const [query, setQuery]          = useState('');

  const windowH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const halfH   = Math.round(windowH * HALF_RATIO);
  const fullH   = Math.round(windowH * FULL_RATIO);

  const snapH: Record<SnapPoint, number> = { peek: PEEK_HEIGHT, half: halfH, full: fullH };

  const heightMv = useMotionValue(PEEK_HEIGHT);
  const height   = useTransform(heightMv, v => v);

  const snapTo = useCallback((pt: SnapPoint) => {
    setSnap(pt);
    animate(heightMv, snapH[pt], { type: 'spring', stiffness: 400, damping: 40 });
  }, [heightMv, halfH, fullH]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const vel = info.velocity.y;
    const cur = heightMv.get();
    if (vel < -300 || cur > halfH * 0.65) {
      snapTo(cur < halfH * 0.8 ? 'half' : 'full');
    } else if (vel > 300 || cur < halfH * 0.4) {
      snapTo(cur > halfH * 0.7 ? 'half' : 'peek');
    } else {
      const dists: [SnapPoint, number][] = [
        ['peek', Math.abs(cur - PEEK_HEIGHT)],
        ['half', Math.abs(cur - halfH)],
        ['full', Math.abs(cur - fullH)],
      ];
      snapTo(dists.sort((a, b) => a[1] - b[1])[0][0]);
    }
  }, [heightMv, halfH, fullH, snapTo]);

  // ── Filtered data ─────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => eventBeacons
    .filter(e => timeFilter === 'all' || (timeFilter === 'tonight' ? isTonight(e.starts_at) : isThisWeekend(e.starts_at)))
    .filter(e => !query || e.title.toLowerCase().includes(query.toLowerCase())),
    [eventBeacons, timeFilter, query]);

  const filteredPlaces = useMemo(() => places
    .filter(p => p.type === 'club' || p.type === 'curated')
    .filter(p => catFilter === 'all' || p.beacon_category === catFilter)
    .filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0)),
    [places, catFilter, query]);

  // ── Adapter ──────────────────────────────────────────────────────────────────

  const placeToBeacon = (p: PulsePlace): DrawerBeacon => ({
    id:              'place-' + p.slug,
    title:           p.name,
    type:            'venue',
    beacon_category: p.beacon_category || 'club',
    geo_lat:         p.lat,
    geo_lng:         p.lng,
    address:         p.address,
    image_url:       p.image_url ?? null,
  });

  const isOpen = snap !== 'peek';

  // ───────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      style={{
        position: 'fixed',
        bottom:   `calc(${navHeight}px + env(safe-area-inset-bottom, 0px))`,
        left:     0,
        right:    0,
        height,
        background: BG,
        borderRadius: '20px 20px 0 0',
        zIndex:   80,
        overflow: 'hidden',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        touchAction: 'none',
        y: 0,
      }}
      drag="y"
      dragDirectionLock
      dragElastic={0.08}
      dragConstraints={{ top: -(fullH - PEEK_HEIGHT), bottom: 0 }}
      onDragEnd={handleDragEnd}
      onDrag={(_, info) => {
        const newH = Math.max(PEEK_HEIGHT, Math.min(fullH, heightMv.get() - info.delta.y));
        heightMv.set(newH);
      }}
    >
      {/* Handle + summary */}
      <div
        className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing select-none"
        onClick={() => snapTo(snap === 'peek' ? 'half' : 'peek')}
      >
        <div className="w-9 h-1 rounded-full bg-white/20 mb-2" />
        <div className="flex items-center gap-3 px-4">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
            {filteredPlaces.length} venues
          </span>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ background: PINK }} />
            {filteredEvents.length} events
          </span>
          {!isOpen && <ChevronUp className="w-3.5 h-3.5 text-white/30 ml-1" />}
        </div>
      </div>

      {/* Main content */}
      {isOpen && (
        <div className="flex flex-col" style={{ height: 'calc(100% - 56px)', overflow: 'hidden' }}>

          {/* Search bar */}
          <div className="px-4 pt-1 pb-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search venues & events…"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  WebkitAppearance: 'none',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div
            className="flex gap-2 px-4 pb-3"
            style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {(['tonight', 'weekend', 'all'] as TimeFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: timeFilter === f ? GOLD : 'rgba(255,255,255,0.07)',
                  color:      timeFilter === f ? '#000' : 'rgba(255,255,255,0.5)',
                  border:     `1px solid ${timeFilter === f ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {f === 'tonight' ? 'Tonight' : f === 'weekend' ? 'Weekend' : 'All'}
              </button>
            ))}

            <div className="w-px flex-shrink-0 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatFilter(cat.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: catFilter === cat.id
                    ? (cat.id === 'all' ? 'rgba(255,255,255,0.15)' : catColor(cat.id))
                    : 'rgba(255,255,255,0.05)',
                  color:  catFilter === cat.id && cat.id !== 'all' ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${catFilter === cat.id ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scrollable list */}
          <div
            className="flex-1"
            style={{ overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Events section */}
            {filteredEvents.length > 0 && (
              <>
                <div className="px-4">
                  <SectionHeader icon={<Calendar className="w-3.5 h-3.5" style={{ color: PINK }} />} label="Events" />
                </div>
                <div className="px-4 space-y-3 pb-2">
                  {filteredEvents.map(ev => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      onClick={() => { onSelect(ev); snapTo('peek'); }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Venues section */}
            {filteredPlaces.length > 0 && (
              <>
                <div className="px-4">
                  <SectionHeader
                    icon={<MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />}
                    label="Venues"
                    className={filteredEvents.length > 0 ? 'mt-2' : ''}
                  />
                </div>
                <div className="px-4 space-y-0.5 pb-2">
                  {filteredPlaces.map(place => {
                    const dot = catColor(place.beacon_category || '');
                    return (
                      <ListRow
                        key={place.id}
                        dot={dot}
                        primary={place.name}
                        secondary={place.address || undefined}
                        badge={place.beacon_category || undefined}
                        badgeColor={dot}
                        onClick={() => { onSelect(placeToBeacon(place)); snapTo('peek'); }}
                        onDirections={() => { snapTo('peek'); openSheet('directions', { lat: place.lat, lng: place.lng, label: place.name, address: place.address || '' }); }}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {filteredEvents.length === 0 && filteredPlaces.length === 0 && (
              <div className="py-12 text-center px-4">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Nothing matches</p>
                <button
                  onClick={() => { setQuery(''); setTimeFilter('all'); setCatFilter('all'); }}
                  className="mt-3 text-xs underline"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="h-8" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label, className = '' }: { icon: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 py-2 ${className}`}>
      {icon}
      <span
        className="text-[10px] font-black uppercase tracking-[0.2em]"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── EventCard — full visual card for events ─────────────────────────────────

function EventCard({ event, onClick }: { event: DrawerBeacon; onClick: () => void }) {
  const dateStr = event.starts_at
    ? new Date(event.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  const timeStr = event.starts_at
    ? new Date(event.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';
  const displayDate = dateStr && timeStr ? `${dateStr} · ${timeStr}` : dateStr || timeStr;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Image */}
      {event.image_url ? (
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full object-cover"
          style={{ height: 128 }}
        />
      ) : (
        <div
          className="w-full flex items-center justify-center"
          style={{ height: 80, background: 'rgba(255,79,154,0.08)' }}
        >
          <Ticket className="w-6 h-6" style={{ color: 'rgba(255,79,154,0.3)' }} />
        </div>
      )}

      <div className="p-3">
        {/* Date row */}
        {displayDate && (
          <p
            className="text-[11px] font-semibold mb-1"
            style={{ color: PINK }}
          >
            {displayDate}
          </p>
        )}

        {/* Title */}
        <p className="text-sm font-bold text-white leading-snug">
          {event.title}
        </p>

        {/* Address / venue */}
        {(event.address || event.venue_name) && (
          <p
            className="text-[11px] mt-0.5 flex items-center gap-1"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            {event.address || event.venue_name}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── ListRow — compact row for venues ────────────────────────────────────────

function ListRow({
  dot, primary, secondary, badge, badgeColor, onClick, onDirections,
}: {
  dot: string;
  primary: string;
  secondary?: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
  onDirections?: () => void;
}) {
  return (
    <div
      className="w-full flex items-center rounded-xl transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
    <button
      onClick={onClick}
      className="flex-1 min-w-0 text-left flex items-center gap-3 p-3 rounded-xl active:opacity-70"
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: dot, boxShadow: `0 0 6px ${dot}66` }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{primary}</p>
        {secondary && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {secondary}
          </p>
        )}
      </div>
      {badge && badgeColor && (
        <span
          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: badgeColor + '22', color: badgeColor }}
        >
          {badge}
        </span>
      )}
    </button>
    {onDirections && (
      <button
        onClick={(e) => { e.stopPropagation(); onDirections(); }}
        className="flex-shrink-0 p-2.5 mr-1 rounded-xl active:scale-90 transition-transform"
        style={{ color: 'rgba(200,150,44,0.55)' }}
        title="Get directions"
        aria-label="Get directions"
      >
        <Navigation className="w-4 h-4" />
      </button>
    )}
    </div>
  );
}
