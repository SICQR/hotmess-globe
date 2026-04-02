/**
 * L2MyListingsSheet — Seller listings management
 *
 * Shows seller's preloved listings from the marketplace.
 * Gated to Connected tier and above.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { Package, Loader2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';

export default function L2MyListingsSheet() {
  const [tier, setTier] = useState(null);
  const [tierLoading, setTierLoading] = useState(true);
  const { openSheet } = useSheet();

  // Check user tier
  useEffect(() => {
    const checkTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setTierLoading(false);
          return;
        }
        const { data } = await supabase.rpc('get_user_tier');
        setTier(data?.tier || 'mess');
      } catch (error) {
        console.error('Failed to check tier:', error);
        setTier('mess');
      } finally {
        setTierLoading(false);
      }
    };
    checkTier();
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['my-listings', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const { data, error } = await supabase
          .from('preloved_listings')
          .select('*')
          .eq('seller_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser?.id && !['mess'].includes(tier),
  });

  if (tierLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const canSell = ['connected', 'promoter', 'venue'].includes(tier);
  if (!canSell) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-4 py-12">
        <span className="text-4xl">🛍️</span>
        <h2 className="text-white font-black text-xl text-center">Sell on MESSMARKET</h2>
        <p className="text-white/40 text-sm text-center">Upgrade to Connected to list your preloved gear and archive pieces.</p>
        <button onClick={() => openSheet?.('membership', {})} className="px-8 py-3 bg-[#C8962C] text-black font-black rounded-2xl">Upgrade to Connected</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <h2 className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-[#C8962C]" />
          My Listings
        </h2>
        <p className="text-[11px] text-white/30 mt-0.5">Your preloved items on MESSMARKET</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {listings.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm font-bold">No listings yet</p>
            <p className="text-white/20 text-xs mt-1">List your first item to get started</p>
            <button
              onClick={() => openSheet?.('sell', {})}
              className="mt-4 px-6 py-2 bg-[#C8962C] text-black font-black rounded-xl text-sm"
            >
              List an Item
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {listings.map((listing, idx) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[#1C1C1E] rounded-2xl border border-white/8 overflow-hidden"
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Image */}
                  {listing.images && listing.images[0] && (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{listing.title}</p>
                    <p className="text-[#C8962C] font-black text-sm mt-0.5">£{listing.price}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        listing.status === 'active'
                          ? 'bg-[#39FF14]/20 text-[#39FF14]'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {listing.status || 'active'}
                      </span>
                      {listing.category && (
                        <span className="text-[9px] text-white/40 uppercase">{listing.category}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openSheet?.('edit-listing', { listing })}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-4 border-t border-white/10 bg-black/80">
        <button
          onClick={() => openSheet?.('sell', {})}
          className="w-full py-3 bg-[#C8962C] text-black font-black rounded-xl text-sm"
        >
          List Another Item
        </button>
      </div>
    </div>
  );
}
