/**
 * L2TicketSheet — Ticket purchase, display, and resale
 *
 * Modes (passed as `mode` prop):
 *   'buy'       — Initiate Stripe checkout for a ticket pool (beaconId + poolId required)
 *   'my-ticket' — Show member's ticket with QR code (ticketId required)
 *   'market'    — Resale market listing view (stub for Phase 3)
 *
 * Opened from:
 *   - L2BeaconSheet "Get Ticket" → mode='buy'
 *   - L2BeaconSheet "My Ticket"  → mode='my-ticket'
 *   - BottomNav or deep-link     → mode='market'
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode, Loader2, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Tag, Clock, ChevronRight, ArrowLeftRight,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:      '#050507',
  card:    '#111116',
  surface: '#1C1C1E',
  gold:    '#C8962C',
  pink:    '#FF4F9A',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.15)',
};

// State → display config
const TICKET_STATE_CONFIG = {
  issued:       { label: 'Issued',       color: T.gold,  bg: `${T.gold}20`,  icon: 'clock'   },
  valid:        { label: 'Valid',        color: '#22C55E', bg: '#22C55E20',  icon: 'check'   },
  scanned:      { label: 'Scanned',     color: T.muted,  bg: 'rgba(255,255,255,0.08)', icon: 'check' },
  reissued:     { label: 'Reissued',    color: T.gold,  bg: `${T.gold}20`,  icon: 'refresh' },
  resold_void:  { label: 'Resold',      color: T.muted,  bg: 'rgba(255,255,255,0.08)', icon: 'x' },
  refunded_void:{ label: 'Refunded',    color: '#EF4444', bg: '#EF444420',  icon: 'x'      },
  expired:      { label: 'Expired',     color: T.muted,  bg: 'rgba(255,255,255,0.08)', icon: 'x' },
};

// ─────────────────────────────────────────────────────────────────────────────
// QR CANVAS — renders qr_token as a deterministic dot-matrix visual
// (same approach as L2QRSheet; real qrcode library in Phase 3)
// ─────────────────────────────────────────────────────────────────────────────
function TicketQR({ token, size = 220 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !token) return;
    const ctx = canvas.getContext('2d');
    const s = size;
    canvas.width  = s;
    canvas.height = s;

    // White bg
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, s, s);

    // Deterministic dot pattern from token
    const moduleSize = 7;
    const modules = Math.floor(s / moduleSize);
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash |= 0;
    }
    ctx.fillStyle = '#000';
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Skip corner zones (reserved for position markers)
        const inCorner =
          (row < 4 && col < 4) ||
          (row < 4 && col > modules - 5) ||
          (row > modules - 5 && col < 4);
        if (inCorner) continue;
        const seed = ((hash ^ (row * 31 + col * 17)) >>> 0) % 5;
        if (seed < 3) {
          ctx.fillRect(
            col * moduleSize + 1, row * moduleSize + 1,
            moduleSize - 2, moduleSize - 2,
          );
        }
      }
    }

    // Position detection markers (3 corners)
    const drawMarker = (x, y) => {
      const sz = moduleSize * 4;
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + moduleSize, y + moduleSize, sz - 2 * moduleSize, sz - 2 * moduleSize);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + moduleSize * 1.5, y + moduleSize * 1.5, sz - 3 * moduleSize, sz - 3 * moduleSize);
    };
    drawMarker(0, 0);
    drawMarker(s - moduleSize * 4, 0);
    drawMarker(0, s - moduleSize * 4);
  }, [token, size]);

  if (!token) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-white/5"
        style={{ width: size, height: size }}
      >
        <QrCode className="w-12 h-12 text-white/20" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-2xl shadow-2xl">
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MY TICKET — member's ticket view
// ─────────────────────────────────────────────────────────────────────────────
function MyTicketView({ ticketId }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const { openSheet, closeSheet } = useSheet();

  useEffect(() => {
    if (!ticketId) { setLoading(false); return; }
    supabase
      .from('ticket_orders')
      .select(`
        id, ticket_state, qr_token, ticket_type, tier_at_purchase,
        price_paid, currency, created_at, plus_one_of,
        beacons ( id, title, starts_at, ends_at, city_slug )
      `)
      .eq('id', ticketId)
      .single()
      .then(({ data, error }) => {
        if (!error) setTicket(data);
        setLoading(false);
      });
  }, [ticketId]);

  const handleResale = () => {
    if (!ticket) return;
    toast('Resale coming in Phase 3 — hold tight.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.gold }} />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center gap-3">
        <XCircle className="w-10 h-10 text-white/20" />
        <p className="text-white/50 font-bold text-sm">Ticket not found</p>
      </div>
    );
  }

  const stateConfig = TICKET_STATE_CONFIG[ticket.ticket_state] || TICKET_STATE_CONFIG.issued;
  const beacon      = ticket.beacons;
  const isActive    = ['issued', 'valid', 'reissued'].includes(ticket.ticket_state);
  const isScanned   = ticket.ticket_state === 'scanned';

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-8 gap-5 h-full overflow-y-auto">

      {/* State badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider"
        style={{ color: stateConfig.color, backgroundColor: stateConfig.bg }}
      >
        {stateConfig.icon === 'check' && <CheckCircle className="w-3.5 h-3.5" />}
        {stateConfig.icon === 'x'     && <XCircle     className="w-3.5 h-3.5" />}
        {stateConfig.icon === 'clock' && <Clock       className="w-3.5 h-3.5" />}
        {stateConfig.icon === 'refresh' && <RefreshCw  className="w-3.5 h-3.5" />}
        {stateConfig.label}
      </div>

      {/* QR code — only show when active */}
      {isActive ? (
        <TicketQR token={ticket.qr_token} size={220} />
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-2xl gap-3"
          style={{ width: 220, height: 220, backgroundColor: T.surface }}
        >
          <QrCode className="w-14 h-14 text-white/10" />
          <p className="text-white/30 text-xs font-semibold">QR not available</p>
        </div>
      )}

      {isScanned && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <CheckCircle className="w-4 h-4 text-white/40" />
          <p className="text-white/50 text-xs font-semibold">This ticket has been scanned at the door</p>
        </div>
      )}

      {/* Token (truncated) */}
      {isActive && (
        <p className="text-white/20 text-[10px] font-mono">
          {ticket.qr_token?.slice(0, 8)}···{ticket.qr_token?.slice(-8)}
        </p>
      )}

      {/* Event detail card */}
      {beacon && (
        <div
          className="w-full rounded-2xl p-4 border border-white/8"
          style={{ backgroundColor: T.card }}
        >
          <p className="text-white/30 text-[10px] uppercase tracking-widest font-black mb-2">Event</p>
          <p className="text-white font-black text-base leading-tight">{beacon.title}</p>
          {beacon.city_slug && (
            <p className="text-white/40 text-xs mt-1 capitalize">{beacon.city_slug}</p>
          )}
          {beacon.starts_at && (
            <p className="text-white/40 text-xs mt-1">
              {new Date(beacon.starts_at).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest">Type</p>
              <p className="text-white/60 text-xs font-semibold capitalize mt-0.5">
                {ticket.ticket_type?.replace('_', ' ')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/30 text-[10px] uppercase tracking-widest">Paid</p>
              <p className="font-black text-sm mt-0.5" style={{ color: T.gold }}>
                £{Number(ticket.price_paid).toFixed(2)}
              </p>
            </div>
          </div>
          {ticket.tier_at_purchase && ticket.tier_at_purchase !== 'mess' && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
                style={{ color: T.gold, backgroundColor: `${T.gold}15` }}
              >
                <Tag className="w-2.5 h-2.5" />
                {ticket.tier_at_purchase} price
              </span>
            </div>
          )}
        </div>
      )}

      {/* Resale CTA — Phase 3 */}
      {isActive && (
        <button
          onClick={handleResale}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-white/10 active:scale-95 transition-transform"
          style={{ backgroundColor: T.surface }}
        >
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-white/40" />
            <span className="text-white/60 font-bold text-sm">Transfer or resell ticket</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUY TICKET — initiates Stripe checkout
// ─────────────────────────────────────────────────────────────────────────────
function BuyTicketView({ beaconId, poolId }) {
  const [pool, setPool]       = useState(null);
  const [beacon, setBeacon]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying]   = useState(false);
  const [profile, setProfile] = useState(null);
  const { closeSheet }        = useSheet();

  useEffect(() => {
    const load = async () => {
      const [poolRes, beaconRes, authRes] = await Promise.all([
        poolId
          ? supabase.from('ticket_inventory_pools')
              .select('id, label, price, ticket_type, inventory_cap, inventory_sold, closes_at, tier_gate, fee_rate')
              .eq('id', poolId)
              .single()
          : supabase.from('ticket_inventory_pools')
              .select('id, label, price, ticket_type, inventory_cap, inventory_sold, closes_at, tier_gate, fee_rate')
              .eq('beacon_id', beaconId)
              .eq('is_active', true)
              .order('price', { ascending: true })
              .limit(1)
              .maybeSingle(),
        beaconId
          ? supabase.from('beacons')
              .select('id, title, starts_at, ends_at, city_slug, description')
              .eq('id', beaconId)
              .single()
          : { data: null },
        supabase.auth.getUser(),
      ]);

      if (poolRes.data) setPool(poolRes.data);
      if (beaconRes.data) setBeacon(beaconRes.data);

      const user = authRes.data?.user;
      if (user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('display_name, age_verified, age_verified_at, age_verification_method')
          .eq('id', user.id)
          .single();
        setProfile(p);
      }
      setLoading(false);
    };
    load();
  }, [beaconId, poolId]);

  const handleBuy = async () => {
    if (!pool) return;
    setBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch('/api/tickets/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pool_id: pool.id }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        if (json.code === 'AGE_VERIFICATION_INCOMPLETE') {
          toast.error('Complete age verification in your profile first.');
        } else {
          toast.error(json.error || 'Could not start checkout');
        }
        return;
      }
      // Redirect to Stripe Checkout
      closeSheet();
      window.location.href = json.checkout_url;
    } catch (err) {
      toast.error(err.message || 'Checkout failed — try again');
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.gold }} />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-white/20" />
        <p className="text-white/50 font-bold text-sm">No tickets available</p>
      </div>
    );
  }

  const available = pool.inventory_cap === null
    ? null
    : pool.inventory_cap - (pool.inventory_sold ?? 0);
  const soldOut = pool.inventory_cap !== null && available <= 0;
  const ageOk   = profile?.age_verified && profile?.age_verified_at && profile?.age_verification_method;

  return (
    <div className="flex flex-col px-4 pt-6 pb-8 gap-5 h-full overflow-y-auto">

      {/* Event header */}
      {beacon && (
        <div>
          <h2 className="text-white font-black text-xl leading-tight">{beacon.title}</h2>
          {beacon.starts_at && (
            <p className="text-white/40 text-sm mt-1">
              {new Date(beacon.starts_at).toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
          )}
          {beacon.city_slug && (
            <p className="text-white/30 text-xs mt-0.5 capitalize">{beacon.city_slug}</p>
          )}
        </div>
      )}

      {/* Ticket pool detail */}
      <div
        className="rounded-2xl p-4 border border-white/8"
        style={{ backgroundColor: T.card }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-base">{pool.label}</p>
            <p className="text-white/40 text-xs capitalize mt-0.5">
              {pool.ticket_type?.replace('_', ' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl" style={{ color: T.gold }}>
              £{Number(pool.price).toFixed(2)}
            </p>
            {pool.fee_rate > 0 && (
              <p className="text-white/30 text-[10px] mt-0.5">
                +{(pool.fee_rate * 100).toFixed(0)}% booking fee
              </p>
            )}
          </div>
        </div>

        {available !== null && (
          <div className="mt-3 pt-3 border-t border-white/8">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: soldOut ? '#EF4444' : available < 10 ? '#F59E0B' : '#22C55E' }}
              />
              <p className="text-white/50 text-xs font-semibold">
                {soldOut ? 'Sold out' : available < 10 ? `Only ${available} left` : `${available} available`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Age verification warning */}
      {!ageOk && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-400 text-xs leading-relaxed font-semibold">
            Age verification required before purchase. Complete it in your profile settings.
          </p>
        </div>
      )}

      {/* Tier gate warning */}
      {pool.tier_gate && pool.tier_gate !== 'mess' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5">
          <Tag className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
          <p className="text-white/50 text-xs leading-relaxed">
            Requires <span className="text-white font-bold capitalize">{pool.tier_gate}</span> membership or above.
          </p>
        </div>
      )}

      <div className="flex-1" />

      {/* Legal micro-copy */}
      <p className="text-white/25 text-[10px] text-center leading-relaxed px-4">
        By purchasing, you agree to HOTMESS ticketing terms. Tickets are non-transferable
        except via the resale market. OSA compliance verified at door.
      </p>

      {/* Buy CTA */}
      <button
        onClick={handleBuy}
        disabled={buying || soldOut || !ageOk}
        className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: soldOut || !ageOk ? T.surface : T.pink,
          color: soldOut || !ageOk ? T.muted : T.white,
          border: soldOut || !ageOk ? `1px solid ${T.dim}` : 'none',
        }}
      >
        {buying ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout...</>
        ) : soldOut ? (
          'Sold out'
        ) : !ageOk ? (
          'Verify age to purchase'
        ) : (
          <>Pay £{Number(pool.price).toFixed(2)} <ChevronRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET VIEW — resale listings (stub, Phase 3)
// ─────────────────────────────────────────────────────────────────────────────
function MarketView() {
  return (
    <div className="flex flex-col items-center justify-center h-64 px-6 text-center gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: T.surface }}
      >
        <ArrowLeftRight className="w-8 h-8 text-white/20" />
      </div>
      <div>
        <p className="text-white font-black text-base">Resale Market</p>
        <p className="text-white/40 text-sm mt-1">Anti-tout resale coming soon.</p>
        <p className="text-white/25 text-xs mt-2 leading-relaxed">
          Face-value capped. Void-before-reissue. Waitlist-matched.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function L2TicketSheet({ mode = 'market', beaconId, poolId, ticketId }) {
  if (mode === 'my-ticket') return <MyTicketView ticketId={ticketId} />;
  if (mode === 'buy')       return <BuyTicketView beaconId={beaconId} poolId={poolId} />;
  return <MarketView />;
}
