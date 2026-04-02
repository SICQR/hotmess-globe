/**
 * L2OrderSheet — Individual order details with timeline + actions
 * Shows order items, status timeline, shipping, buyer/seller info, and QR code.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Truck, CheckCircle, Clock, QrCode, Loader2, MapPin,
  MessageCircle, CreditCard, XCircle,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_STEPS = [
  { key: 'pending_payment', icon: CreditCard, label: 'Created', color: '#8E8E93' },
  { key: 'paid', icon: CheckCircle, label: 'Paid', color: '#C8962C' },
  { key: 'shipped', icon: Truck, label: 'Shipped', color: '#5AC8FA' },
  { key: 'delivered', icon: Package, label: 'Delivered', color: '#C8962C' },
];

const STATUS_CONFIG = {
  pending_payment: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/15', label: 'Pending Payment' },
  paid:            { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/15', label: 'Paid' },
  shipped:         { icon: Truck, color: 'text-blue-400', bg: 'bg-blue-400/15', label: 'Shipped' },
  delivered:       { icon: CheckCircle, color: 'text-[#C8962C]', bg: 'bg-[#C8962C]/15', label: 'Delivered' },
  completed:       { icon: CheckCircle, color: 'text-[#C8962C]', bg: 'bg-[#C8962C]/15', label: 'Completed' },
  cancelled:       { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/15', label: 'Cancelled' },
  processing:      { icon: Clock, color: 'text-white/60', bg: 'bg-white/10', label: 'Processing' },
};

function StatusTimeline({ currentStatus }) {
  const statusOrder = ['pending_payment', 'paid', 'shipped', 'delivered'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <XCircle className="w-5 h-5 text-red-400" />
        <span className="text-red-400 font-black text-sm">Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {STATUS_STEPS.map((step, i) => {
        const isComplete = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const StepIcon = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isComplete ? '#C8962C' : 'rgba(255,255,255,0.05)',
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
              >
                <StepIcon className={`w-3.5 h-3.5 ${isComplete ? 'text-black' : 'text-white/30'}`} />
              </motion.div>
              <span className={`text-[9px] font-bold mt-1 ${isComplete ? 'text-[#C8962C]' : 'text-white/30'}`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < currentIdx ? 'bg-[#C8962C]' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function L2OrderSheet({ orderId }) {
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const { openSheet } = useSheet();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    Promise.all([
      supabase
        .from('orders')
        .select('id, created_at, total_gbp, status, tracking_number, shipping_address, buyer_email, buyer_id, seller_id, items, updated_at')
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

  const updateStatus = async (newStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;
      setOrder(prev => ({ ...prev, status: newStatus }));
      toast.success(`Order marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

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
        <Package className="w-10 h-10 text-[#C8962C]/20 mb-3" />
        <p className="text-white/50 font-bold text-sm">Order not found</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;
  const StatusIcon = statusCfg.icon;
  const isSeller = currentUserId && order.seller_id === currentUserId;
  const isBuyer = currentUserId && order.buyer_id === currentUserId;
  const counterpartyId = isSeller ? order.buyer_id : order.seller_id;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Order header */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Order</p>
              <p className="text-white font-black text-lg">#{order.id?.slice(-6).toUpperCase()}</p>
              <p className="text-white/40 text-xs mt-1">
                {format(new Date(order.created_at), 'd MMM yyyy · h:mm a')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusCfg.color} ${statusCfg.bg}`}>
                {statusCfg.label}
              </span>
              <p className="text-[#C8962C] font-black text-lg">£{(order.total_gbp || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status timeline */}
      <div className="px-4">
        <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] px-4">
          <StatusTimeline currentStatus={order.status} />
        </div>
      </div>

      {/* Tracking */}
      {order.tracking_number && (
        <div className="px-4 pt-3">
          <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-black">Tracking</p>
            <p className="text-white font-mono text-sm">{order.tracking_number}</p>
          </div>
        </div>
      )}

      {/* Shipping address */}
      {order.shipping_address && (
        <div className="px-4 pt-3">
          <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] p-4 flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#C8962C] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-black">Delivery</p>
              <p className="text-white/50 text-xs leading-relaxed">{order.shipping_address}</p>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div className="px-4 pt-3">
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-2">Items</p>
          <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] divide-y divide-white/5">
            {items.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C8962C]/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-[#C8962C]" />
                </div>
                <span className="flex-1 text-white text-sm truncate">{item.product_name}</span>
                {item.quantity > 1 && (
                  <span className="text-white/30 text-xs">x{item.quantity}</span>
                )}
                <span className="text-[#C8962C] font-black text-sm">£{((item.price_gbp || 0) * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline items from order.items JSONB (preloved orders) */}
      {!items.length && Array.isArray(order.items) && order.items.length > 0 && (
        <div className="px-4 pt-3">
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-2">Items</p>
          <div className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] divide-y divide-white/5">
            {order.items.map((item, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C8962C]/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-[#C8962C]" />
                </div>
                <span className="flex-1 text-white text-sm truncate">{item.title || 'Item'}</span>
                <span className="text-[#C8962C] font-black text-sm">£{((item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pt-4 pb-6 space-y-2">
        {/* Seller: mark shipped */}
        {isSeller && order.status === 'paid' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => updateStatus('shipped')}
            disabled={updating}
            className="w-full bg-[#C8962C] text-black font-black text-sm rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            Mark as Shipped
          </motion.button>
        )}

        {/* Buyer: confirm delivered */}
        {isBuyer && order.status === 'shipped' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => updateStatus('delivered')}
            disabled={updating}
            className="w-full bg-[#C8962C] text-black font-black text-sm rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm Delivered
          </motion.button>
        )}

        {/* Message counterparty */}
        {counterpartyId && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => openSheet('chat', { recipientId: counterpartyId })}
            className="w-full bg-[#1C1C1E] text-white font-bold text-sm rounded-xl py-3.5 flex items-center justify-center gap-2 border border-white/[0.06]"
          >
            <MessageCircle className="w-4 h-4 text-[#C8962C]" />
            Message {isSeller ? 'Buyer' : 'Seller'}
          </motion.button>
        )}

        {/* QR */}
        <button
          onClick={() => openSheet('qr', { orderId: order.id })}
          className="w-full bg-[#1C1C1E] rounded-xl py-3.5 flex items-center justify-center gap-2 border border-white/[0.06] hover:bg-white/5 transition-colors"
        >
          <QrCode className="w-4 h-4 text-[#C8962C]" />
          <span className="text-white font-bold text-sm">View QR Code</span>
        </button>
      </div>
    </div>
  );
}
