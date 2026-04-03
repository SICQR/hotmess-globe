/**
 * VaultMode — Purchases, tickets, QR codes, rewards
 *
 * Tabs: All / Orders / Tickets / Listings
 * Accessible via Profile → Vault or /vault deep link.
 */

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package, ShoppingBag, Ticket, Lock, Loader2,
  QrCode, Trophy
} from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { format } from 'date-fns';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'all', label: 'All', icon: Lock },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'listings', label: 'Sold', icon: Package },
] as const;

type Tab = typeof TABS[number]['id'];

type OrderRow = {
  id: string;
  created_at: string;
  total_gbp: number;
  status: string;
  tracking_number?: string;
};

type TicketRow = {
  event_id: string;
  created_at: string;
  status: string;
  events?: { title?: string; name?: string; starts_at?: string; venue?: string };
};

type ListingRow = {
  id: string;
  title: string;
  price: number;
  created_at: string;
  status: string;
};

export default function VaultMode() {
  const [tab, setTab] = useState<Tab>('all');
  const queryClient = useQueryClient();
  const { openSheet } = useSheet();
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderRow[]>({
    queryKey: ['vault-orders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data } = await supabase
        .from('orders')
        .select('id, created_at, total_gbp, status, tracking_number')
        .eq('buyer_email', user.email)
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user?.email,
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<TicketRow[]>({
    queryKey: ['vault-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('event_rsvps')
        .select('event_id, created_at, status, events(title, name, starts_at, venue)')
        .eq('user_id', user.id)
        .eq('status', 'going')
        .order('created_at', { ascending: false })
        .limit(30);
      return (data as TicketRow[]) || [];
    },
    enabled: !!user?.id,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery<ListingRow[]>({
    queryKey: ['vault-listings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('preloved_listings')
        .select('id, title, price, created_at, status')
        .eq('seller_id', user.id)
        .eq('status', 'sold')
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const isLoading = ordersLoading || ticketsLoading || listingsLoading;

  const allItems = [
    ...orders.map(o => ({ type: 'order' as const, data: o, date: o.created_at })),
    ...tickets.map(t => ({ type: 'ticket' as const, data: t, date: t.created_at })),
    ...listings.map(l => ({ type: 'listing' as const, data: l, date: l.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const visibleItems = tab === 'all'
    ? allItems
    : tab === 'orders'
    ? allItems.filter(i => i.type === 'order')
    : tab === 'tickets'
    ? allItems.filter(i => i.type === 'ticket')
    : allItems.filter(i => i.type === 'listing');

  const totalSpend = orders.reduce((sum, o) => sum + (o.total_gbp || 0), 0);

  return (
    <div className="h-full w-full bg-[#050507] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex-shrink-0">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1"><span className="text-white">HOT</span><span className="text-[#C8962C]">MESS</span></p>
        <div className="flex items-end justify-between">
          <h1 className="font-black text-2xl text-white">Vault</h1>
          {totalSpend > 0 && (
            <div className="flex items-center gap-1.5 bg-[#C8962C]/15 border border-[#C8962C]/25 rounded-full px-3 py-1">
              <Trophy className="w-3 h-3 text-[#C8962C]" />
              <span className="text-[#C8962C] text-xs font-black">£{totalSpend.toFixed(0)} spent</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mt-3">
          {[
            { label: 'Orders', count: orders.length, icon: ShoppingBag },
            { label: 'Tickets', count: tickets.length, icon: Ticket },
            { label: 'Items Sold', count: listings.length, icon: Package },
          ].map(({ label, count, icon: Icon }) => (
            <div key={label} className="flex-1 bg-[#1C1C1E] rounded-xl p-2.5 text-center">
              <Icon className="w-3.5 h-3.5 text-[#C8962C] mx-auto mb-1" />
              <p className="text-white font-black text-base leading-none">{count}</p>
              <p className="text-white/30 text-[9px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-white/10 flex-shrink-0 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors',
              tab === id
                ? 'text-[#C8962C] border-b-2 border-[#C8962C]'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-momentum" {...pullHandlers}>
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white font-bold text-base">Your archive starts here</p>
            <p className="text-white/40 text-sm mt-1.5 max-w-[260px]">
              Orders, event tickets, and sold items all end up in your Vault. Start exploring to build your collection.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => openSheet('shop')}
                className="h-10 px-5 rounded-xl bg-[#C8962C] text-black font-bold text-xs active:scale-95 transition-transform"
              >
                Go shopping
              </button>
              <button
                onClick={() => openSheet('schedule')}
                className="h-10 px-5 rounded-xl border border-white/15 text-white/70 font-bold text-xs active:scale-95 transition-transform"
              >
                Explore music
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5 pb-24">
            {visibleItems.map((item, i) => (
              <motion.div
                key={`${item.type}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
              >
                {item.type === 'order' && <OrderItem order={item.data} onQR={() => openSheet('qr', { orderId: item.data.id })} />}
                {item.type === 'ticket' && <TicketItem ticket={item.data} onQR={() => openSheet('qr', { ticketId: item.data.event_id })} />}
                {item.type === 'listing' && <ListingItem listing={item.data} onResell={() => openSheet('sell')} />}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderItem({ order, onQR }: { order: OrderRow; onQR: () => void }) {
  const statusColor = order.status === 'delivered' ? '#30D158' : order.status === 'shipped' ? '#C8962C' : 'white';
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-4 h-4 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">Order #{order.id?.slice(-6).toUpperCase()}</p>
        <p className="text-white/40 text-[11px] mt-0.5">
          {format(new Date(order.created_at), 'd MMM yyyy')} · £{(order.total_gbp || 0).toFixed(2)}
        </p>
        <p className="text-[11px] mt-0.5 font-semibold capitalize" style={{ color: statusColor }}>
          {order.status || 'processing'}
        </p>
      </div>
      <button
        onClick={onQR}
        className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center flex-shrink-0"
      >
        <QrCode className="w-3.5 h-3.5 text-white/50" />
      </button>
    </div>
  );
}

function TicketItem({ ticket, onQR }: { ticket: TicketRow; onQR: () => void }) {
  const event = ticket.events;
  const title = event?.title || event?.name || 'Event Ticket';
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
        <Ticket className="w-4 h-4 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{title}</p>
        {event?.starts_at && (
          <p className="text-[#C8962C] text-[11px] mt-0.5">
            {format(new Date(event.starts_at), 'EEE d MMM · h:mm a')}
          </p>
        )}
        {event?.venue && (
          <p className="text-white/40 text-[11px] mt-0.5 truncate">{event.venue}</p>
        )}
      </div>
      <button
        onClick={onQR}
        className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center flex-shrink-0"
      >
        <QrCode className="w-3.5 h-3.5 text-[#C8962C]" />
      </button>
    </div>
  );
}

function ListingItem({ listing, onResell }: { listing: ListingRow; onResell: () => void }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-bold text-sm truncate">{listing.title}</p>
          <span className="flex-shrink-0 text-[9px] font-black bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/20 rounded px-1.5 py-0.5 uppercase">
            SOLD
          </span>
        </div>
        <p className="text-[#C8962C] text-[11px] mt-0.5">£{(listing.price || 0).toFixed(2)}</p>
        <p className="text-white/30 text-[10px] mt-0.5">
          {format(new Date(listing.created_at), 'd MMM yyyy')}
        </p>
      </div>
      <button
        onClick={onResell}
        className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-[#C8962C]/20 text-[#C8962C] border border-[#C8962C]/30 text-xs font-black uppercase"
      >
        Resell
      </button>
    </div>
  );
}
