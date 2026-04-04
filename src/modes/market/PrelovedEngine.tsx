/**
 * PrelovedEngine - Chat-first person-to-person marketplace (/market/preloved)
 *
 * HOTMESS Preloved system brief:
 * - Chat-first, identity-signalling, proximity-aware exchange
 * - NO cart, NO instant checkout, NO anonymous purchase
 * - CTA: "Message seller" — all transactions start in chat
 * - Colour: #9E7D47 (preloved brown)
 * - Categories: clothing, accessories, art, music, equipment, gear, other
 * - Conditions: new, like_new, good, worn, used
 * - Delivery: pickup, shipping, both
 * - Approximate location only — never exact address
 *
 * Data: Supabase preloved_listings table
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle, Heart, Package, RefreshCw,
  MapPin, Truck, Flag, BookmarkPlus, Shield,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { CardMoreButton } from '@/components/ui/CardMoreButton';
import { supabase } from '@/components/utils/supabaseClient';
import {
  getPrelovedProducts,
  type Product,
  type ProductFilters,
} from '@/lib/data/market';

const PRELOVED_BROWN = '#9E7D47';
const PAGE_SIZE = 20;

const gridItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// Categories matching the DB enum
const CATEGORIES = [
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'art', label: 'Art' },
  { value: 'music', label: 'Music' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'gear', label: 'Gear' },
  { value: 'other', label: 'Other' },
];

function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

function getConditionLabel(condition: Product['condition']): string {
  switch (condition) {
    case 'like_new': return 'Like New';
    case 'good': return 'Good';
    case 'fair': return 'Fair';
    case 'new': return 'New';
    default: return condition ? String(condition).charAt(0).toUpperCase() + String(condition).slice(1) : '';
  }
}

function getDeliveryIcon(deliveryType?: string) {
  switch (deliveryType) {
    case 'pickup': return MapPin;
    case 'shipping': return Truck;
    case 'both': return Package;
    default: return null;
  }
}

function getDeliveryLabel(deliveryType?: string): string {
  switch (deliveryType) {
    case 'pickup': return 'Pickup';
    case 'shipping': return 'Shipping';
    case 'both': return 'Pickup or ship';
    default: return '';
  }
}

// ---- Product Card -----------------------------------------------------------

function PrelovedProductCard({ product, index, onTap, onMessage, onSave }: {
  product: Product;
  index: number;
  onTap: () => void;
  onMessage: () => void;
  onSave: () => void;
}) {
  const [isSaved, setIsSaved] = useState(false);
  const symbol = product.currency === 'GBP' ? '\u00a3' : '$';
  const deliveryType = (product.metadata as Record<string, unknown>)?.delivery_type as string | undefined;
  const DeliveryIcon = getDeliveryIcon(deliveryType);
  const openToOffers = (product.metadata as Record<string, unknown>)?.open_to_offers as boolean | undefined;

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(prev => !prev);
    onSave();
  };

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
        className="relative block w-full aspect-[3/4] bg-white/[0.03] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#9E7D47]"
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
            <Package className="w-10 h-10 text-white/[0.08]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Preloved badge */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(158,125,71,0.85)', color: '#fff' }}
        >
          Preloved
        </span>

        {/* Condition badge */}
        {product.condition && (
          <span className="absolute top-2 right-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm border border-white/20 text-white/80">
            {getConditionLabel(product.condition)}
          </span>
        )}

        <CardMoreButton
          itemType="product"
          itemId={product.id}
          title={product.title}
          profileId={product.sellerId}
          className="absolute top-2 right-2"
        />

        {/* Delivery indicator — bottom-left */}
        {DeliveryIcon && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/60 backdrop-blur-sm text-white/60 flex items-center gap-1">
            <DeliveryIcon className="w-3 h-3" />
            {getDeliveryLabel(deliveryType)}
          </span>
        )}

        {/* Save button */}
        <span
          role="button"
          tabIndex={0}
          onClick={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSave(e as unknown as React.MouseEvent); } }}
          aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          {isSaved ? (
            <Heart className="w-4 h-4 fill-[#9E7D47] text-[#9E7D47]" />
          ) : (
            <BookmarkPlus className="w-4 h-4 text-white/40" />
          )}
        </span>
      </button>

      <button onClick={onTap} className="w-full text-left p-3 focus:outline-none">
        {/* Seller row */}
        {product.sellerName && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {product.sellerAvatar ? (
              <img
                src={product.sellerAvatar}
                alt={product.sellerName}
                className="w-5 h-5 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/40">
                {product.sellerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] text-white/50 font-medium truncate">{product.sellerName}</span>
          </div>
        )}

        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">{product.title}</h3>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="font-black text-base leading-none" style={{ color: PRELOVED_BROWN }}>
            {symbol}{product.price.toFixed(0)}
          </span>
          {openToOffers && (
            <span className="text-white/25 text-[9px] font-bold uppercase">Offers</span>
          )}
        </div>

        {/* Chat-first CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onMessage(); }}
          className="mt-2 w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-transform border"
          style={{ borderColor: 'rgba(158,125,71,0.5)', color: PRELOVED_BROWN }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Message seller
        </button>
      </button>
    </motion.div>
  );
}

// ---- Main Engine ------------------------------------------------------------

interface PrelovedEngineProps {
  search: string;
  className?: string;
}

export function PrelovedEngine({ search, className = '' }: PrelovedEngineProps) {
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filters: ProductFilters = useMemo(
    () => ({
      source: 'preloved' as const,
      search: search || undefined,
      category: categoryFilter ?? undefined,
    }),
    [search, categoryFilter],
  );

  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ['preloved-products', filters],
    queryFn: () => getPrelovedProducts(filters),
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

  const handleMessageSeller = useCallback((product: Product) => {
    if (product.sellerId) {
      openSheet('chat', { recipientId: product.sellerId, context: `Re: ${product.title}` });
    }
  }, [openSheet]);

  const handleSaveListing = useCallback(async (product: Product) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const listingId = product.id.replace('preloved_', '');
      // Toggle save — try insert, on conflict delete
      const { error } = await supabase
        .from('preloved_listing_saves')
        .insert({ user_id: session.user.id, listing_id: listingId });
      if (error?.code === '23505') {
        // Already saved — remove
        await supabase
          .from('preloved_listing_saves')
          .delete()
          .eq('user_id', session.user.id)
          .eq('listing_id', listingId);
      }
    } catch { /* noop */ }
  }, []);

  return (
    <div ref={scrollRef} className={`flex-1 overflow-y-auto scroll-momentum pb-32 ${className}`}>
      {/* Safety banner */}
      {!search && (
        <div className="mx-4 mt-4 mb-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2">
          <Shield className="w-4 h-4 text-white/20 flex-shrink-0" />
          <p className="text-white/25 text-[10px]">
            Chat first. Agree terms before exchanging. Meet safely.
          </p>
        </div>
      )}

      {/* Category chips */}
      <div className="px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`h-8 px-3 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap ${
              !categoryFilter ? 'border' : ''
            }`}
            style={{
              backgroundColor: !categoryFilter ? 'rgba(158,125,71,0.15)' : '#1C1C1E',
              color: !categoryFilter ? PRELOVED_BROWN : '#8E8E93',
              borderColor: !categoryFilter ? PRELOVED_BROWN : undefined,
            }}
            aria-pressed={!categoryFilter}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(prev => prev === cat.value ? null : cat.value)}
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap ${
                categoryFilter === cat.value ? 'border' : ''
              }`}
              style={{
                backgroundColor: categoryFilter === cat.value ? 'rgba(158,125,71,0.15)' : '#1C1C1E',
                color: categoryFilter === cat.value ? PRELOVED_BROWN : '#8E8E93',
                borderColor: categoryFilter === cat.value ? PRELOVED_BROWN : undefined,
              }}
              aria-pressed={categoryFilter === cat.value}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08]">
              <ShimmerBox className="w-full aspect-[3/4] !rounded-none" />
              <div className="p-3 space-y-2">
                <ShimmerBox className="h-3 w-2/3 !rounded-md" />
                <ShimmerBox className="h-4 w-4/5 !rounded-md" />
                <ShimmerBox className="h-5 w-1/3 !rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && isError && (
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <RefreshCw className="w-16 h-16 mb-4 text-[#8E8E93]" />
          <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="h-12 px-8 rounded-xl font-semibold text-white active:scale-95 transition-transform"
            style={{ backgroundColor: PRELOVED_BROWN }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {categoryFilter ? 'Nothing in this category' : 'No listings yet'}
          </h3>
          <p className="text-sm text-center text-white/40 mb-4">
            {categoryFilter
              ? 'Try a different category or check back later.'
              : 'Be the first to list something. Tap the + button.'}
          </p>
          {categoryFilter && (
            <button
              onClick={() => setCategoryFilter(null)}
              className="h-10 px-6 rounded-xl text-sm font-bold active:scale-95 transition-transform"
              style={{ backgroundColor: PRELOVED_BROWN, color: '#000' }}
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Products */}
      {!isLoading && !isError && products.length > 0 && (
        <>
          <div className="px-4 pt-2 pb-1">
            <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              {products.length} listing{products.length !== 1 ? 's' : ''}
              {categoryFilter ? ` in ${CATEGORIES.find(c => c.value === categoryFilter)?.label ?? categoryFilter}` : ''}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pt-1">
            {visibleProducts.map((product, i) => (
              <PrelovedProductCard
                key={product.id}
                product={product}
                index={i}
                onTap={() => openSheet('product', { product, source: 'preloved' })}
                onMessage={() => handleMessageSeller(product)}
                onSave={() => handleSaveListing(product)}
              />
            ))}
          </div>
        </>
      )}

      {hasMore && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${PRELOVED_BROWN} transparent ${PRELOVED_BROWN} ${PRELOVED_BROWN}` }} />
        </div>
      )}
    </div>
  );
}

export default PrelovedEngine;
