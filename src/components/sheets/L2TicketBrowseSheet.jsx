/**
 * L2TicketBrowseSheet — Browse upcoming ticketed events
 *
 * Phase 3 / S1
 *
 * Features:
 *   - Filter chips: City / Date / Price
 *   - Event cards: poster, name, date, price, distance (if geo granted)
 *   - Tap card → opens L2BeaconSheet for that event
 *   - Infinite scroll / load-more (offset pagination)
 *   - Skeletons on first load
 *
 * Data: GET /api/tickets/listings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Calendar, Tag, Loader2, ChevronRight, SlidersHorizontal,
  X, TicketIcon,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:      '#050507',
  card:    '#111116',
  surface: '#1C1C1E',
  gold:    '#C8962C',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.12)',
  border:  'rgba(255,255,255,0.08)',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDistance(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function formatPrice(pence) {
  if (pence == null) return 'Free';
  const p = Number(pence);
  return p === 0 ? 'Free' : `£${p.toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: T.card, borderRadius: 14, padding: 16, display: 'flex', gap: 14,
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ width: 72, height: 72, borderRadius: 10, background: T.surface, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 16, borderRadius: 8, background: T.surface, width: '70%' }} />
        <div style={{ height: 12, borderRadius: 8, background: T.surface, width: '50%' }} />
        <div style={{ height: 12, borderRadius: 8, background: T.surface, width: '40%' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CARD
// ─────────────────────────────────────────────────────────────────────────────
function EventCard({ listing, onTap }) {
  const dist = formatDistance(listing.distance_km);

  return (
    <button
      onClick={() => onTap(listing)}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.gold + '66'}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      {/* Poster / avatar */}
      <div style={{
        width: 72, height: 72, borderRadius: 10, flexShrink: 0,
        background: T.surface, overflow: 'hidden', position: 'relative',
      }}>
        {listing.poster_url ? (
          <img
            src={listing.poster_url}
            alt={listing.event_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TicketIcon size={28} style={{ color: T.gold, opacity: 0.6 }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: T.white, fontSize: 15, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {listing.event_name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.muted, fontSize: 12, marginBottom: 3 }}>
          <Calendar size={12} />
          <span>{formatDate(listing.event_start_at)}, {formatTime(listing.event_start_at)}</span>
        </div>

        {listing.location_city && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.muted, fontSize: 12, marginBottom: 3 }}>
            <MapPin size={12} />
            <span>{listing.location_city}{dist ? ` · ${dist}` : ''}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{
            color: T.gold, fontSize: 13, fontWeight: 700,
            background: `${T.gold}18`, borderRadius: 20, padding: '2px 8px',
          }}>
            {formatPrice(listing.price)}
          </span>
          {listing.remaining != null && (
            <span style={{ color: T.muted, fontSize: 11 }}>
              {listing.remaining > 0 ? `${listing.remaining} left` : 'Sold out'}
            </span>
          )}
          {listing.resale_count > 0 && (
            <span style={{
              color: T.muted, fontSize: 11,
              background: T.surface, borderRadius: 20, padding: '2px 6px',
            }}>
              {listing.resale_count} resale
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: T.dim, flexShrink: 0, marginTop: 4 }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER CHIP
// ─────────────────────────────────────────────────────────────────────────────
function FilterChip({ label, active, onTap, onClear }) {
  return (
    <button
      onClick={active ? onClear : onTap}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
        border: active ? `1px solid ${T.gold}` : `1px solid ${T.border}`,
        background: active ? `${T.gold}18` : T.surface,
        color: active ? T.gold : T.muted,
        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {label}
      {active && <X size={12} />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER PANEL
// ─────────────────────────────────────────────────────────────────────────────
function FilterPanel({ filters, onChange, onClose }) {
  const [local, setLocal] = useState({ ...filters });

  const apply = () => { onChange(local); onClose(); };
  const reset = () => { const blank = { city: '', dateFrom: '', dateTo: '', maxPrice: '' }; setLocal(blank); onChange(blank); onClose(); };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: T.muted, fontSize: 12 }}>{label}</label>
      <input
        type={type}
        value={local[key] || ''}
        placeholder={placeholder}
        onChange={e => setLocal(p => ({ ...p, [key]: e.target.value }))}
        style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '8px 12px', color: T.white, fontSize: 14,
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  );

  return (
    <div style={{
      background: T.card, borderRadius: 16, padding: 20,
      border: `1px solid ${T.border}`, marginBottom: 16,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: T.white, fontWeight: 600, fontSize: 15 }}>Filters</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {field('city', 'City', 'text', 'e.g. London')}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {field('dateFrom', 'From', 'date')}
        {field('dateTo', 'To', 'date')}
      </div>

      {field('maxPrice', 'Max price (£)', 'number', 'e.g. 20')}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={reset} style={{
          flex: 1, padding: '10px', borderRadius: 10,
          border: `1px solid ${T.border}`, background: 'none',
          color: T.muted, fontSize: 14, cursor: 'pointer',
        }}>
          Reset
        </button>
        <button onClick={apply} style={{
          flex: 2, padding: '10px', borderRadius: 10,
          background: T.gold, border: 'none',
          color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          Apply
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export default function L2TicketBrowseSheet() {
  const { openSheet } = useSheet();

  const [listings, setListings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [offset, setOffset]       = useState(0);
  const [filters, setFilters]     = useState({ city: '', dateFrom: '', dateTo: '', maxPrice: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [geo, setGeo]             = useState(null); // { lat, lng }
  const [geoError, setGeoError]   = useState(false);
  const bottomRef                 = useRef(null);

  // Request geo on mount (best-effort)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => setGeoError(true),
      { timeout: 5000 },
    );
  }, []);

  const buildUrl = useCallback((off) => {
    const params = new URLSearchParams();
    if (filters.city)      params.set('city', filters.city);
    if (filters.dateFrom)  params.set('date_from', filters.dateFrom);
    if (filters.dateTo)    params.set('date_to', filters.dateTo);
    if (filters.maxPrice)  params.set('max_price', filters.maxPrice);
    if (geo?.lat)          params.set('lat', geo.lat);
    if (geo?.lng)          params.set('lng', geo.lng);
    params.set('limit',  PAGE_SIZE);
    params.set('offset', off);
    return `/api/tickets/listings?${params}`;
  }, [filters, geo]);

  const fetchListings = useCallback(async (off = 0, append = false) => {
    if (off === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const res = await fetch(buildUrl(off), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = await res.json();
      const rows = body.listings ?? [];

      setListings(prev => append ? [...prev, ...rows] : rows);
      setHasMore(rows.length === PAGE_SIZE);
      setOffset(off + rows.length);
    } catch (err) {
      console.error('[TicketBrowse] fetch error', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildUrl]);

  // Fetch on mount / filter change
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchListings(0, false);
  }, [filters, geo]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!bottomRef.current) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) fetchListings(offset, true); },
      { threshold: 0.5 },
    );
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, offset, fetchListings]);

  const handleTap = (listing) => {
    window.setTimeout(() => openSheet('beacon', { beaconId: listing.beacon_id }), 80);
  };

  const activeFiltersCount = [filters.city, filters.dateFrom, filters.dateTo, filters.maxPrice].filter(Boolean).length;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: T.bg, color: T.white,
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2, background: T.dim,
          margin: '0 auto 16px',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Upcoming Events</h2>
          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 20,
              border: `1px solid ${activeFiltersCount > 0 ? T.gold : T.border}`,
              background: activeFiltersCount > 0 ? `${T.gold}18` : T.surface,
              color: activeFiltersCount > 0 ? T.gold : T.muted,
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
            }}
          >
            <SlidersHorizontal size={14} />
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>
        </div>

        {/* Quick city chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {['London', 'Manchester', 'Glasgow', 'Berlin', 'Amsterdam'].map(city => (
            <FilterChip
              key={city}
              label={city}
              active={filters.city === city}
              onTap={() => setFilters(p => ({ ...p, city }))}
              onClear={() => setFilters(p => ({ ...p, city: '' }))}
            />
          ))}
          {filters.dateFrom && (
            <FilterChip
              label={`From ${filters.dateFrom}`}
              active
              onClear={() => setFilters(p => ({ ...p, dateFrom: '' }))}
            />
          )}
          {filters.maxPrice && (
            <FilterChip
              label={`≤ £${filters.maxPrice}`}
              active
              onClear={() => setFilters(p => ({ ...p, maxPrice: '' }))}
            />
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ padding: '0 20px', flexShrink: 0 }}>
          <FilterPanel
            filters={filters}
            onChange={f => setFilters(f)}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Listings */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : listings.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', paddingTop: 60, gap: 12,
          }}>
            <TicketIcon size={40} style={{ color: T.dim }} />
            <div style={{ color: T.muted, fontSize: 14, textAlign: 'center' }}>
              No events found.<br />
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => setFilters({ city: '', dateFrom: '', dateTo: '', maxPrice: '' })}
                  style={{ color: T.gold, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginTop: 8 }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {listings.map(l => (
              <EventCard key={l.pool_id} listing={l} onTap={handleTap} />
            ))}

            {/* Load-more sentinel */}
            <div ref={bottomRef} style={{ height: 1 }} />

            {loadingMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <Loader2 size={20} style={{ color: T.muted, animation: 'spin 1s linear infinite' }} />
              </div>
            )}

            {!hasMore && listings.length > 0 && (
              <div style={{ color: T.dim, textAlign: 'center', fontSize: 12, padding: '8px 0' }}>
                That's everything
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
