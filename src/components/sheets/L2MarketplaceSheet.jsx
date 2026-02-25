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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['marketplace-sheet', filter],
    queryFn: async () => {
      try {
        let query = supabase
          .from('products')
          .select('id, title, price, images, seller_email, category, created_at, status')
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

  const formatPrice = (price) => {
    if (price == null) return '';
    const n = parseFloat(price);
    return isNaN(n) ? '' : `£${n.toFixed(2)}`;
  };

  const getProductImage = (product) => {
    if (Array.isArray(product.images) && product.images[0]) return product.images[0];
    if (typeof product.images === 'string') return product.images;
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

      <div className="flex-1 overflow-y-auto">
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
              const price = formatPrice(product.price);
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
                    onClick={() => openSheet('product', { id: product.id })}
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
                  </button>

                  {/* Info + Buy */}
                  <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                    <p className="text-[11px] font-bold text-white leading-tight line-clamp-2">
                      {product.title}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      {price ? (
                        <span className="text-[#C8962C] font-black text-sm">{price}</span>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </div>
                    <button
                      onClick={() => openSheet('product', { id: product.id })}
                      className="w-full py-1.5 bg-[#C8962C] text-black text-[10px] font-black uppercase tracking-wide rounded-lg"
                    >
                      Buy
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
