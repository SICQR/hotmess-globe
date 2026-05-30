/**
 * L2MarketplaceSheet — Native P2P + Shopify marketplace sheet
 *
 * 2-col product grid with filter tabs.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { ShoppingBag, Loader2, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';

const FILTERS = ['New', 'Gear', 'Tickets', 'Art'];

const CATEGORY_MAP = {
  Gear: ['gear', 'equipment', 'clothing', 'fashion'],
  Tickets: ['tickets', 'event', 'entry'],
  Art: ['art', 'prints', 'photography', 'creative'],
};

export default function L2MarketplaceSheet() {
  const [filter, setFilter] = useState('New');
  const { openSheet } = useSheet();

  const { data: userId } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['marketplace-sheet', filter],
    queryFn: async () => {
      try {
        let query = supabase
          .from('market_listings')
          .select('id, title, price, price_pence, cover_image_url, seller_id, category, condition, created_at, status, market_sellers(display_name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(30);

        if (filter !== 'New' && CATEGORY_MAP[filter]) {
          query = query.in('category', CATEGORY_MAP[filter]);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch {
        // Fallback: empty (graceful)
        return [];
      }
    },
    refetchInterval: 120000,
  });

  const formatPrice = (p) => {
    // Priority 1: price_pence (new schema)
    if (p.price_pence != null) {
      return `£${(p.price_pence / 100).toFixed(2)}`;
    }
    // Priority 2: price (legacy schema)
    if (p.price != null) {
      const n = parseFloat(p.price);
      return isNaN(n) ? '' : `£${n.toFixed(2)}`;
    }
    return '£0.00';
  };

  const getProductImage = (product) => {
    // Only use the explicitly set cover image to prevent 'leaking' images from other listings
    if (product.cover_image_url && product.cover_image_url.length > 5) {
      return product.cover_image_url;
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <h2 className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#C8962C]" />
          MESSMARKET
        </h2>
        <p className="text-[11px] text-white/30 mt-0.5">P2P · Creator gear · Tickets</p>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
              filter === f
                ? 'text-[#C8962C] border-b-2 border-[#C8962C]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No listings {filter !== 'New' ? `in ${filter}` : 'yet'}</p>
            <p className="text-white/20 text-xs mt-1">Be the first to list something</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3">
            {products.map((product, i) => {
              const img = getProductImage(product);
              const priceLabel = formatPrice(product);
              return (
                <motion.div
                  key={product.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/8 flex flex-col"
                >
                  {/* Image */}
                  <button
                    onClick={() => openSheet('shop', { product, source: 'preloved' })}
                    className="relative block w-full aspect-square overflow-hidden bg-black/40 flex-shrink-0"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-white/10" />
                      </div>
                    )}
                    {product.category && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] font-bold text-white/50 uppercase">
                        {product.category}
                      </span>
                    )}
                    {product.seller_id === userId && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#C8962C] shadow-[0_0_10px_#C8962C]/40 rounded text-[9px] font-black text-black uppercase">
                        Your Item
                      </span>
                    )}
                  </button>

                  {/* Info + Buy */}
                  <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                    <p className="text-[11px] font-bold text-white leading-tight line-clamp-1">
                      {product.title}
                    </p>
                    <p className="text-[9px] text-white/30 uppercase tracking-tighter">
                      By {product.market_sellers?.display_name || 'Community Seller'}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[#C8962C] font-black text-sm">{priceLabel}</span>
                    </div>
                    <button
                      onClick={() => openSheet('shop', { product, source: 'preloved' })}
                      className="w-full py-1.5 bg-[#C8962C] text-black text-[10px] font-black uppercase tracking-wide rounded-lg"
                    >
                      View
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
