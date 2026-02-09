/**
 * L2VaultSheet — User purchases/items as a sheet overlay
 * 
 * Replaces: /vault page navigation
 * Unified view of Shopify orders + P2P marketplace purchases
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { 
  Package, ShoppingBag, Ticket, Lock, 
  ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'p2p', label: 'P2P', icon: Package },
];

export default function L2VaultSheet() {
  const { openSheet } = useSheet();
  const [activeTab, setActiveTab] = useState('all');

  // Current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Shopify orders (if configured)
  const { data: shopifyOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['shopify', 'orders', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const resp = await fetch(`/api/shopify/orders?email=${encodeURIComponent(currentUser.email)}`);
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.orders || [];
    },
    enabled: !!currentUser?.email,
  });

  // P2P purchases
  const { data: p2pPurchases = [], isLoading: p2pLoading } = useQuery({
    queryKey: ['p2p', 'purchases', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      try {
        return await base44.entities.P2PListing.filter({ 
          buyer_email: currentUser.email,
          status: 'sold' 
        }, '-created_date');
      } catch {
        return [];
      }
    },
    enabled: !!currentUser?.email,
  });

  // Tickets (RSVP confirmations)
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      try {
        const rsvps = await base44.entities.EventRSVP.filter({ 
          user_email: currentUser.email 
        }, '-created_date');
        
        // Get event details for each RSVP
        const eventIds = [...new Set(rsvps.map(r => r.event_id))];
        const events = await Promise.all(
          eventIds.map(id => base44.entities.Event.get(id).catch(() => null))
        );
        const eventMap = new Map(events.filter(Boolean).map(e => [e.id, e]));
        
        return rsvps.map(rsvp => ({
          ...rsvp,
          event: eventMap.get(rsvp.event_id),
        })).filter(r => r.event);
      } catch {
        return [];
      }
    },
    enabled: !!currentUser?.email,
  });

  const isLoading = ordersLoading || p2pLoading || ticketsLoading;

  // Combine all items
  const allItems = [
    ...shopifyOrders.map(o => ({ ...o, type: 'shopify' })),
    ...p2pPurchases.map(p => ({ ...p, type: 'p2p' })),
    ...tickets.map(t => ({ ...t, type: 'ticket' })),
  ].sort((a, b) => 
    new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date)
  );

  // Filter by tab
  const filteredItems = activeTab === 'all' 
    ? allItems
    : activeTab === 'orders' 
      ? allItems.filter(i => i.type === 'shopify')
      : activeTab === 'tickets'
        ? allItems.filter(i => i.type === 'ticket')
        : allItems.filter(i => i.type === 'p2p');

  // View event
  const handleViewEvent = (eventId) => {
    openSheet(SHEET_TYPES.EVENT, { id: eventId });
  };

  // Open shop
  const handleOpenShop = () => {
    openSheet(SHEET_TYPES.SHOP);
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <Lock className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/60 font-bold">Sign in to view your vault</p>
        <p className="text-white/40 text-sm mt-1">
          Your purchases, tickets, and items will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Tabs */}
      <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-[#FF1493] text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            <span className="text-sm font-bold">{tab.label}</span>
          </button>
        ))}
      </div>

      <SheetDivider />

      {/* Items */}
      <div className="px-4 py-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#FF1493] animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 font-bold">Your vault is empty</p>
            <p className="text-white/40 text-sm mt-1 mb-6">
              Start shopping or RSVP to events
            </p>
            <Button 
              onClick={handleOpenShop}
              className="bg-[#FF1493] hover:bg-[#FF1493]/90"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Shop
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  layout
                  className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                >
                  {/* Shopify Order */}
                  {item.type === 'shopify' && (
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FF1493]/20 flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-[#FF1493]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold truncate">
                            Order #{item.orderNumber || item.id?.split('/').pop()}
                          </p>
                          <p className="text-white/40 text-xs">
                            {item.createdAt && format(new Date(item.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#FF1493] font-black">
                            {item.totalPrice?.currencyCode} {parseFloat(item.totalPrice?.amount || 0).toFixed(2)}
                          </p>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            item.fulfillmentStatus === 'FULFILLED' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          )}>
                            {item.fulfillmentStatus || 'Processing'}
                          </span>
                        </div>
                      </div>
                      {item.lineItems?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-white/40 text-xs">
                            {item.lineItems.length} item{item.lineItems.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ticket */}
                  {item.type === 'ticket' && item.event && (
                    <button
                      onClick={() => handleViewEvent(item.event_id)}
                      className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#00CED1]/20 flex items-center justify-center">
                          <Ticket className="w-5 h-5 text-[#00CED1]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold truncate">{item.event.title}</p>
                          <p className="text-white/40 text-xs">
                            {item.event.date && format(new Date(item.event.date), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/20" />
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/40">RSVP confirmed</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          Attending
                        </span>
                      </div>
                    </button>
                  )}

                  {/* P2P Purchase */}
                  {item.type === 'p2p' && (
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FFD700]/20 flex items-center justify-center">
                          <Package className="w-5 h-5 text-[#FFD700]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold truncate">{item.title}</p>
                          <p className="text-white/40 text-xs">
                            From {item.seller_name || 'Seller'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#FFD700] font-black">
                            £{parseFloat(item.price || 0).toFixed(2)}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700]">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
