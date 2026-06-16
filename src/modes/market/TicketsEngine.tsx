/**
 * TicketsEngine — Event marketplace (/market/tickets)
 *
 * Pattern: hero → filter chips → event cards (infinite scroll)
 * Matches ShopEngine / DropsEngine structure.
 *
 * Data: GET /api/tickets/listings
 * Tap card → opens L2BeaconSheet for that event
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Calendar, Ticket, Loader2, ChevronRight,
  X, RefreshCw,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';

const AMBER = '#C8962C';
const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function formatPrice(pence: number | null): string {
  if (pence == null) return 'Free';
  const p = Number(pence);
  return p === 0 ? 'Free' : `£${(p / 100).toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Listing {
  pool_id: string;
  beacon_id: string;
  event_name: string;
  event_start_at: string | null;
  location_city: string | null;
  poster_url: string | null;
  price: number | null;
  remaining: number | null;
  resale_count: number;
  distance_km: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-[#111116] border border-white/[0.06]">
      <ShimmerBox className="w-20 h-20 flex-shrink-0 !rounded-xl" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <ShimmerBox className="h-4 w-3/4 !rounded-md" />
        <ShimmerBox className="h-3 w-1/2 !rounded-md" />
        <ShimmerBox className="h-3 w-1/3 !rounded-md" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CARD
// ─────────────────────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

function EventCard({ listing, index, onTap }: { listing: Listing; index: number; onTap: () => void }) {
  const dist = formatDistance(listing.distance_km);
  const soldOut = listing.remaining != null && listing.remaining <= 0;

  return (
    <motion.button
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      onClick={onTap}
      disabled={soldOut}
      className="w-full flex gap-4 p-4 rounded-2xl bg-[#111116] border border-white/[0.06] text-left
                 transition-all active:scale-[0.98] hover:border-[#C8962C]/30 disabled:opacity-50"
    >
      {/* Poster */}
      <div className="w-20 h-20 rounded-xl flex-shrink-0 bg-[#1C1C1E] overflow-hidden relative">
        {listing.poster_url ? (
          <img
            src={listing.poster_url}
            alt={listing.event_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Ticket className="w-7 h-7" style={{ color: AMBER, opacity: 0.5 }} />
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Sold out</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate mb-1">{listing.event_name}</p>

        <div className="flex items-center gap-1.5 text-white/45 text-xs mb-1">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{formatDate(listing.event_start_at)}{listing.event_start_at ? `, ${formatTime(listing.event_start_at)}` : ''}</span>
        </div>

        {listing.location_city && (
          <div className="flex items-center gap-1.5 text-white/45 text-xs mb-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{listing.location_city}{dist ? ` · ${dist}` : ''}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${AMBER}20`, color: AMBER }}
          >
            {formatPrice(listing.price)}
          </span>
          {listing.remaining != null && listing.remaining > 0 && listing.remaining <= 20 && (
            <span className="text-[11px] text-white/40">{listing.remaining} left</span>
          )}
          {listing.resale_count > 0 && (
            <span className="text-[11px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
              {listing.resale_count} resale
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0 self-center" />
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────

const HERO_URLS = [
  '/tickets-hero.png',
  'https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/brand-assets/market/tickets.jpg',
  'https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/brand-assets/market/tickets.png',
];

function TicketsHero() {
  const [urlIdx, setUrlIdx] = useState(0);
  const failed = urlIdx >= HERO_URLS.length;

  return (
    <div className="px-4 pt-3 pb-2">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-white/5"
        style={{ aspectRatio: '16 / 9', background: '#050507' }}
      >
        {!failed && (
          <img
            src={HERO_URLS[urlIdx]}
            alt="HOTMESS Events & Tickets"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            onError={() => setUrlIdx(i => i + 1)}
          />
        )}
        {failed && (
          <div
            className="absolute inset-0 flex flex-col items-start justify-end p-6"
            style={{ background: 'linear-gradient(135deg, #050507 0%, #111116 100%)' }}
          >
            {/* Ticket stub perforations top */}
            <div className="absolute top-0 left-0 right-0 flex gap-[6px] px-3 py-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="flex-1 h-[2px] rounded-full bg-white/[0.05]" />
              ))}
            </div>
            {/* Gold left stripe */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
              style={{ background: `linear-gradient(to bottom, ${AMBER}, transparent)` }}
            />
            <div className="mb-3">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
                style={{ background: `${AMBER}18`, border: `1px solid ${AMBER}40` }}
              >
                <Ticket className="w-3 h-3" style={{ color: AMBER }} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: AMBER }}>
                  HOTMESS EVENTS
                </span>
              </div>
              <div className="text-[38px] font-black uppercase leading-none tracking-tight text-white">
                LIVE<br />
                <span style={{ color: AMBER }}>TONIGHT</span>
              </div>
            </div>
            <p className="text-[12px] text-white/35 uppercase tracking-[0.15em]">
              Queer nightlife · Real venues · Real tickets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER CHIPS
// ─────────────────────────────────────────────────────────────────────────────

const CITIES = ['London', 'Manchester', 'Glasgow', 'Berlin', 'Amsterdam'];

function CityChip({ label, active, onTap, onClear }: {
  label: string; active: boolean;
  onTap: () => void; onClear: () => void;
}) {
  return (
    <button
      onClick={active ? onClear : onTap}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium flex-shrink-0 transition-all"
      style={{
        border: `1px solid ${active ? AMBER : 'rgba(255,255,255,0.1)'}`,
        background: active ? `${AMBER}18` : 'rgba(255,255,255,0.04)',
        color: active ? AMBER : 'rgba(255,255,255,0.5)',
      }}
    >
      {label}
      {active && <X className="w-3 h-3" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function TicketsEngine({ search }: { search: string }) {
  const { openSheet } = useSheet();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  // Best-effort geo
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  const buildUrl = useCallback((off: number) => {
    const params = new URLSearchParams();
    const city = cityFilter || search;
    if (city) params.set('city', city);
    if (geo?.lat) params.set('lat', String(geo.lat));
    if (geo?.lng) params.set('lng', String(geo.lng));
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(off));
    return `/api/tickets/listings?${params}`;
  }, [cityFilter, search, geo]);

  const fetchListings = useCallback(async (off = 0, append = false) => {
    if (off === 0) { setLoading(true); setError(false); }
    else setLoadingMore(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const res = await fetch(buildUrl(off), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = await res.json();
      const rows: Listing[] = body.listings ?? [];

      setListings(prev => append ? [...prev, ...rows] : rows);
      setHasMore(rows.length === PAGE_SIZE);
      setOffset(off + rows.length);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildUrl]);

  // Refetch on filter/search change
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchListings(0, false);
  }, [cityFilter, search, geo]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchListings(offset, true);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, offset, fetchListings]);

  const handleTap = (listing: Listing) => {
    openSheet('beacon', { beaconId: listing.beacon_id });
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-momentum pb-32"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(200,150,44,0.3) transparent',
        touchAction: 'pan-y',
        overscrollBehaviorY: 'contain',
      }}
    >
      {/* Hero */}
      <TicketsHero />

      {/* City filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CITIES.map(city => (
          <CityChip
            key={city}
            label={city}
            active={cityFilter === city}
            onTap={() => setCityFilter(city)}
            onClear={() => setCityFilter('')}
          />
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex flex-col gap-3 px-4 pt-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <RefreshCw className="w-12 h-12 mb-4 text-white/20" />
          <p className="text-white/50 text-sm mb-4">Couldn't load events</p>
          <button
            onClick={() => fetchListings(0, false)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: AMBER }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: `${AMBER}10` }}
          >
            <Ticket className="w-8 h-8" style={{ color: AMBER, opacity: 0.4 }} />
          </div>
          <p className="text-white font-semibold mb-1">No events yet</p>
          <p className="text-white/40 text-sm">
            {cityFilter ? `Nothing in ${cityFilter} right now` : 'Check back closer to the weekend'}
          </p>
          {cityFilter && (
            <button
              onClick={() => setCityFilter('')}
              className="mt-4 text-sm font-medium"
              style={{ color: AMBER }}
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Listings */}
      {!loading && !error && listings.length > 0 && (
        <div className="flex flex-col gap-3 px-4 pt-1">
          {listings.map((l, i) => (
            <EventCard key={l.pool_id} listing={l} index={i} onTap={() => handleTap(l)} />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={bottomRef} style={{ height: 1 }} />

          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
            </div>
          )}

          {!hasMore && listings.length > 0 && (
            <p className="text-center text-white/20 text-xs py-4">That's everything</p>
          )}
        </div>
      )}
    </div>
  );
}
