/**
 * ShopEngine — Shopify + Internal Products
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Heart,
  Loader2,
  RefreshCw,
  Package,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import {
  Product,
  ProductFilters,
  getShopifyProducts,
  getInternalProducts,
} from '@/lib/data/market';
import { HNHMarketHero } from '@/components/home/HNHMarketHero';
import { HNHMessStrip } from '@/components/home/HNHMessStrip';
import { AppBanner } from '@/components/banners/AppBanner';


const AMBER = '#C8962C';
const PAGE_SIZE = 12;

function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

interface ShopProductCardProps {
  product: Product;
  index: number;
  onTap: () => void;
}

function ShopProductCard({ product, index, onTap }: ShopProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem, cart } = useShopCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const symbol = product.currency === 'GBP' ? '£' : '$';

  const gridItemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={gridItemVariants}
      className="relative bg-black rounded-xl overflow-hidden border border-white/5 group"
    >
      <button
        onClick={onTap}
        className="relative block w-full aspect-[4/5] bg-white/[0.03] overflow-hidden focus:outline-none"
        aria-label={`View ${product.title}`}
      >
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-white/5" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Brand Tag */}
        {(product as any).vendor && (
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-sm text-[#C8962C] border border-[#C8962C]/20"
          >
            {(product as any).vendor}
          </span>
        )}

        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setIsFavorite(prev => !prev); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFavorite(prev => !prev); } }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/40 active:scale-90 transition-all hover:text-red-500"
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </span>
      </button>

      <div className="w-full p-2.5 pb-3">
        <button onClick={onTap} className="w-full text-left focus:outline-none mb-1.5">
          <h3 className="text-[11px] font-black text-white/90 leading-tight line-clamp-1 uppercase tracking-tight">{product.title}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="font-black text-xs text-[#C8962C]">
              {symbol}{product.price.toFixed(2)}
            </span>
          </div>
        </button>
      </div>
    </motion.div>
  );
}

export function ShopEngine({ search, className = '' }: { search: string; className?: string }) {
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filters: ProductFilters = useMemo(
    () => ({ source: 'shopify', search: search || undefined }),
    [search],
  );

  const { data: allFetchedProducts = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ['shop-products', filters],
    queryFn: () => getShopifyProducts(filters),
    staleTime: 2 * 60 * 1000,
  });

  // Category/brand filter chips were removed (Phil 2026-05-25): search is the only
  // filter. The grid shows every fetched product, search-narrowed via `filters`.
  const products = allFetchedProducts;

  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const hasMore = visibleCount < products.length;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if ((el.scrollTop + el.clientHeight) / el.scrollHeight > 0.8) {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, products.length));
    }
  }, [hasMore, products.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filters]);

  const gridProducts = visibleProducts;

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto scroll-momentum pb-32 ${className}`}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(200,150,44,0.3) transparent',
        touchAction: 'pan-y',
        overscrollBehaviorY: 'contain',
      }}
    >
      {/* HNH MESS hero — Phil 2026-05-31: lives INSIDE the scroll container
          so it scrolls with the products. Natural 16:9 ratio. Image is the
          designed comp (headline + wordmark baked in); object-cover at
          16:9 keeps the design intact. */}
      <ShopMarketHero />

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08]">
              <ShimmerBox className="w-full aspect-square !rounded-none" />
              <div className="p-3 space-y-2">
                <ShimmerBox className="h-4 w-4/5 !rounded-md" />
                <ShimmerBox className="h-5 w-1/3 !rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <RefreshCw className="w-16 h-16 mb-4 text-[#8E8E93]" />
          <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
          <p className="text-sm text-center mb-6 text-[#8E8E93]">Could not load products.</p>
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="h-12 px-8 rounded-xl font-semibold text-white active:scale-95 transition-transform hm-gold-gradient"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4 mx-auto">
            <ShoppingBag className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">No match found</h3>
          <p className="text-sm text-white/40">Try a different search or check back later.</p>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <>
          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 px-4 pt-1">
            {gridProducts.map((product, i) => (
              <ShopProductCard
                key={product.id}
                product={product}
                index={i}
                onTap={() => openSheet('product', { product, source: 'shopify' })}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${AMBER} transparent ${AMBER} ${AMBER}` }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * ShopMarketHero — inline HNH MESS hero shipped Phil 2026-05-31.
 *
 * Renders the designed HNH BOYS HAVE FUN comp at full 16:9 aspect inside
 * ShopEngine's scroll container. Scrolls with the products. Image is the
 * baked designed comp (headline + wordmark inline), so object-cover at
 * 16:9 keeps the entire design visible.
 *
 * `aspectRatio: '16 / 9'` is the natural ratio of the source image
 * (2600x1451 ≈ 1.79). Lives inside an `overflow-y-auto` scroll container
 * so the parent-width aspect-ratio bug from the prior fix can't recur —
 * the scroll container governs the layout, not a flex column.
 */
function ShopMarketHero() {
  const [failed, setFailed] = React.useState(false);
  const HERO_URL = 'https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/brand-assets/market/hnh-boys-have-fun.png';
  return (
    <div className="px-4 pt-3 pb-2">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-white/5"
        style={{ aspectRatio: '16 / 9', background: '#0a0a0a' }}
      >
        {!failed && (
          <img
            src={HERO_URL}
            alt=""
            loading="eager"
            onError={() => setFailed(true)}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
            style={{ display: 'block' }}
          />
        )}
        {failed && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.95) 100%)' }}
          >
            <p className="text-white font-black uppercase tracking-wider text-xl text-center px-4">
              HNH BOYS HAVE FUN
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopEngine;

