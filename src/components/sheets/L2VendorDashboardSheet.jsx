/**
 * L2VendorDashboardSheet — Promoter/vendor home base
 *
 * Phase 3 / S2
 *
 * Features:
 *   - market_sellers row fetch (creates if missing)
 *   - Stripe Connect onboarding prompt if not complete
 *   - List of beacons vendor owns OR has vendor_event_access for
 *   - Tap event → opens vendor-event sheet
 *   - Quick stats per event (sold, remaining)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TicketIcon, ChevronRight, AlertTriangle, ExternalLink,
  Loader2, Plus, Users, TrendingUp, Building2,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

const T = {
  bg:      '#050507',
  card:    '#111116',
  surface: '#1C1C1E',
  gold:    '#C8962C',
  green:   '#22C55E',
  red:     '#EF4444',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.12)',
  border:  'rgba(255,255,255,0.08)',
};

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE CONNECT BANNER
// ─────────────────────────────────────────────────────────────────────────────
function StripeConnectBanner({ seller }) {
  const [loading, setLoading] = useState(false);

  const startOnboarding = async () => {
    setLoading(true);
    try {
      // In production this would call /api/stripe/connect/onboard
      // For now surface a clear message
      toast('Stripe Connect onboarding — set up /api/stripe/connect/onboard to enable payouts');
    } finally {
      setLoading(false);
    }
  };

  if (seller?.stripe_onboarding_complete) return null;

  return (
    <div style={{
      background: `${T.gold}15`,
      border: `1px solid ${T.gold}50`,
      borderRadius: 14,
      padding: 16,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      marginBottom: 16,
    }}>
      <AlertTriangle size={20} style={{ color: T.gold, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: T.gold, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          Payouts not set up
        </div>
        <div style={{ color: T.muted, fontSize: 12, marginBottom: 10 }}>
          Connect a Stripe account to receive ticket sale proceeds.
        </div>
        <button
          onClick={startOnboarding}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20,
            background: T.gold, border: 'none',
            color: '#000', fontWeight: 700, fontSize: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading
            ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            : <ExternalLink size={12} />}
          Connect Stripe
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CARD
// ─────────────────────────────────────────────────────────────────────────────
function EventCard({ beacon, pools, onManage }) {
  const totalSold = pools.reduce((a, p) => a + (p.inventory_sold || 0), 0);
  const totalCap  = pools.every(p => p.inventory_cap != null)
    ? pools.reduce((a, p) => a + (p.inventory_cap || 0), 0)
    : null;
  const totalRevenue = pools.reduce((a, p) => a + (p.inventory_sold || 0) * Number(p.price || 0), 0);
  const isLive = beacon.event_start_at && new Date(beacon.event_start_at) > new Date();

  return (
    <button
      onClick={() => onManage(beacon)}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: 16,
        display: 'flex', gap: 14, alignItems: 'center',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.gold + '66'}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      {/* Status dot */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: T.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${isLive ? T.gold + '44' : T.border}`,
      }}>
        <TicketIcon size={20} style={{ color: isLive ? T.gold : T.muted }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: T.white, fontSize: 14, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 3,
        }}>
          {beacon.title}
        </div>
        {beacon.event_start_at && (
          <div style={{ color: T.muted, fontSize: 11, marginBottom: 6 }}>
            {new Date(beacon.event_start_at).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
            {isLive && (
              <span style={{ color: T.gold, marginLeft: 6, fontWeight: 600 }}>● Upcoming</span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ color: T.muted, fontSize: 11 }}>
            <span style={{ color: T.white, fontWeight: 600 }}>{totalSold}</span>
            {totalCap ? `/${totalCap}` : ''} sold
          </span>
          {totalRevenue > 0 && (
            <span style={{ color: T.muted, fontSize: 11 }}>
              <span style={{ color: T.green, fontWeight: 600 }}>
                £{totalRevenue.toFixed(2)}
              </span> revenue
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: T.dim, flexShrink: 0 }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: T.card, borderRadius: 14, padding: 16,
          border: `1px solid ${T.border}`, display: 'flex', gap: 14,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.surface }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 14, background: T.surface, borderRadius: 7, width: '60%' }} />
            <div style={{ height: 11, background: T.surface, borderRadius: 6, width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function L2VendorDashboardSheet() {
  const { openSheet } = useSheet();

  const [userId, setUserId]   = useState(null);
  const [seller, setSeller]   = useState(null);        // market_sellers row
  const [events, setEvents]   = useState([]);          // [{ beacon, pools }]
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // ── Load everything ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // 1. Seller profile
      const { data: sellerRow } = await supabase
        .from('market_sellers')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      setSeller(sellerRow);

      // 2. Beacons they own
      const { data: ownedBeacons } = await supabase
        .from('beacons')
        .select('id, title, event_start_at, ends_at, location_city')
        .eq('owner_id', user.id)
        .order('event_start_at', { ascending: false })
        .limit(50);

      // 3. Beacons with explicit access
      const { data: accessRows } = await supabase
        .from('vendor_event_access')
        .select('beacon_id, role, beacons:beacon_id(id, title, event_start_at, ends_at, location_city)')
        .eq('vendor_id', user.id);

      // Merge + dedupe
      const beaconMap = new Map();
      (ownedBeacons || []).forEach(b => beaconMap.set(b.id, b));
      (accessRows || []).forEach(r => {
        if (r.beacons && !beaconMap.has(r.beacon_id)) {
          beaconMap.set(r.beacon_id, r.beacons);
        }
      });

      const beaconList = Array.from(beaconMap.values());

      // 4. Pool stats for each beacon (batch)
      if (beaconList.length > 0) {
        const { data: allPools } = await supabase
          .from('ticket_inventory_pools')
          .select('id, beacon_id, label, price, inventory_cap, inventory_sold, is_active')
          .in('beacon_id', beaconList.map(b => b.id));

        const poolsByBeacon = {};
        (allPools || []).forEach(p => {
          if (!poolsByBeacon[p.beacon_id]) poolsByBeacon[p.beacon_id] = [];
          poolsByBeacon[p.beacon_id].push(p);
        });

        setEvents(beaconList.map(b => ({ beacon: b, pools: poolsByBeacon[b.id] || [] })));
      } else {
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Create seller profile ──────────────────────────────────────────────────
  const createSeller = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('market_sellers')
        .insert({ owner_id: userId, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      setSeller(data);
      toast.success('Promoter profile created');
    } catch (err) {
      toast.error(err.message || 'Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const handleManage = (beacon) => {
    window.setTimeout(() => openSheet('vendor-event', { beaconId: beacon.id }), 80);
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalSold    = events.reduce((a, e) => a + e.pools.reduce((b, p) => b + (p.inventory_sold || 0), 0), 0);
  const totalRevenue = events.reduce((a, e) => a + e.pools.reduce((b, p) => b + (p.inventory_sold || 0) * Number(p.price || 0), 0), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, color: T.white }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.dim, margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: `${T.gold}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Building2 size={20} style={{ color: T.gold }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Promoter Dashboard</h2>
            {seller && (
              <div style={{ color: T.muted, fontSize: 12 }}>
                {seller.display_name || 'My Events'}
                {seller.stripe_onboarding_complete
                  ? <span style={{ color: T.green, marginLeft: 6 }}>● Stripe connected</span>
                  : <span style={{ color: T.gold, marginLeft: 6 }}>● Payouts pending</span>}
              </div>
            )}
          </div>
        </div>

        {/* No seller yet */}
        {!loading && !seller && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
            padding: 24, textAlign: 'center', marginBottom: 20,
          }}>
            <TicketIcon size={36} style={{ color: T.gold, marginBottom: 12 }} />
            <div style={{ color: T.white, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Set up promoter access
            </div>
            <div style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>
              Sell tickets to your events and manage your guest list.
            </div>
            <button
              onClick={createSeller}
              disabled={creating}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 24,
                background: T.gold, border: 'none',
                color: '#000', fontWeight: 700, fontSize: 14,
                cursor: creating ? 'not-allowed' : 'pointer',
              }}
            >
              {creating
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Plus size={16} />}
              Get Started
            </button>
          </div>
        )}

        {/* Stripe banner */}
        {seller && <StripeConnectBanner seller={seller} />}

        {/* Summary stat row */}
        {seller && !loading && events.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { icon: <TicketIcon size={16} />, label: 'Events',  value: events.length },
              { icon: <Users size={16} />,      label: 'Tickets', value: totalSold },
              { icon: <TrendingUp size={16} />, label: 'Revenue', value: `£${totalRevenue.toFixed(0)}` },
            ].map(stat => (
              <div key={stat.label} style={{
                background: T.card, borderRadius: 12, padding: '12px 10px',
                border: `1px solid ${T.border}`, textAlign: 'center',
              }}>
                <div style={{ color: T.gold, marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ color: T.white, fontSize: 18, fontWeight: 700 }}>{stat.value}</div>
                <div style={{ color: T.muted, fontSize: 10 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {seller && (
          <div style={{
            color: T.muted, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            My Events
          </div>
        )}
      </div>

      {/* Event list */}
      {seller && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          {loading ? (
            <Skeleton />
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.muted, padding: 40, fontSize: 14 }}>
              No ticketed events yet.<br />
              <span style={{ fontSize: 12 }}>Create a beacon and add a ticket pool to get started.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.map(({ beacon, pools }) => (
                <EventCard key={beacon.id} beacon={beacon} pools={pools} onManage={handleManage} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
