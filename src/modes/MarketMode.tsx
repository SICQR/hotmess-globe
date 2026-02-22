/**
 * MarketMode - Unified Commerce Engine
 * 
 * Merges Shopify + Preloved + Creator gear.
 * Single unified Product model.
 * Single ProductCard component.
 * No duplicate commerce UI systems.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ShoppingBag, Heart, Tag } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { getAllProducts, getCategories, type Product, type ProductFilters } from '@/lib/data';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoaders';

interface MarketModeProps {
  className?: string;
}

type SourceFilter = 'all' | 'shopify' | 'preloved';

export function MarketMode({ className = '' }: MarketModeProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(searchParams.get('category'));
  const { openSheet } = useSheet();

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      
      const filters: ProductFilters = {
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      };

      const [productsData, categoriesData] = await Promise.all([
        getAllProducts(filters),
        getCategories(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setIsLoading(false);
    };

    loadProducts();
  }, [sourceFilter, categoryFilter, searchQuery]);

  // Filter products locally for instant feedback
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, searchQuery]);

  const handleProductTap = (product: Product) => {
    openSheet('product', { productId: product.id });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      if (searchQuery) {
        prev.set('q', searchQuery);
      } else {
        prev.delete('q');
      }
      return prev;
    });
  };

  return (
    <div className={`h-full w-full bg-black ${className}`}>
      {/* Search & Filter Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-10 pl-10 pr-4 bg-white/5 rounded-xl border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
          </div>
          <button
            type="button"
            onClick={() => openSheet('filters', {})}
            className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10"
          >
            <Filter className="w-4 h-4 text-white/60" />
          </button>
        </form>

        {/* Source tabs */}
        <div className="flex items-center gap-2">
          {(['all', 'shopify', 'preloved'] as const).map((source) => (
            <button
              key={source}
              onClick={() => setSourceFilter(source)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                sourceFilter === source
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {source === 'all' && 'All'}
              {source === 'shopify' && 'Shop'}
              {source === 'preloved' && 'Preloved'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="overflow-y-auto scroll-momentum pb-24" style={{ height: 'calc(100% - 100px)' }}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-2 p-2"
            >
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : filteredProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 text-white/40"
            >
              <ShoppingBag className="w-12 h-12 mb-4" />
              <p>No products found</p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-3 p-4"
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onTap={() => handleProductTap(product)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cart button */}
      <button
        onClick={() => openSheet('cart', {})}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-[#FF1493] rounded-full flex items-center justify-center shadow-lg shadow-[#FF1493]/30"
      >
        <ShoppingBag className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}

// Unified Product Card
interface ProductCardProps {
  product: Product;
  onTap: () => void;
}

function ProductCard({ product, onTap }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <motion.button
      onClick={onTap}
      className="relative w-full bg-white/5 rounded-xl overflow-hidden border border-white/10 text-left"
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      <div className="aspect-square bg-white/5 relative">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Source badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          product.source === 'preloved' 
            ? 'bg-green-500/80 text-white' 
            : 'bg-black/60 text-white/80'
        }`}>
          {product.source === 'preloved' ? 'Preloved' : 'Shop'}
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white/60'}`} />
        </button>

        {/* Sale badge */}
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white">
            SALE
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-white truncate">{product.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-white font-bold">
            {product.currency === 'GBP' ? '£' : '$'}{product.price.toFixed(2)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-white/40 text-sm line-through">
              {product.currency === 'GBP' ? '£' : '$'}{product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
        {product.condition && (
          <div className="flex items-center gap-1 mt-1">
            <Tag className="w-3 h-3 text-white/40" />
            <span className="text-[10px] text-white/40 capitalize">{product.condition}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

export default MarketMode;
