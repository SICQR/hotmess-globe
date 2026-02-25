/**
 * L2VaultSheet — Passes, orders, and archive
 *
 * Three tabs:
 *   Passes  — event tickets + QR codes from event_rsvps
 *   Orders  — purchase history from orders + order_items
 *   Archive — placeholder for expired passes
 */

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import {
  Ticket, ShoppingBag, Archive, Loader2,
  CheckCircle2, HelpCircle, XCircle, Truck,
  Clock, QrCode, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ─── QR canvas helper (same approach as L2QRSheet) ───────────────────────────

function QRCanvas({ value, size }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#000';
    const moduleSize = 8;
    const modules = Math.floor(size / moduleSize);
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        const seed = (hash * (row + 1) * (col + 1)) % 7;
        if (seed < 4) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize - 1, moduleSize - 1);
        }
      }
    }
    const draw3x3 = (x, y) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, 24, 24);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 4, y + 4, 16, 16);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 8, y + 8, 8, 8);
    };
    draw3x3(0, 0);
    draw3x3(size - 24, 0);
    draw3x3(0, size - 24);
  }, [value, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

// ─── Full-screen QR overlay ──────────────────────────────────────────────────

function QROverlay({ value, label, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[90] bg-black/95 flex flex-col items-center justify-center px-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        aria-label="Close QR overlay"
      >
        <X className="w-5 h-5 text-white/70" />
      </button>

      <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-6">
        Show at door
      </p>

      <div className="bg-white rounded-3xl p-6 shadow-2xl">
        <QRCanvas value={value} size={240} />
      </div>

      <p className="mt-6 text-[#C8962C] font-black text-sm uppercase tracking-wide text-center">
        {label}
      </p>
      <p className="mt-2 text-white/20 text-[11px] font-mono text-center break-all max-w-xs">
        {value}
      </p>

      <p className="mt-8 text-white/40 text-xs text-center max-w-xs leading-relaxed">
        Present this QR code to venue staff for entry. Tap anywhere to close.
      </p>
    </div>
  );
}

// ─── Status configs ───────────────────────────────────────────────────────────

const RSVP_STATUS = {
  going:      { label: 'Going',      color: 'text-[#39FF14]', bg: 'bg-[#39FF14]/15', icon: CheckCircle2 },
  interested: { label: 'Interested', color: 'text-[#C8962C]', bg: 'bg-[#C8962C]/15', icon: HelpCircle },
  maybe:      { label: 'Maybe',      color: 'text-[#C8962C]', bg: 'bg-[#C8962C]/15', icon: HelpCircle },
};

const ORDER_STATUS = {
  pending:   { label: 'Pending',   color: 'text-white/50',  bg: 'bg-white/10',       icon: Clock },
  paid:      { label: 'Paid',      color: 'text-[#C8962C]', bg: 'bg-[#C8962C]/15',   icon: CheckCircle2 },
  shipped:   { label: 'Shipped',   color: 'text-blue-400',  bg: 'bg-blue-400/15',    icon: Truck },
  delivered: { label: 'Delivered', color: 'text-[#39FF14]', bg: 'bg-[#39FF14]/15',   icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'text-[#39FF14]', bg: 'bg-[#39FF14]/15',   icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-red-400',   bg: 'bg-red-400/15',     icon: XCircle },
};

function StatusBadge({ status, statusMap }) {
  const cfg = (statusMap && statusMap[status]) || { label: status || 'Unknown', color: 'text-white/50', bg: 'bg-white/10', icon: HelpCircle };
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full', cfg.color, cfg.bg)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Pass card (event ticket) ─────────────────────────────────────────────────

function PassCard({ rsvp }) {
  const [showQR, setShowQR] = useState(false);
  const beacon = rsvp.Beacon;
  const eventTitle = (beacon && (beacon.event_title || beacon.title)) || 'Event';
  const eventStart = beacon && (beacon.event_start || beacon.event_date);
  const venueName = beacon && (beacon.venue_name || beacon.venue_address);
  const qrValue = `hm:pass:${rsvp.id}`;
  const ticketRef = rsvp.id.slice(-8).toUpperCase();

  return (
    <>
      <div className="bg-[#1C1C1E] rounded-2xl border border-white/8 overflow-hidden">
        {/* Amber accent stripe */}
        <div className="h-1 bg-gradient-to-r from-[#C8962C] via-[#e8b84b] to-[#C8962C]" />

        <div className="p-4">
          {/* Event name + status */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-white font-bold text-base leading-tight flex-1">{eventTitle}</p>
            <StatusBadge status={rsvp.status || 'going'} statusMap={RSVP_STATUS} />
          </div>

          {/* Date + venue */}
          <div className="flex flex-col gap-0.5 mb-3">
            {eventStart && (
              <p className="text-[#C8962C] text-xs font-semibold">
                {format(new Date(eventStart), 'EEE d MMM yyyy · h:mm a')}
              </p>
            )}
            {venueName && (
              <p className="text-[#C8962C]/70 text-xs">{venueName}</p>
            )}
          </div>

          {/* Ticket ID bar */}
          <div className="font-mono text-xs bg-black/50 px-3 py-2 rounded-lg text-[#C8962C] tracking-widest text-center mb-3 border border-white/5">
            #{ticketRef}
          </div>

          {/* Show at door */}
          <button
            onClick={() => setShowQR(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#C8962C]/15 border border-[#C8962C]/30 text-[#C8962C] text-xs font-black uppercase tracking-wider"
          >
            <QrCode className="w-3.5 h-3.5" />
            Show at door
          </button>
        </div>
      </div>

      {showQR && (
        <QROverlay
          value={qrValue}
          label={eventTitle}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order }) {
  const firstItem = order.order_items && order.order_items[0];
  const productName = (firstItem && firstItem.product_name) || 'Item';

  return (
    <div className="bg-[#1C1C1E] rounded-2xl border border-white/8 p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex-shrink-0 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-white/20" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{productName}</p>
          <p className="text-white/40 text-xs mt-0.5">
            From: {order.seller_email ? order.seller_email.split('@')[0] : 'seller'}
          </p>
          {order.created_at && (
            <p className="text-white/25 text-[10px] mt-0.5 font-mono">
              {format(new Date(order.created_at), 'd MMM yyyy')}
            </p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-[#C8962C] font-black text-base">
            {order.total_gbp != null ? `\u00a3${Number(order.total_gbp).toFixed(2)}` : '\u2014'}
          </p>
          <div className="mt-1">
            <StatusBadge status={order.status} statusMap={ORDER_STATUS} />
          </div>
        </div>
      </div>

      {order.tracking_number && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-white/40 text-xs">
            Tracking:{' '}
            <span className="text-white font-mono">{order.tracking_number}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TAB_DEFS = [
  { key: 'passes',  label: 'Passes',  Icon: Ticket },
  { key: 'orders',  label: 'Orders',  Icon: ShoppingBag },
  { key: 'archive', label: 'Archive', Icon: Archive },
];

function TabBar({ active, onChange, counts }) {
  return (
    <div className="flex gap-2 px-4 py-3 border-b border-white/8">
      {TAB_DEFS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-colors',
              isActive
                ? 'bg-[#C8962C] text-black'
                : 'bg-white/5 text-white/50'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {counts[key] > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[9px] font-black',
                isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/40'
              )}>
                {counts[key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function L2VaultSheet() {
  const [tab, setTab] = useState('passes');

  // Get current auth user
  const { data: user } = useQuery({
    queryKey: ['supabase-user'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      return authUser;
    },
  });

  // Tab 1: Passes — event_rsvps (migration 20260129) uses user_id UUID + status
  const { data: passes = [], isLoading: passesLoading } = useQuery({
    queryKey: ['vault-passes', user && user.id],
    queryFn: async () => {
      if (!user || !user.id) return [];
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('id, status, created_at, beacon_id, Beacon:beacon_id(id, event_title, title, event_start, event_date, venue_name, venue_address)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('[vault] passes error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!(user && user.id),
  });

  // Tab 2: Orders — buyer purchase history
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['vault-orders', user && user.email],
    queryFn: async () => {
      if (!user || !user.email) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total_gbp, tracking_number, created_at, seller_email, order_items(product_name, price_gbp)')
        .eq('buyer_email', user.email)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('[vault] orders error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!(user && user.email),
  });

  const counts = {
    passes: passes.length,
    orders: orders.length,
    archive: 0,
  };

  const isLoading = tab === 'passes' ? passesLoading : tab === 'orders' ? ordersLoading : false;

  return (
    <div className="flex flex-col h-full">
      <TabBar active={tab} onChange={setTab} counts={counts} />

      <div className="flex-1 overflow-y-auto overscroll-contain">

        {/* ── Passes ── */}
        {tab === 'passes' && (
          <div className="px-4 py-4">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
              </div>
            ) : passes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Ticket className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-white font-bold text-base mb-1">No event passes yet</p>
                <p className="text-white/40 text-sm">
                  RSVP to events on the Pulse tab and they&apos;ll appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {passes.map(rsvp => (
                  <PassCard key={rsvp.id} rsvp={rsvp} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Orders ── */}
        {tab === 'orders' && (
          <div className="px-4 py-4">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ShoppingBag className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-white font-bold text-base mb-1">No orders yet</p>
                <p className="text-white/40 text-sm">
                  Your purchase history from MessMarket will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Archive ── */}
        {tab === 'archive' && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Archive className="w-12 h-12 text-[#C8962C]/40 mb-4" />
            <p className="text-white font-bold text-base mb-1">Archive is empty</p>
            <p className="text-white/40 text-sm leading-relaxed">
              Your past events will appear here once they expire.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
