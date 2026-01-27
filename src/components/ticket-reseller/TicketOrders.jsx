/**
 * TicketOrders - List of user's ticket orders (as buyer or seller)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Filter,
  Package,
  ShoppingBag
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../lib/AuthContext';

const STATUS_DISPLAY = {
  pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  confirmed: { label: 'Confirmed', color: 'text-green-400', bg: 'bg-green-500/20' },
  transfer_pending: { label: 'Awaiting Transfer', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  transferred: { label: 'Transferred', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20' },
  disputed: { label: 'Disputed', color: 'text-red-400', bg: 'bg-red-500/20' },
  refunded: { label: 'Refunded', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

export default function TicketOrders({ onSelectOrder }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [role, status]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('role', role);
      if (status) params.append('status', status);

      const res = await fetch(`/api/ticket-reseller/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionRequired = (order) => {
    if (order.userRole === 'seller') {
      if (order.status === 'confirmed') {
        return { text: 'Transfer ticket', urgent: true };
      }
    }
    if (order.userRole === 'buyer') {
      if (order.transfer?.[0]?.status === 'proof_submitted') {
        return { text: 'Confirm receipt', urgent: true };
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Your Ticket Orders</h1>
          
          {/* Filters */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              onClick={() => setRole('all')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                role === 'all'
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setRole('buyer')}
              className={`px-4 py-2 rounded-full whitespace-nowrap flex items-center gap-2 transition-colors ${
                role === 'buyer'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Purchases
            </button>
            <button
              onClick={() => setRole('seller')}
              className={`px-4 py-2 rounded-full whitespace-nowrap flex items-center gap-2 transition-colors ${
                role === 'seller'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Package className="w-4 h-4" />
              Sales
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
            <p className="text-gray-400">
              {role === 'buyer'
                ? 'Purchase tickets to see them here'
                : role === 'seller'
                ? 'Sell tickets to see orders here'
                : 'Your orders will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {orders.map((order) => {
                const statusInfo = STATUS_DISPLAY[order.status] || STATUS_DISPLAY.pending;
                const actionRequired = getActionRequired(order);
                const listing = order.listing;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => onSelectOrder(order.id)}
                    className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-pink-500/50 transition-all"
                  >
                    {/* Action Required Banner */}
                    {actionRequired && (
                      <div className={`mb-3 px-3 py-2 rounded-lg flex items-center gap-2 ${
                        actionRequired.urgent ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-300'
                      }`}>
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{actionRequired.text}</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Role Badge */}
                        <span className={`inline-block px-2 py-0.5 rounded text-xs mb-2 ${
                          order.userRole === 'buyer'
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {order.userRole === 'buyer' ? 'Purchase' : 'Sale'}
                        </span>

                        {/* Event Name */}
                        <h3 className="font-semibold line-clamp-1">
                          {listing?.event_name || 'Unknown Event'}
                        </h3>

                        {/* Event Details */}
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                          <span>{listing?.event_venue}</span>
                          {listing?.event_date && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>{format(new Date(listing.event_date), 'MMM d')}</span>
                            </>
                          )}
                        </div>

                        {/* Order Info */}
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className={`px-2 py-0.5 rounded ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-gray-500">
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Price & Arrow */}
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-lg">
                          £{(order.userRole === 'buyer' ? order.total_gbp : order.seller_payout_amount_gbp)?.toFixed(2)}
                        </p>
                        <ChevronRight className="w-5 h-5 text-gray-600 ml-auto mt-2" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
