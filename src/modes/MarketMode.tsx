/**
 * MarketMode - Unified Commerce Engine (/market)
 *
 * Brand visibility is controlled by src/config/brands.ts — hidden brands
 * are excluded from navigation and collections automatically.
 *
 * Three commerce streams merged into one premium dark marketplace:
 *   1. Shop (Shopify headless) -- official HOTMESS merch
 *   2. Preloved (Supabase)     -- user-to-user listings
 *   3. Creator drops           -- tagged radio host merch
 *
 * Layout (top to bottom):
 *   - Fixed top bar: MARKET wordmark + cart badge + filter + search + source tabs + category chips
 *   - Featured banner (only when no filters active)
 *   - 2-column product grid with infinite scroll
 *   - Sell FAB (bottom-right)
 *
 * Data: TanStack Query (useQuery + useInfiniteQuery pattern via manual pagination)
 * Animation: Framer Motion staggered grid items + layout transitions
 * Loading: Custom skeleton loaders
 *
 * Wireframe:
 * ┌─────────────────────────────────────────┐
 * │  MARKET              [bag(n)]  [filter] │  Fixed top bar
 * │  [Q] Search drops, merch, preloved...   │  Search input
 * │  [All] [Shop] [Preloved]                │  Source tabs
 * │  [All][Clothing][Accessories][Art]...→  │  Category chips
 * ├─────────────────────────────────────────┤
 * │  [Featured banner 180px]                │  Only when unfiltered
 * │  ┌──────────┐  ┌──────────┐             │  2-col product grid
 * │  │ Product  │  │ Product  │             │  Infinite scroll
 * │  └──────────┘  └──────────┘             │
 * ├─────────────────────────────────────────┤
 * │                              [+ Sell]   │  FAB, z-40
 * └─────────────────────────────────────────┘
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Heart,
  Plus,
  X,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { isBrandVisible } from '@/config/brands';
import {
  getAllProducts,
  getCategories,
  type Product,
  type ProductFilters,
} from '@/lib/data';

// Safe cart item count hook (ShopCartProvider is always mounted via App.jsx)
function useCartItemCount(): number {
  const { cart } = useShopCart();
  // Shopify cart lines are edges in a connection
  const lines = cart?.lines;
  if (!lines) return 0;
  // Handle both array and edges/node connection shapes
  if (Array.isArray(lines)) return lines.length;
  if (lines.edges && Array.isArray(lines.edges)) return lines.edges.length;
  return 0;
}

// ---- Brand constants --------------------------------------------------------
const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';
const ROOT_BG = '#050507';
const MUTED = '#8E8E93';
const PAGE_SIZE = 20;

// ---- Source tab config ------------------------------------------------------
type SourceFilter = 'all' | 'shopify' | 'preloved';

const SOURCE_TABS: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'shopify', label: 'Shop' },
  { key: 'preloved', label: 'Preloved' },
];

// ---- Static category list (merged from Shopify + Preloved) ------------------
const STATIC_CATEGORIES = [
  'Clothing',
  'Accessories',
  'Art',
  'Equipment',
  'Other',
];

// ---- Animation variants -----------------------------------------------------
const gridItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ---- Skeleton primitives ----------------------------------------------------
function ShimmerBox({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08]">
      <ShimmerBox className="w-full aspect-square !rounded-none" />
      <div className="p-3 space-y-2">
        <ShimmerBox className="h-4 w-4/5 !rounded-md" />
        <ShimmerBox className="h-5 w-1/3 !rounded-md" />
      </div>
    </div>
  );
}

function FeaturedBannerSkeleton() {
  return (
    <div className="mx-4 mt-4 mb-2">
      <ShimmerBox className="w-full h-[180px] !rounded-2xl" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={gridItemVariants}
        >
          <ProductCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// ---- Debounce hook ----------------------------------------------------------
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ---- Source badge colors ----------------------------------------------------
function getSourceBadgeStyle(source: Product['source']): string {
  switch (source) {
    case 'shopify':
      return 'border-[#C8962C]/60 text-[#C8962C]';
    case 'preloved':
      return 'border-white/20 text-[#8E8E93]';
    case 'creator':
      return 'border-[#7C3AED]/60 text-[#7C3AED]';
    default:
      return 'border-white/20 text-[#8E8E93]';
  }
}

function getSourceLabel(source: Product['source']): string {
  switch (source) {
    case 'shopify':
      return 'Shop';
    case 'preloved':
      return 'Preloved';
    case 'creator':
      return 'Creator';
    default:
      return source;
  }
}

function getConditionLabel(condition: Product['condition']): string {
  switch (condition) {
    case 'like_new':
      return 'Like New';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'new':
      return 'New';
    default:
      return '';
  }
}

// =============================================================================
// PRODUCT CARD
// =============================================================================

interface ProductCardProps {
  product: Product;
  index: number;
  onTap: () => void;
}

function ProductCard({ product, index, onTap }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const symbol = product.currency === 'GBP' ? '\u00a3' : '$';

  const handleFavoriteToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsFavorite((prev) => !prev);
    },
    [],
  );

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={gridItemVariants}
      layout
      className="relative bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08]"
    >
      {/* Image area -- tap opens product sheet */}
      <button
        onClick={onTap}
        className="relative block w-full aspect-square bg-white/[0.03] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#C8962C] focus:ring-offset-1 focus:ring-offset-[#1C1C1E]"
        aria-label={`View ${product.title}`}
      >
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-white/[0.08]" />
          </div>
        )}

        {/* Source badge -- top-right */}
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-black/50 backdrop-blur-sm ${getSourceBadgeStyle(product.source)}`}
        >
          {getSourceLabel(product.source)}
        </span>

        {/* Condition badge -- top-left (preloved only) */}
        {product.source === 'preloved' && product.condition && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/50 backdrop-blur-sm border border-white/20 text-white/70">
            {getConditionLabel(product.condition)}
          </span>
        )}

        {/* Sale badge */}
        {product.compareAtPrice != null &&
          product.compareAtPrice > product.price && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#FF3B30] rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
              Sale
            </span>
          )}

        {/* Favorite heart -- bottom-right of image */}
        <span
          role="button"
          tabIndex={0}
          onClick={handleFavoriteToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFavoriteToggle(e as unknown as React.MouseEvent);
            }
          }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-white/40'
            }`}
          />
        </span>
      </button>

      {/* Info row below image */}
      <button
        onClick={onTap}
        className="w-full text-left p-3 focus:outline-none"
        aria-label={`${product.title} ${symbol}${product.price.toFixed(2)}`}
      >
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
          {product.title}
        </h3>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-[#C8962C] font-extrabold text-base leading-none">
            {symbol}
            {product.price.toFixed(2)}
          </span>
          {product.compareAtPrice != null &&
            product.compareAtPrice > product.price && (
              <span className="text-white/30 text-xs line-through">
                {symbol}
                {product.compareAtPrice.toFixed(2)}
              </span>
            )}
        </div>
      </button>
    </motion.div>
  );
}

