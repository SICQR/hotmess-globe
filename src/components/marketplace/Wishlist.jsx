import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Trash2, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Wishlist item card
function WishlistItem({ 
  item, 
  onRemove, 
  onToggleNotify,
  onAddToCart,
}) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    await onRemove?.(item.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isRemoving ? 0 : 1, scale: isRemoving ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.9, height: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
    >
      <div className="flex gap-4 p-4">
        {/* Product image */}
        <Link 
          to={item.productHandle 
            ? `/market/p/${item.productHandle}` 
            : `${createPageUrl('ProductDetail')}?id=${item.productId}`
          }
          className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white/5"
        >
          {item.image ? (
            <motion.img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-white/20" />
            </div>
          )}
        </Link>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <Link 
            to={item.productHandle 
              ? `/market/p/${item.productHandle}` 
              : `${createPageUrl('ProductDetail')}?id=${item.productId}`
            }
          >
            <h3 className="font-bold text-sm truncate hover:text-[#FF1493] transition-colors">
              {item.title}
            </h3>
          </Link>
          
          {item.seller && (
            <p className="text-xs text-white/40 truncate">{item.seller}</p>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-black text-[#FF1493]">
              {item.currency || '£'}{item.price?.toFixed(2)}
            </span>
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-xs text-white/40 line-through">
                {item.currency || '£'}{item.originalPrice?.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock status */}
          {item.inStock !== undefined && (
            <div className={cn(
              "text-xs mt-1",
              item.inStock ? "text-[#39FF14]" : "text-red-400"
            )}>
              {item.inStock ? 'In Stock' : 'Out of Stock'}
            </div>
          )}

          {/* Added date */}
          {item.addedAt && (
            <p className="text-[10px] text-white/30 mt-1">
              Added {new Date(item.addedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onToggleNotify?.(item.id)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              item.notify 
                ? "bg-[#FFEB3B]/20 text-[#FFEB3B]" 
                : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
            )}
            title={item.notify ? "Notifications on" : "Notify on price drop"}
          >
            {item.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={handleRemove}
            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Remove from wishlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add to cart button */}
      {item.inStock !== false && (
        <div className="px-4 pb-4">
          <Button
            onClick={() => onAddToCart?.(item)}
            variant="hot"
            className="w-full font-bold text-xs"
            size="sm"
          >
            <ShoppingBag className="w-3 h-3 mr-1" />
            Add to Cart
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// Wishlist button for product pages
export function WishlistButton({ 
  productId,
  isInWishlist = false,
  onToggle,
  size = 'default', // 'sm', 'default', 'lg'
  variant = 'icon', // 'icon', 'button'
  className,
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnimating(true);
    await onToggle?.(productId);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const sizes = {
    sm: 'w-8 h-8',
    default: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'button') {
    return (
      <Button
        onClick={handleClick}
        variant={isInWishlist ? 'hot' : 'outline'}
        className={cn("font-bold", className)}
      >
        <motion.div
          animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart 
            className={cn(
              "w-4 h-4 mr-2",
              isInWishlist && "fill-current"
            )} 
          />
        </motion.div>
        {isInWishlist ? 'Saved' : 'Save'}
      </Button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center rounded-full transition-all",
        sizes[size],
        isInWishlist 
          ? "bg-[#FF1493] text-white" 
          : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white",
        className
      )}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={isAnimating ? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Heart 
          className={cn(
            iconSizes[size],
            isInWishlist && "fill-current"
          )} 
        />
      </motion.div>
    </motion.button>
  );
}

// Main wishlist component
export default function Wishlist({
  items = [],
  onRemove,
  onToggleNotify,
  onAddToCart,
  onClearAll,
  isLoading = false,
  className,
}) {
  const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#FF1493]" />
          <h2 className="text-xl font-black uppercase">Wishlist</h2>
          <span className="text-sm text-white/40">({items.length} items)</span>
        </div>
        {items.length > 0 && (
          <Button
            onClick={onClearAll}
            variant="ghost"
            size="sm"
            className="text-white/40 hover:text-red-400"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Total Value</span>
            <span className="text-xl font-black text-[#FF1493]">
              £{totalValue.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <WishlistItem
              key={item.id}
              item={item}
              onRemove={onRemove}
              onToggleNotify={onToggleNotify}
              onAddToCart={onAddToCart}
            />
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {items.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Heart className="w-16 h-16 mx-auto mb-4 text-white/10" />
            <h3 className="text-lg font-bold mb-2">Your wishlist is empty</h3>
            <p className="text-sm text-white/40 mb-6">
              Save items you love and we'll notify you about price drops!
            </p>
            <Button asChild variant="hot">
              <Link to="/market">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Browse Products
              </Link>
            </Button>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-white/10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                    <div className="h-6 bg-white/10 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for managing wishlist
export function useWishlist(userId) {
  const [items, setItems] = useState([]);
  const [isLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const key = userId ? `wishlist_${userId}` : 'wishlist_guest';
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, [userId]);

  // Save to localStorage when items change
  useEffect(() => {
    const key = userId ? `wishlist_${userId}` : 'wishlist_guest';
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, [items, userId]);

  const addToWishlist = useCallback((product) => {
    setItems(prev => {
      const exists = prev.some(item => item.productId === product.id);
      if (exists) return prev;
      return [...prev, {
        id: Date.now().toString(),
        productId: product.id,
        productHandle: product.handle,
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        seller: product.seller,
        inStock: product.inStock,
        currency: product.currency,
        notify: false,
        addedAt: new Date().toISOString(),
      }];
    });
  }, []);

  const removeFromWishlist = useCallback((itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const toggleWishlist = useCallback((product) => {
    const exists = items.some(item => item.productId === product.id);
    if (exists) {
      const item = items.find(i => i.productId === product.id);
      if (item) removeFromWishlist(item.id);
    } else {
      addToWishlist(product);
    }
  }, [items, addToWishlist, removeFromWishlist]);

  const isInWishlist = useCallback((productId) => {
    return items.some(item => item.productId === productId);
  }, [items]);

  const toggleNotify = useCallback((itemId) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, notify: !item.notify }
        : item
    ));
  }, []);

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    toggleNotify,
    clearWishlist,
  };
}
