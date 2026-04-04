/**
 * L2MyOrdersSheet — Buyer and seller order management
 *
 * Two tabs:
 *   Buying — orders I placed
 *   Selling — orders for my listings
 *
 * Tap order → opens L2OrderSheet with full detail.
 * Seller: "Mark Shipped" on paid orders.
 * Buyer: "Confirm Delivered" on shipped orders.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import {
  Package, ShoppingBag, Loader2, Truck,
  CheckCircle2, Clock, XCircle, CreditCard, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  pending_payment: { label: 'Awaiting Payment', color: 'text-amber-400',     bg: 'bg-amber-400/15',     icon: CreditCard },
  pending:         { label: 'Pending',          color: 'text-white/50',      bg: 'bg-white/10',         icon: Clock },
  paid:            { label: 'Paid',             color: 'text-green-400',     bg: 'bg-green-400/15',     icon: CheckCircle2 },
  shipped:         { label: 'Shipped',          color: 'text-blue-400',      bg: 'bg-blue-400/15',      icon: Truck },
  delivered:       { label: 'Delivered',        color: 'text-[#C8962C]',     bg: 'bg-[#C8962C]/15',     icon: CheckCircle2 },
  completed:       { label: 'Completed',        color: 'text-[#C8962C]',     bg: 'bg-[#C8962C]/15',     icon: CheckCircle2 },
  cancelled:       { label: 'Cancelled',        color: 'text-red-400',       bg: 'bg-red-400/15',       icon: XCircle },
  disputed:        { label: 'Disputed',         color: 'text-yellow-400',    bg: 'bg-yellow-400/15',    icon: AlertCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full', cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function OrderCard({ order, isSeller, onMarkShipped, onMarkDelivered, onTap }) {
  const firstItem = order.order_items?.[0];
  // Also check order.items JSONB (preloved orders)
  const inlineItem = Array.isArray(order.items) ? order.items[0] : null;
  const productName = firstItem?.product_name || inlineItem?.title || 'Item';
  const displayTotal = order.total_gbp;
  const itemCount = (order.order_items?.length || 0) + (Array.isArray(order.items) ? order.items.length : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] overflow-hidden cursor-pointer active:bg-white/5 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-14 h-14 rounded-xl bg-[#C8962C]/10 flex-shrink-0 flex items-center justify-center">
          <Package className="w-6 h-6 text-[#C8962C]/40" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">
            {productName}
            {itemCount > 1 && <span className="text-white/30 text-xs ml-1">+{itemCount - 1} more</span>}
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            {isSeller
              ? `Buyer: ${order.buyer_name || 'Buyer'}`
              : `From: ${order.seller_name || 'Seller'}`}
          </p>
          <p className="text-white/30 text-[10px] mt-0.5">
            {order.created_at && formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-[#C8962C] font-black text-base">
            {displayTotal != null ? `£${Number(displayTotal).toFixed(2)}` : '--'}
          </p>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Seller actions */}
      {isSeller && (order.status === 'paid' || order.status === 'shipped') && (
        <div className="flex gap-2 px-4 pb-4" onClick={e => e.stopPropagation()}>
          {order.status === 'paid' && (
            <Button
              onClick={(e) => { e.stopPropagation(); onMarkShipped(order.id); }}
              className="flex-1 bg-[#C8962C] text-black font-black text-xs rounded-xl py-2"
            >
              <Truck className="w-3.5 h-3.5 mr-1" /> Mark Shipped
            </Button>
          )}
          {order.status === 'shipped' && (
            <Button
              onClick={(e) => { e.stopPropagation(); onMarkDelivered(order.id); }}
              className="flex-1 bg-[#C8962C]/20 text-[#C8962C] border border-[#C8962C]/30 font-black text-xs rounded-xl py-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm Delivered
            </Button>
          )}
        </div>
      )}

      {/* Buyer: confirm delivered */}
      {!isSeller && order.status === 'shipped' && (
        <div className="flex gap-2 px-4 pb-4" onClick={e => e.stopPropagation()}>
          <Button
            onClick={(e) => { e.stopPropagation(); onMarkDelivered(order.id); }}
            className="flex-1 bg-[#C8962C] text-black font-black text-xs rounded-xl py-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm Delivered
          </Button>
        </div>
      )}

      {/* Buyer: tracking number */}
      {!isSeller && order.tracking_number && (
        <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
          <p className="text-white/40 text-xs">
            Tracking: <span className="text-white font-mono">{order.tracking_number}</span>
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function L2MyOrdersSheet() {
  const [tab, setTab] = useState('buying');
  const queryClient = useQueryClient();
  const { openSheet } = useSheet();

  const { data: user } = useQuery({
    queryKey: ['supabase-user'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user || null;
    },
  });

  const { data: buyingOrders = [], isLoading: buyLoading } = useQuery({
    queryKey: ['my-buying-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(product_name, price_gbp)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.warn('[orders] buying:', error); return []; }
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: sellingOrders = [], isLoading: sellLoading } = useQuery({
    queryKey: ['my-selling-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(product_name, price_gbp)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.warn('[orders] selling:', error); return []; }
      return data || [];
    },
    enabled: !!user?.id,
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
      queryClient.invalidateQueries({ queryKey: ['my-selling-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-buying-orders'] });
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
                <ShoppingBag className="w-10 h-10 text-[#C8962C]/15 mx-auto mb-3" />
                <p className="text-white/40 font-bold">No orders yet</p>
                <p className="text-white/20 text-sm mt-1">Browse MessMarket to find something</p>
              </>
            ) : (
              <>
                <Package className="w-10 h-10 text-[#C8962C]/15 mx-auto mb-3" />
                <p className="text-white/40 font-bold">No sales yet</p>
                <p className="text-white/20 text-sm mt-1">List an item to start selling</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <OrderCard
                key={order.id}
                order={order}
                isSeller={tab === 'selling'}
                onMarkShipped={(id) => updateStatus.mutate({ orderId: id, status: 'shipped' })}
                onMarkDelivered={(id) => updateStatus.mutate({ orderId: id, status: 'delivered' })}
                onTap={() => openSheet('order', { orderId: order.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