// =============================================================================
// FEATURED BANNER
// =============================================================================

interface FeaturedBannerProps {
  product: Product;
  onTap: () => void;
}

function FeaturedBanner({ product, onTap }: FeaturedBannerProps) {
  const symbol = product.currency === 'GBP' ? '\u00a3' : '$';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mx-4 mt-4 mb-2"
    >
      <button
        onClick={onTap}
        className="relative w-full h-[180px] rounded-2xl overflow-hidden bg-[#1C1C1E] block text-left focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
        aria-label={`Featured: ${product.title}`}
      >
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
            <Package className="w-16 h-16 text-white/[0.08]" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Featured badge */}
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: AMBER, color: '#000' }}
        >
          Featured drop
        </span>

        {/* Category pill */}
        {product.category && (
          <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white/70 border border-white/10">
            {product.category}
          </span>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
            {product.title}
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[#C8962C] font-extrabold text-xl">
              {symbol}
              {product.price.toFixed(2)}
            </span>
            {product.compareAtPrice != null &&
              product.compareAtPrice > product.price && (
                <span className="text-white/40 text-sm line-through">
                  {symbol}
                  {product.compareAtPrice.toFixed(2)}
                </span>
              )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  onClear: () => void;
  hasFilters: boolean;
}

function EmptyState({ onClear, hasFilters }: EmptyStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeVariants}
      className="flex flex-col items-center justify-center py-24 px-8"
    >
      <ShoppingBag className="w-16 h-16 mb-4" style={{ color: MUTED }} />
      <h3 className="text-xl font-bold text-white mb-2">No drops found</h3>
      <p className="text-sm text-center mb-6" style={{ color: MUTED }}>
        {hasFilters
          ? 'Try adjusting your filters or search to find what you need.'
          : 'Nothing here yet. Check back soon for new drops.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="h-12 px-8 rounded-xl font-semibold text-white active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
          style={{ backgroundColor: AMBER }}
        >
          Clear filters
        </button>
      )}
    </motion.div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeVariants}
      className="flex flex-col items-center justify-center py-24 px-8"
    >
      <RefreshCw className="w-16 h-16 mb-4" style={{ color: MUTED }} />
      <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
      <p className="text-sm text-center mb-6" style={{ color: MUTED }}>
        Could not load products. Check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="h-12 px-8 rounded-xl font-semibold text-white active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
        style={{ backgroundColor: AMBER }}
      >
        Retry
      </button>
    </motion.div>
  );
}

