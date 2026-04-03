/**
 * L2MyOrdersSheet — Buyer and seller order management
 *
 * Two tabs:
 *   Buying — orders I placed
 *   Selling — orders for my listings
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import {
  Package, ShoppingBag, Loader2, Truck,
  CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'text-white/50',    bg: 'bg-white/10',           icon: Clock },
  paid:      { label: 'Paid',      color: 'text-[#C8962C]',   bg: 'bg-[#C8962C]/15',       icon: CheckCircle2 },
  shipped:   { label: 'Shipped',   color: 'text-blue-400',    bg: 'bg-blue-400/15',         icon: Truck },
  delivered: { label: 'Delivered', color: 'text-[#39FF14]',   bg: 'bg-[#39FF14]/15',        icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'text-[#39FF14]',   bg: 'bg-[#39FF14]/15',        icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-red-400',     bg: 'bg-red-400/15',          icon: XCircle },
  disputed:  { label: 'Disputed',  color: 'text-yellow-400',  bg: 'bg-yellow-400/15',       icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full', cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function OrderCard({ order, isSeller, onMarkShipped, onMarkDelivered }) {
  // Get product name from joined order_items (first item)
  const firstItem = order.order_items?.[0];
  const productName = firstItem?.product_name || 'Item';
  const displayTotal = order.total_gbp;

  return (
    <div className="bg-[#1C1C1E] rounded-2xl border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Product icon placeholder */}
        <div className="w-14 h-14 rounded-xl bg-white/5 flex-shrink-0 flex items-center justify-center">
          <Package className="w-6 h-6 text-white/20" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">
            {productName}
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            {isSeller
              ? `Buyer: ${order.buyer_email?.split('@')[0]}`
              : `From: ${order.seller_email?.split('@')[0]}`}
          </p>
          <p className="text-white/30 text-[10px] mt-0.5">
            {order.created_at && formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-[#C8962C] font-black text-base">
            {displayTotal != null ? `£${Number(displayTotal).toFixed(2)}` : '—'}
          </p>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Seller actions */}
      {isSeller && (
        <div className="flex gap-2 px-4 pb-4">
          {order.status === 'paid' && (
            <Button
              onClick={() => onMarkShipped(order.id)}
              className="flex-1 bg-[#C8962C] text-black font-black text-xs rounded-xl py-2"
            >
              <Truck className="w-3.5 h-3.5 mr-1" /> Mark Shipped
            </Button>
          )}
          {order.status === 'shipped' && (
            <Button
              onClick={() => onMarkDelivered(order.id)}
              className="flex-1 bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30 font-black text-xs rounded-xl py-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm Delivered
            </Button>
          )}
        </div>
      )}

      {/* Buyer: tracking number */}
      {!isSeller && order.tracking_number && (
        <div className="px-4 pb-4">
          <p className="text-white/40 text-xs">
            Tracking: <span className="text-white font-mono">{order.tracking_number}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default function L2MyOrdersSheet() {
  const [tab, setTab] = useState('buying');
  const queryClient = useQueryClient();
  const { openSheet } = useSheet();

  // Get current user from Supabase auth
  const { data: user } = useQuery({
    queryKey: ['supabase-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: buyingOrders = [], isLoading: buyLoading } = useQuery({
    queryKey: ['my-buying-orders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(product_name, price_gbp)')
        .eq('buyer_email', user.email)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.warn('[orders] buying:', error); return []; }
      return data || [];
    },
    enabled: !!user?.email,
  });

  const { data: sellingOrders = [], isLoading: sellLoading } = useQuery({
    queryKey: ['my-selling-orders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(product_name, price_gbp)')
        .eq('seller_email', user.email)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.warn('[orders] selling:', error); return []; }
      return data || [];
    },
    enabled: !!user?.email,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-selling-orders']);
      queryClient.invalidateQueries(['seller-completed-orders']);
      toast.success('Order updated');
    },
    onError: () => toast.error('Failed to update order'),
  });

  const isLoading = tab === 'buying' ? buyLoading : sellLoading;
  const orders = tab === 'buying' ? buyingOrders : sellingOrders;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { key: 'buying', label: 'Buying', icon: ShoppingBag, count: buyingOrders.length },
          { key: 'selling', label: 'Selling', icon: Package, count: sellingOrders.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-black uppercase tracking-wider transition-colors',
              tab === key
                ? 'text-[#C8962C] border-b-2 border-[#C8962C]'
                : 'text-white/40'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[9px] font-black',
                tab === key ? 'bg-[#C8962C]/20 text-[#C8962C]' : 'bg-white/10 text-white/40'
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            {tab === 'buying' ? (
              <>
                <ShoppingBag className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 font-bold">No orders yet</p>
                <p className="text-white/20 text-sm mt-1">Browse MessMarket to find something</p>
              </>
            ) : (
              <>
                <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 font-bold">No sales yet</p>
                <p className="text-white/20 text-sm mt-1">List an item to start selling</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                isSeller={tab === 'selling'}
                onMarkShipped={(id) => updateStatus.mutate({ orderId: id, status: 'shipped' })}
                onMarkDelivered={(id) => updateStatus.mutate({ orderId: id, status: 'delivered' })}

              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
