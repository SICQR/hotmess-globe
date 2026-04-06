/**
 * L2MyListingsSheet -- Seller's Preloved Listings Management
 *
 * Shows all seller's listings with status management:
 * - Pause / unpause
 * - Mark sold
 * - Edit (opens L2SellSheet with prefill)
 * - Delete (draft/paused only)
 * - View inbound interest via linked threads
 *
 * Colour: #9E7D47 (preloved brown)
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import {
  Package, Loader2, Edit, Pause, Play, CheckCircle,
  Trash2, MessageCircle, MoreHorizontal, Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

const PRELOVED_BROWN = '#9E7D47';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#8E8E93', bg: 'rgba(142,142,147,0.15)' },
  live: { label: 'Live', color: '#30D158', bg: 'rgba(48,209,88,0.15)' },
  active: { label: 'Live', color: '#30D158', bg: 'rgba(48,209,88,0.15)' },
  paused: { label: 'Paused', color: '#FF9500', bg: 'rgba(255,149,0,0.15)' },
  sold: { label: 'Sold', color: '#C8962C', bg: 'rgba(200,150,44,0.15)' },
  removed: { label: 'Removed', color: '#FF3B30', bg: 'rgba(255,59,48,0.15)' },
  moderation_hold: { label: 'Under review', color: '#FF9500', bg: 'rgba(255,149,0,0.15)' },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function ListingActions({ listing, onAction, acting }) {
  const [open, setOpen] = useState(false);
  const status = listing.status;
  const isLive = status === 'live' || status === 'active';
  const isPaused = status === 'paused';
  const isDraft = status === 'draft';
  const canDelete = isDraft || isPaused;
  const canPause = isLive;
  const canUnpause = isPaused;
  const canMarkSold = isLive || isPaused;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 bg-white/5 rounded-lg active:bg-white/10 transition-colors"
        aria-label="Listing actions"
      >
        <MoreHorizontal className="w-4 h-4 text-white/40" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 z-50 w-48 bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden shadow-xl"
            >
              {canPause && (
                <button
                  onClick={() => { setOpen(false); onAction(listing.id, 'pause'); }}
                  disabled={acting}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <Pause className="w-4 h-4 text-[#FF9500]" /> Pause listing
                </button>
              )}
              {canUnpause && (
                <button
                  onClick={() => { setOpen(false); onAction(listing.id, 'unpause'); }}
                  disabled={acting}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <Play className="w-4 h-4 text-[#30D158]" /> Resume listing
                </button>
              )}
              {canMarkSold && (
                <button
                  onClick={() => { setOpen(false); onAction(listing.id, 'sold'); }}
                  disabled={acting}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" style={{ color: PRELOVED_BROWN }} /> Mark sold
                </button>
              )}
              <button
                onClick={() => { setOpen(false); onAction(listing.id, 'edit'); }}
                disabled={acting}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
              >
                <Edit className="w-4 h-4 text-white/40" /> Edit
              </button>
              <button
                onClick={() => { setOpen(false); onAction(listing.id, 'view'); }}
                disabled={acting}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
              >
                <Eye className="w-4 h-4 text-white/40" /> View listing
              </button>
              {canDelete && (
                <button
                  onClick={() => { setOpen(false); onAction(listing.id, 'delete'); }}
                  disabled={acting}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-400/80 hover:bg-red-500/5 transition-colors border-t border-white/[0.06]"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function L2MyListingsSheet() {
  const { openSheet, closeSheet } = useSheet();
  const queryClient = useQueryClient();
  const [acting, setActing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, live, paused, sold, draft

  // Get current user
  const { data: userId } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    },
  });

  // Get listings
  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ['my-preloved-listings', userId, filter],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from('market_listings')
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (filter === 'live') query = query.in('status', ['live', 'active']);
      else if (filter !== 'all') query = query.eq('status', filter);

      const { data, error } = await query;
      if (error) { console.error('[my-listings]', error); return []; }
      return data || [];
    },
    enabled: !!userId,
  });

  // Get thread counts per listing
  const { data: threadCounts = {} } = useQuery({
    queryKey: ['my-listing-threads', userId],
    queryFn: async () => {
      if (!userId) return {};
      const { data } = await supabase
        .from('preloved_listing_threads')
        .select('listing_id')
        .eq('seller_id', userId);
      if (!data) return {};
      const counts = {};
      data.forEach(row => {
        counts[row.listing_id] = (counts[row.listing_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!userId,
  });

  const handleAction = useCallback(async (listingId, action) => {
    setActing(true);
    try {
      switch (action) {
        case 'pause':
          await supabase.from('market_listings').update({ status: 'paused' }).eq('id', listingId);
          toast.success('Listing paused');
          break;
        case 'unpause':
          await supabase.from('market_listings').update({ status: 'live' }).eq('id', listingId);
          toast.success('Listing resumed');
          break;
        case 'sold':
          await supabase.from('market_listings').update({ status: 'sold' }).eq('id', listingId);
          toast.success('Marked as sold');
          break;
        case 'delete': {
          const { error } = await supabase.from('market_listings').delete().eq('id', listingId);
          if (error) {
            toast.error('Cannot delete live listings. Pause first.');
          } else {
            toast.success('Listing deleted');
          }
          break;
        }
        case 'edit':
          openSheet('edit-listing', { listingId });
          return;
        case 'view':
          openSheet('product', { productId: `preloved_${listingId}`, source: 'preloved' });
          return;
        default:
          return;
      }
      queryClient.invalidateQueries({ queryKey: ['my-preloved-listings'] });
    } catch (err) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  }, [openSheet, queryClient]);

  // Stats
  const liveCount = listings.filter(l => l.status === 'live' || l.status === 'active').length;
  const soldCount = listings.filter(l => l.status === 'sold').length;
  const pausedCount = listings.filter(l => l.status === 'paused').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRELOVED_BROWN }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: PRELOVED_BROWN }} />
            My Listings
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-white/30">
            <span><span className="text-[#30D158] font-bold">{liveCount}</span> live</span>
            <span><span className="text-[#FF9500] font-bold">{pausedCount}</span> paused</span>
            <span><span style={{ color: PRELOVED_BROWN }} className="font-bold">{soldCount}</span> sold</span>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-3">
          {['all', 'live', 'paused', 'sold', 'draft'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                filter === f ? 'text-black' : 'text-white/40 bg-[#1C1C1E] border border-white/10'
              }`}
              style={filter === f ? { backgroundColor: PRELOVED_BROWN } : undefined}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Listings */}
      <div className="flex-1 overflow-y-auto">
        {listings.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm font-bold">
              {filter === 'all' ? 'No listings yet' : `No ${filter} listings`}
            </p>
            <p className="text-white/20 text-xs mt-1">
              {filter === 'all' ? 'List your first item to get started.' : 'Try a different filter.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => openSheet('sell', {})}
                className="mt-4 px-6 py-2 text-black font-black rounded-xl text-sm"
                style={{ backgroundColor: PRELOVED_BROWN }}
              >
                List an item
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {listings.map((listing, idx) => {
              const threads = threadCounts[listing.id] || 0;
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-[#1C1C1E] rounded-xl border border-white/[0.06] overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Thumbnail */}
                    {(listing.cover_image_url || (listing.images && listing.images[0])) ? (
                      <img
                        src={listing.cover_image_url || listing.images[0]}
                        alt={listing.title}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-white/10" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{listing.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-black text-sm" style={{ color: PRELOVED_BROWN }}>
                          {'\u00a3'}{listing.price_gbp || listing.price || 0}
                        </span>
                        <StatusBadge status={listing.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-white/25 text-[10px]">
                        {listing.category && <span className="uppercase">{listing.category}</span>}
                        {threads > 0 && (
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" /> {threads} interested
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <ListingActions listing={listing} onAction={handleAction} acting={acting} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 bg-black/80">
        <button
          onClick={() => openSheet('sell', {})}
          className="w-full py-3 text-black font-black rounded-xl text-sm active:scale-[0.98] transition-transform"
          style={{ backgroundColor: PRELOVED_BROWN }}
        >
          List another item
        </button>
      </div>
    </div>
  );
}