// =============================================================================
// MAIN: MarketMode
// =============================================================================

interface MarketModeProps {
  className?: string;
}

export function MarketMode({ className = '' }: MarketModeProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSheet } = useSheet();

  // Cart item count for badge
  const cartItemCount = useCartItemCount();

  // ---- Filter state (synced to URL params) --------------------------------
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(
    searchParams.get('category'),
  );

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Sync search to URL
  useEffect(() => {
    setSearchParams(
      (prev) => {
        if (debouncedSearch) {
          prev.set('q', debouncedSearch);
        } else {
          prev.delete('q');
        }
        if (categoryFilter) {
          prev.set('category', categoryFilter);
        } else {
          prev.delete('category');
        }
        return prev;
      },
      { replace: true },
    );
  }, [debouncedSearch, categoryFilter, setSearchParams]);

  // ---- Data fetching with TanStack Query ----------------------------------
  const filters: ProductFilters = useMemo(
    () => ({
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      category: categoryFilter ?? undefined,
      search: debouncedSearch || undefined,
    }),
    [sourceFilter, categoryFilter, debouncedSearch],
  );

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Product[]>({
    queryKey: ['market-products', filters],
    queryFn: () => getAllProducts(filters),
    staleTime: 2 * 60 * 1000,
  });

  const { data: dynamicCategories = [] } = useQuery<string[]>({
    queryKey: ['market-categories'],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Merge static + dynamic categories, deduplicate
  const allCategories = useMemo(() => {
    const merged = new Set([...STATIC_CATEGORIES]);
    dynamicCategories.forEach((c) => {
      // Capitalize first letter for display consistency
      if (c) merged.add(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
    });
    return Array.from(merged);
  }, [dynamicCategories]);

  // ---- Derived data --------------------------------------------------------
  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount],
  );

  const hasMoreProducts = visibleCount < products.length;

  const featuredProduct = useMemo(() => {
    // Only show featured when no active filters
    if (debouncedSearch || categoryFilter || sourceFilter !== 'all') return null;
    return products[0] ?? null;
  }, [products, debouncedSearch, categoryFilter, sourceFilter]);

  // Grid products exclude the featured item to avoid duplication
  const gridProducts = useMemo(() => {
    if (!featuredProduct) return visibleProducts;
    return visibleProducts.filter((p) => p.id !== featuredProduct.id);
  }, [visibleProducts, featuredProduct]);

  const hasFilters = !!(debouncedSearch || categoryFilter || sourceFilter !== 'all');

  // ---- Infinite scroll via scroll listener ---------------------------------
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasMoreProducts) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercent = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercent > 0.8) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, products.length));
    }
  }, [hasMoreProducts, products.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  // ---- Handlers -------------------------------------------------------------
  const handleProductTap = useCallback(
    (product: Product) => {
      openSheet('product', { productId: product.id, source: product.source });
    },
    [openSheet],
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setSourceFilter('all');
    setCategoryFilter(null);
  }, []);

  const handleCategoryTap = useCallback((cat: string | null) => {
    setCategoryFilter((prev) => (prev === cat ? null : cat));
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['market-products'] });
    queryClient.invalidateQueries({ queryKey: ['market-categories'] });
    refetch();
  }, [queryClient, refetch]);

  // ---- Render ---------------------------------------------------------------
  return (
    <div
      className={`h-full w-full flex flex-col ${className}`}
      style={{ backgroundColor: ROOT_BG }}
    >
      {/* ================================================================== */}
      {/* FIXED TOP BAR                                                       */}
      {/* ================================================================== */}
      <div
        className="flex-shrink-0 z-40 border-b border-white/10"
        style={{ backgroundColor: '#0D0D0D' }}
      >
        {/* Title row */}
        <div className="h-14 px-4 flex items-center justify-between">
          <h1
            className="text-xl font-extrabold tracking-wider uppercase"
            style={{ color: AMBER }}
          >
            Market
          </h1>

          <div className="flex items-center gap-2">
            {/* Cart button with badge */}
            <button
              onClick={() => openSheet('cart', {})}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
              aria-label={`Shopping bag${cartItemCount > 0 ? `, ${cartItemCount} items` : ''}`}
            >
              <ShoppingBag className="w-5 h-5 text-white/70" />
              {cartItemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-black px-1"
                  style={{ backgroundColor: AMBER }}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* Filter button */}
            <button
              onClick={() => openSheet('filters', { mode: 'market' })}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search drops, merch, preloved..."
              className="w-full h-10 pl-10 pr-10 bg-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#C8962C] border-0"
              style={{ fontSize: '16px' /* prevent iOS zoom */ }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="w-3 h-3 text-white/50" />
              </button>
            )}
          </div>
        </div>

        {/* Source tabs */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSourceFilter(tab.key)}
              className={`h-9 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C8962C] ${
                sourceFilter === tab.key
                  ? 'text-black'
                  : 'text-[#8E8E93] border border-white/10'
              }`}
              style={
                sourceFilter === tab.key
                  ? { backgroundColor: AMBER }
                  : { backgroundColor: CARD_BG }
              }
              aria-pressed={sourceFilter === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            {/* "All" chip */}
            <button
              onClick={() => setCategoryFilter(null)}
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C8962C] whitespace-nowrap ${
                !categoryFilter
                  ? 'text-[#C8962C] border border-[#C8962C]'
                  : 'text-[#8E8E93]'
              }`}
              style={{
                backgroundColor: !categoryFilter
                  ? 'rgba(200,150,44,0.15)'
                  : CARD_BG,
              }}
              aria-pressed={!categoryFilter}
            >
              All
            </button>

            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryTap(cat)}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C8962C] whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'text-[#C8962C] border border-[#C8962C]'
                    : 'text-[#8E8E93]'
                }`}
                style={{
                  backgroundColor:
                    categoryFilter === cat
                      ? 'rgba(200,150,44,0.15)'
                      : CARD_BG,
                }}
                aria-pressed={categoryFilter === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SCROLLABLE CONTENT                                                   */}
      {/* ================================================================== */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-y-contain pb-32"
      >
        <AnimatePresence mode="wait">
          {/* LOADING STATE */}
          {isLoading && (
            <motion.div key="loading" initial="hidden" animate="visible" exit="exit" variants={fadeVariants}>
              <FeaturedBannerSkeleton />
              <SkeletonGrid />
            </motion.div>
          )}

          {/* ERROR STATE */}
          {!isLoading && isError && (
            <motion.div key="error" initial="hidden" animate="visible" exit="exit" variants={fadeVariants}>
              <ErrorState onRetry={handleRefresh} />
            </motion.div>
          )}

          {/* EMPTY STATE */}
          {!isLoading && !isError && products.length === 0 && (
            <motion.div key="empty" initial="hidden" animate="visible" exit="exit" variants={fadeVariants}>
              <EmptyState onClear={handleClearFilters} hasFilters={hasFilters} />
            </motion.div>
          )}

          {/* SUCCESS STATE */}
          {!isLoading && !isError && products.length > 0 && (
            <motion.div key="content" initial="hidden" animate="visible" exit="exit" variants={fadeVariants}>
              {/* Featured banner */}
              {featuredProduct && (
                <FeaturedBanner
                  product={featuredProduct}
                  onTap={() => handleProductTap(featuredProduct)}
                />
              )}

              {/* Brand pills */}
              {sourceFilter === 'all' && !debouncedSearch && !categoryFilter && (
                <div className="px-4 pt-4 pb-1">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {(
                      [
                        { key: 'raw', label: 'RAW' },
                        { key: 'hung', label: 'HUNG' },
                        { key: 'high', label: 'HIGH' },
                        { key: 'hungmess', label: 'HUNGMESS' },
                      ] as const
                    ).filter((b) => isBrandVisible(b.key)).map((b) => (
                      <button
                        key={b.key}
                        onClick={() => openSheet('brand', { brand: b.key })}
                        className="h-9 px-4 rounded-full text-xs font-black uppercase tracking-wider bg-[#1C1C1E] border border-white/10 text-white whitespace-nowrap active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
                        aria-label={`${b.label} brand page`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section header */}
              {sourceFilter === 'all' && !debouncedSearch && !categoryFilter && (
                <div className="px-4 pt-4 pb-1">
                  <h2 className="text-white font-bold text-base">Just dropped</h2>
                </div>
              )}

              {/* Product grid */}
              <div className="grid grid-cols-2 gap-3 px-4 pt-3">
                {gridProducts.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </div>

              {/* Load more indicator */}
              {hasMoreProducts && (
                <div className="flex items-center justify-center py-8">
                  <div
                    className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: `${AMBER} transparent ${AMBER} ${AMBER}` }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================================================================== */}
      {/* SELL FAB                                                             */}
      {/* ================================================================== */}
      <button
        onClick={() => openSheet('sell', {})}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C] focus:ring-offset-2 focus:ring-offset-[#050507]"
        style={{
          backgroundColor: AMBER,
          boxShadow: `0 8px 24px rgba(200, 150, 44, 0.35)`,
        }}
        aria-label="Sell an item"
      >
        <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default MarketMode;
