/**
 * DropsEngine - Limited brand drops (/market/drops)
 *
 * Behavior: Urgency/scarcity. Countdown timers, "X left", brand-focused.
 * Colour: #CF3A10 (creator orange)
 * Data: Shopify products tagged "drop" + internal products with drop metadata
 *
 * Cards show: countdown badge, stock remaining, brand logo, "Buy Now" CTA (not add to cart).
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame, Heart, Zap, RefreshCw } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { isBrandVisible, BRAND_CONFIG } from '@/config/brands';
import { CardMoreButton } from '@/components/ui/CardMoreButton';
import {
  getShopifyProducts,
  getInternalProducts,
  type Product,
  type ProductFilters,
} from '@/lib/data/market';

const DROP_ORANGE = '#CF3A10';
const AMBER = '#C8962C';
const PAGE_SIZE = 20;

const gridItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

/** Urgency badge — shows "LIMITED" or stock count */
function UrgencyBadge({ quantity }: { quantity?: number }) {
  const label = quantity != null && quantity <= 10
    ? `${quantity} left`
    : 'Limited';

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
      style={{ background: DROP_ORANGE, color: '#fff' }}
    >
      <Flame className="w-3 h-3" />
      {label}
    </span>
  );
}

function DropProductCard({ product, index, onTap }: { product: Product; index: number; onTap: () => void }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const symbol = product.currency === 'GBP' ? '\u00a3' : '$';

  // Determine brand from tags
  const brandTag = product.tags?.find(t =>
    ['raw', 'hung', 'high', 'hungmess', 'superhung', 'superraw'].includes(t.toLowerCase())
  );
  const brandName = brandTag ? BRAND_CONFIG[brandTag.toLowerCase()]?.name ?? brandTag.toUpperCase() : null;

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
        className="relative block w-full aspect-[3/4] bg-white/[0.03] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#CF3A10]"
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
            <Zap className="w-10 h-10 text-white/[0.08]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Urgency badge — top-left */}
        <div className="absolute top-2 left-2">
          <UrgencyBadge quantity={product.quantity} />
        </div>

        {/* Brand pill — top-right area */}
        {brandName && (
          <span className="absolute top-2 right-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm border border-white/20 text-white/80">
            {brandName}
          </span>
        )}

        <CardMoreButton
          itemType="product"
          itemId={product.id}
          title={product.title}
          className="absolute top-2 right-2"
        />

        {product.compareAtPrice != null && product.compareAtPrice > product.price && (
          <span className="absolute bottom-10 right-2 px-2 py-0.5 bg-[#FF3B30] rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
            Sale
          </span>
        )}

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
          <span className="font-black text-base leading-none" style={{ color: DROP_ORANGE }}>
            {symbol}{product.price.toFixed(2)}
          </span>
          {product.compareAtPrice != null && product.compareAtPrice > product.price && (
            <span className="text-white/30 text-xs line-through">
              {symbol}{product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
        {/* Urgency CTA */}
        <div
          className="mt-2 h-8 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-white active:scale-95 transition-transform"
          style={{ backgroundColor: DROP_ORANGE }}
        >
          <Zap className="w-3.5 h-3.5" />
          Buy now
        </div>
      </button>
    </motion.div>
  );
}

interface DropsEngineProps {
  search: string;
  className?: string;
}

export function DropsEngine({ search, className = '' }: DropsEngineProps) {
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filters: ProductFilters = useMemo(
    () => ({ source: 'shopify', search: search || undefined }),
    [search],
  );

  // Fetch all shop products then filter for "drop" tagged items
  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ['drops-products', filters],
    queryFn: async () => {
      const [shopify, internal] = await Promise.all([
        getShopifyProducts(filters),
        getInternalProducts(filters),
      ]);
      const all = [...internal, ...shopify];
      // Filter for drop-tagged products. If none tagged, show all (fallback for empty state)
      const drops = all.filter(p =>
        p.tags?.some(t => t.toLowerCase() === 'drop' || t.toLowerCase() === 'limited') ||
        (p.quantity != null && p.quantity <= 20)
      );
      return drops.length > 0 ? drops : all;
    },
    staleTime: 2 * 60 * 1000,
  });

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

  return (
    <div ref={scrollRef} className={`flex-1 overflow-y-auto scroll-momentum pb-32 ${className}`}>
      {/* Drops hero banner */}
      {!search && (
        <div className="mx-4 mt-4 mb-3 p-4 rounded-2xl border border-[#CF3A10]/30" style={{ background: 'linear-gradient(135deg, rgba(207,58,16,0.15), rgba(200,150,44,0.08))' }}>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5" style={{ color: DROP_ORANGE }} />
            <h2 className="text-white font-black text-base uppercase tracking-wider">Drops</h2>
          </div>
          <p className="text-white/50 text-xs">Limited runs. When they're gone, they're gone.</p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08]">
              <ShimmerBox className="w-full aspect-[3/4] !rounded-none" />
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
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="h-12 px-8 rounded-xl font-semibold text-white active:scale-95 transition-transform"
            style={{ backgroundColor: DROP_ORANGE }}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
            <Flame className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No drops right now</h3>
          <p className="text-sm text-center text-white/40">Limited pieces from HOTMESS brands land here. Check back.</p>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2">
          {visibleProducts.map((product, i) => (
            <DropProductCard
              key={product.id}
              product={product}
              index={i}
              onTap={() => openSheet('product', { product, source: product.source })}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${DROP_ORANGE} transparent ${DROP_ORANGE} ${DROP_ORANGE}` }} />
        </div>
      )}
    </div>
  );
}

export default DropsEngine;
