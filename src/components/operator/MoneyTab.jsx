/**
 * MoneyTab — Operator cockpit MONEY surface (Cockpit Brief B)
 *
 * Absorbs the EXISTING commerce code (Seller + L2Vendor) into the operator
 * cockpit instead of rebuilding it. Composes:
 *   - StripeConnectBanner  (lifted from L2VendorDashboardSheet — wired to the
 *     real /api/stripe/connect-onboard Account-Link flow)
 *   - PayoutManager        (reused from components/seller — payouts)
 *   - A simple sales summary: ticket orders + market orders + total revenue.
 *
 * Role adaptation (prop `role`):
 *   - venue    -> venue subscription status + event ticket sales
 *   - promoter -> event ticket sales + market drops
 * Shared payout / Connect UI for both.
 *
 * Scope: list + totals only. No analytics, no charts. No new tables.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ExternalLink, Loader2, CheckCircle2,
  TicketIcon, TrendingUp, ShoppingBag,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import PayoutManager from '@/components/seller/PayoutManager';

const T = {
  black:  '#000',
  white:  '#fff',
  gold:   '#C8962C',
  green:  '#34C759',
  red:    '#FF3B30',
  card:   '#0d0d0d',
  border: '#1a1a1a',
  muted:  'rgba(255,255,255,0.45)',
};

// ---------------------------------------------------------------------------
// STRIPE CONNECT BANNER (lifted from L2VendorDashboardSheet, wired to real API)
// ---------------------------------------------------------------------------
function StripeConnectBanner({ seller }) {
  const [loading, setLoading] = useState(false);

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in to connect Stripe');
        return;
      }
      // Real endpoint: creates an Express account + Account Link, returns { url }.
      const res = await fetch('/api/stripe/connect-onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ seller_id: seller?.id }),
      });
      const json = await res.json();
      if (json?.url) {
        window.location.href = json.url; // redirect to Stripe-hosted onboarding
      } else {
        toast.error(json?.error || 'Could not start Stripe Connect onboarding');
      }
    } catch {
      toast.error('Failed to connect Stripe');
    } finally {
      setLoading(false);
    }
  };

  // Connected -> compact confirmation strip.
  if (seller?.stripe_onboarding_complete) {
    return (
      <div style={{
        background: `${T.green}12`, border: `1px solid ${T.green}40`,
        borderRadius: 10, padding: '12px 14px', display: 'flex',
        alignItems: 'center', gap: 10, marginBottom: 16,
      }}>
        <CheckCircle2 size={18} style={{ color: T.green, flexShrink: 0 }} />
        <div style={{ color: T.green, fontWeight: 700, fontSize: 13 }}>
          Stripe Connected — payouts enabled
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: `${T.gold}15`, border: `1px solid ${T.gold}50`,
      borderRadius: 12, padding: 16, display: 'flex', gap: 12,
      alignItems: 'flex-start', marginBottom: 16,
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

// ---------------------------------------------------------------------------
// STAT TILE
// ---------------------------------------------------------------------------
function StatTile({ icon, label, value }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: '12px 10px', textAlign: 'center',
    }}>
      <div style={{ color: T.gold, marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ color: T.white, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: T.muted, fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      color: T.muted, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      margin: '20px 0 10px',
    }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SALES SUMMARY (simple list + totals — no analytics)
// ---------------------------------------------------------------------------
function gbp(n) { return `£${Number(n || 0).toFixed(2)}`; }

function SalesSummary({ role, ticketOrders, marketOrders, subscriptionActive }) {
  const ticketRevenue = ticketOrders.reduce(
    (a, o) => a + Number(o.amount ?? o.price_paid ?? 0), 0,
  );
  const marketRevenue = marketOrders.reduce((a, o) => a + Number(o.total_gbp || 0), 0);
  const totalRevenue = ticketRevenue + marketRevenue;
  const showMarket = role === 'promoter';

  return (
    <div>
      {/* Totals */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showMarket ? '1fr 1fr 1fr' : '1fr 1fr',
        gap: 10,
      }}>
        <StatTile icon={<TicketIcon size={16} />} label="Ticket sales" value={ticketOrders.length} />
        {showMarket && (
          <StatTile icon={<ShoppingBag size={16} />} label="Market orders" value={marketOrders.length} />
        )}
        <StatTile icon={<TrendingUp size={16} />} label="Revenue" value={gbp(totalRevenue)} />
      </div>

      {/* Venue: subscription status */}
      {role === 'venue' && (
        <>
          <SectionLabel>Venue subscription</SectionLabel>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle2 size={16} style={{ color: subscriptionActive ? T.green : T.muted }} />
            <div style={{ color: T.white, fontSize: 13, fontWeight: 600 }}>
              {subscriptionActive ? 'Active' : 'No active subscription'}
            </div>
          </div>
        </>
      )}

      {/* Ticket order list */}
      <SectionLabel>Event ticket sales ({ticketOrders.length})</SectionLabel>
      {ticketOrders.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13, padding: '16px 0' }}>No ticket sales yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ticketOrders.map((o) => (
            <div key={o.id} style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: T.white, fontSize: 13, fontWeight: 600 }}>
                  {o.beacons?.title || o.ticket_type || 'Ticket'}
                </div>
                <div style={{ color: T.muted, fontSize: 11 }}>
                  {o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  {o.ticket_state ? ` · ${o.ticket_state}` : ''}
                </div>
              </div>
              <div style={{ color: T.green, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {gbp(o.amount ?? o.price_paid)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promoter: market drops list */}
      {showMarket && (
        <>
          <SectionLabel>Market drops ({marketOrders.length})</SectionLabel>
          {marketOrders.length === 0 ? (
            <div style={{ color: T.muted, fontSize: 13, padding: '16px 0' }}>No market orders yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {marketOrders.map((o) => (
                <div key={o.id} style={{
                  background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: T.white, fontSize: 13, fontWeight: 600 }}>
                      Order #{String(o.id).slice(0, 8)}
                    </div>
                    <div style={{ color: T.muted, fontSize: 11 }}>
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      {o.status ? ` · ${o.status}` : ''}
                    </div>
                  </div>
                  <div style={{ color: T.green, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {gbp(o.total_gbp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
export default function MoneyTab({ role = 'venue', venueId }) {
  const [userId, setUserId] = useState(null);
  const [seller, setSeller] = useState(null);   // market_sellers row
  const [bootstrapping, setBootstrapping] = useState(true);

  // Resolve auth user + market_sellers row (seller identity for payouts/Connect).
  const loadSeller = useCallback(async () => {
    setBootstrapping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: sellerRow } = await supabase
        .from('market_sellers')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      setSeller(sellerRow);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => { loadSeller(); }, [loadSeller]);

  // Ticket orders for the operator's beacons (venue + promoter both see these).
  const { data: ticketOrders = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['operator-money-tickets', venueId, userId],
    enabled: !!(venueId || userId),
    queryFn: async () => {
      // Beacons this operator owns / runs at this venue.
      let beaconQuery = supabase.from('beacons').select('id, title');
      if (venueId) beaconQuery = beaconQuery.eq('venue_id', venueId);
      else if (userId) beaconQuery = beaconQuery.eq('owner_id', userId);
      const { data: beacons } = await beaconQuery;
      const beaconIds = (beacons || []).map((b) => b.id);
      if (beaconIds.length === 0) return [];
      const titleById = Object.fromEntries((beacons || []).map((b) => [b.id, b.title]));

      const { data: orders } = await supabase
        .from('ticket_orders')
        .select('id, beacon_id, amount, price_paid, status, ticket_state, ticket_type, created_at')
        .in('beacon_id', beaconIds)
        .order('created_at', { ascending: false })
        .limit(100);

      return (orders || []).map((o) => ({ ...o, beacons: { title: titleById[o.beacon_id] } }));
    },
  });

  // Market orders — promoter only (market drops they sell).
  const { data: marketOrders = [] } = useQuery({
    queryKey: ['operator-money-market', userId],
    enabled: role === 'promoter' && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, total_gbp, status, payment_status, created_at')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Payouts for PayoutManager (live `payouts` table, mapped below).
  const { data: payouts = [] } = useQuery({
    queryKey: ['operator-money-payouts', seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('payouts')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });
      return (data || []).map((p) => ({
        ...p,
        amount_gbp: p.net_pence != null ? p.net_pence / 100 : Number(p.amount) || 0,
        arrival_date: p.paid_at,
        stripe_payout_id: p.stripe_transfer_id,
        order_ids: [],
      }));
    },
  });

  // Market orders feed PayoutManager's available-balance calc (it filters to
  // delivered stripe orders not yet paid out). Promoter-only; venue passes [].
  const payoutOrders = role === 'promoter' ? marketOrders : [];

  const subscriptionActive = seller?.status === 'active';

  if (bootstrapping) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: T.muted }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Stripe Connect status + onboarding prompt */}
      <StripeConnectBanner seller={seller} />

      {/* Sales summary: tickets (+ market for promoter), totals, role status */}
      {ticketsLoading ? (
        <div style={{ color: T.muted, fontSize: 13, padding: '8px 0' }}>Loading sales…</div>
      ) : (
        <SalesSummary
          role={role}
          ticketOrders={ticketOrders}
          marketOrders={marketOrders}
          subscriptionActive={subscriptionActive}
        />
      )}

      {/* Payouts — shared between both roles */}
      <SectionLabel>Payouts</SectionLabel>
      {seller?.id ? (
        <PayoutManager
          payouts={payouts}
          orders={payoutOrders}
          sellerId={seller.id}
          stripeConnectId={seller.stripe_account_id}
        />
      ) : (
        <div style={{
          background: T.card, border: `1px dashed ${T.border}`, borderRadius: 10,
          padding: '24px 16px', textAlign: 'center', color: T.muted, fontSize: 13,
        }}>
          No seller profile yet — connect Stripe above to enable payouts.
        </div>
      )}
    </div>
  );
}
