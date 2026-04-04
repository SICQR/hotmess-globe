/**
 * ShopEngine - HNH MESS + Official Merch (/market or /market/shop)
 *
 * Behavior: Direct checkout via Shopify. Add to cart -> Stripe.
 * Colour: #C8962C (amber)
 * Data: Shopify headless + internal products table
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Package, Heart, RefreshCw } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { isBrandVisible, BRAND_CONFIG } from '@/config/brands';
import { HNHMarketHero } from '@/components/home/HNHMarketHero';
import { HNHMessStrip } from '@/components/home/HNHMessStrip';
import { AppBanner } from '@/components/banners/AppBanner';
import { CardMoreButton } from '@/components/ui/CardMoreButton';
import {
  getShopifyProducts,
  getInternalProducts,
  getProductsByBrand,
  type Product,
  type ProductFilters,
} from '@/lib/data/market';

const AMBER = '#C8962C';
const PAGE_SIZE = 20;

const gridItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

function ShopProductCard({ product, index, onTap }: { product: Product; index: number; onTap: () => void }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const symbol = product.currency === 'GBP' ? '\u00a3' : '$';

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={gridItemVariants}
      layout
      className="relative bg-[#1C1C1E] rounded-xl overflow-hidden border border-white/[0.06] group"
    >
      <button
        onClick={onTap}
        className="relative block w-full aspect-[3/4] bg-white/[0.03] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
        aria-label={`View ${product.title}`}
      >
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-white/[0.08]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Shop badge */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(200,150,44,0.85)', color: '#000' }}
        >
          Shop
        </span>

        {product.compareAtPrice != null && product.compareAtPrice > product.price && (
          <span className="absolute bottom-10 right-2 px-2 py-0.5 bg-[#FF3B30] rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
            Sale
          </span>
        )}

        <CardMoreButton
          itemType="product"
          itemId={product.id}
          title={product.title}
          className="absolute top-2 right-2"
        />

        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setIsFavorite(prev => !prev); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFavorite(prev => !prev); } }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <Heart className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white/40'}`} />
        </span>
      </button>

      <button onClick={onTap} className="w-full text-left p-3 focus:outline-none">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">{product.title}</h3>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="font-black text-base leading-none" style={{ color: AMBER }}>
            {symbol}{product.price.toFixed(2)}
          </span>
          {product.compareAtPrice != null && product.compareAtPrice > product.price && (
            <span className="text-white/30 text-xs line-through">
              {symbol}{product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
        {/* Direct checkout CTA */}
        <div
          className="mt-2 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-black active:scale-95 transition-transform hm-gold-gradient"
        >
          Add to bag
        </div>
      </button>
    </motion.div>
  );
}

interface ShopEngineProps {
  search: string;
  className?: string;
}

export function ShopEngine({ search, className = '' }: ShopEngineProps) {
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);

  const filters: ProductFilters = useMemo(
    () => ({ source: 'shopify', search: search || undefined }),
    [search],
  );

  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: brandFilter
      ? ['shop-brand', brandFilter, search]
      : ['shop-products', filters],
    queryFn: () => {
      if (brandFilter) return getProductsByBrand(brandFilter);
      return Promise.all([getShopifyProducts(filters), getInternalProducts(filters)])
        .then(([s, i]) => [...i, ...s]);
    },
    staleTime: 2 * 60 * 1000,
  });

  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const hasMore = visibleCount < products.length;

  // Infinite scroll
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

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filters, brandFilter]);

  const featuredProduct = useMemo(() => {
    if (search || brandFilter) return null;
    return products[0] ?? null;
  }, [products, search, brandFilter]);

  const gridProducts = useMemo(() => {
    if (!featuredProduct) return visibleProducts;
    return visibleProducts.filter(p => p.id !== featuredProduct.id);
  }, [visibleProducts, featuredProduct]);

  const activeBrandName = brandFilter ? (BRAND_CONFIG[brandFilter]?.name ?? brandFilter.toUpperCase()) : null;

  return (
    <div ref={scrollRef} className={`flex-1 overflow-y-auto scroll-momentum pb-32 ${className}`}>
      {/* HNH MESS hero */}
      {!search && !brandFilter && <HNHMarketHero />}
      {!search && !brandFilter && <HNHMessStrip className="mt-2" />}
      <AppBanner placement="market_lube" variant="card" className="mx-4 mt-2" />

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
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No products yet</h3>
          <p className="text-sm text-center text-white/40">New drops land all the time. Check back soon.</p>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <>
          {/* Brand pills */}
          {!search && (
            <div className="px-4 pt-4 pb-1">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {([
                  { key: 'raw', label: 'RAW' },
                  { key: 'hung', label: 'HUNG' },
                  { key: 'high', label: 'HIGH' },
                  { key: 'hungmess', label: 'HUNGMESS' },
                  { key: 'superhung', label: 'SUPERHUNG' },
                  { key: 'superraw', label: 'SUPERRAW' },
                  { key: 'hnhMess', label: 'HNH MESS' },
                ] as const).filter(b => isBrandVisible(b.key)).map(b => {
                  const isActive = brandFilter === b.key;
                  return (
                    <button
                      key={b.key}
                      onClick={() => setBrandFilter(prev => prev === b.key ? null : b.key)}
                      className={`h-8 px-3 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap active:scale-95 transition-all ${
                        isActive ? 'text-black border border-[#C8962C]' : 'bg-[#1C1C1E] border border-white/10 text-white/70'
                      }`}
                      style={isActive ? { backgroundColor: AMBER } : undefined}
                      aria-pressed={isActive}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section header */}
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <h2 className="text-white font-bold text-sm">
              {brandFilter ? activeBrandName : 'Just dropped'}
            </h2>
            {brandFilter && (
              <button
                onClick={() => setBrandFilter(null)}
                className="text-xs font-semibold text-[#C8962C] active:scale-95 transition-transform"
              >
                Clear
              </button>
            )}
          </div>

          {/* Featured banner */}
          {featuredProduct && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-2 mb-3"
            >
              <button
                onClick={() => openSheet('product', { product: featuredProduct, source: 'shopify' })}
                className="relative w-full h-[180px] rounded-2xl overflow-hidden bg-[#1C1C1E] block text-left"
                aria-label={`Featured: ${featuredProduct.title}`}
              >
                {featuredProduct.images[0] ? (
                  <img src={featuredProduct.images[0]} alt={featuredProduct.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                    <Package className="w-16 h-16 text-white/[0.08]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: AMBER, color: '#000' }}>
                  Featured
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">{featuredProduct.title}</h3>
                  <span className="text-[#C8962C] font-extrabold text-xl">
                    {featuredProduct.currency === 'GBP' ? '\u00a3' : '$'}{featuredProduct.price.toFixed(2)}
                  </span>
                </div>
              </button>
            </motion.div>
          )}

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-3 px-4 pt-1">
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

export default ShopEngine;
