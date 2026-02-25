/**
 * L2OrderSheet — Individual order details
 * Shows order items, status, shipping, and QR code.
 */

import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, QrCode, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  processing: { icon: Clock, color: 'text-white/60', label: 'Processing' },
  shipped: { icon: Truck, color: 'text-[#C8962C]', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: 'text-[#00FF87]', label: 'Delivered' },
  cancelled: { icon: Clock, color: 'text-red-400', label: 'Cancelled' },
};

export default function L2OrderSheet({ orderId }) {
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openSheet } = useSheet();

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    Promise.all([
      supabase
        .from('orders')
        .select('id, created_at, total_gbp, status, tracking_number, shipping_address, buyer_email')
        .eq('id', orderId)
        .single(),
      supabase
        .from('order_items')
        .select('id, product_name, price_gbp, quantity')
        .eq('order_id', orderId),
    ]).then(([{ data: orderData }, { data: itemsData }]) => {
      setOrder(orderData);
      setItems(itemsData || []);
      setLoading(false);
    });
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Package className="w-10 h-10 text-white/10 mb-3" />
        <p className="text-white/50 font-bold text-sm">Order not found</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Order header */}
      <div className="px-4 pt-4 pb-4">
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Order</p>
              <p className="text-white font-black text-lg">#{order.id?.slice(-6).toUpperCase()}</p>
              <p className="text-white/40 text-xs mt-1">
                {format(new Date(order.created_at), 'd MMM yyyy · h:mm a')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className={`flex items-center gap-1.5 ${statusCfg.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-black">{statusCfg.label}</span>
              </div>
              <p className="text-[#C8962C] font-black text-lg">£{(order.total_gbp || 0).toFixed(2)}</p>
            </div>
          </div>

          {order.tracking_number && (
            <div className="mt-3 pt-3 border-t border-white/8">
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Tracking</p>
              <p className="text-white font-mono text-sm">{order.tracking_number}</p>
            </div>
          )}

          {order.shipping_address && (
            <div className="mt-3 pt-3 border-t border-white/8 flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-white/30 flex-shrink-0 mt-0.5" />
              <p className="text-white/50 text-xs leading-relaxed">{order.shipping_address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Items</p>
          <div className="bg-[#1C1C1E] rounded-2xl divide-y divide-white/5">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-[#C8962C]" />
                </div>
                <span className="flex-1 text-white text-sm truncate">{item.product_name}</span>
                {item.quantity > 1 && (
                  <span className="text-white/30 text-xs">×{item.quantity}</span>
                )}
                <span className="text-white/60 text-sm">£{((item.price_gbp || 0) * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR */}
      <div className="px-4 pb-6">
        <button
          onClick={() => openSheet('qr', { orderId: order.id })}
          className="w-full bg-[#1C1C1E] rounded-2xl py-4 flex items-center justify-center gap-2 border border-white/8 hover:bg-white/5 transition-colors"
        >
          <QrCode className="w-4 h-4 text-[#C8962C]" />
          <span className="text-white font-bold text-sm">View QR Code</span>
        </button>
      </div>
    </div>
  );
}
