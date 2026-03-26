/**
 * L2ShopSheet — Shopify store as a sheet overlay
 * 
 * Replaces: /market page navigation
 * Extracted from Shop.jsx + ShopProduct.jsx
 */

import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShoppingBag, ShoppingCart, Loader2,
  ChevronRight, Tag, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetSection, SheetActions, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { toast } from 'sonner';

/**
 * Render a full-screen age confirmation modal for 18+ products.
 *
 * @param {Object} props
 * @param {() => void} props.onConfirm - Called when the user confirms they are 18 or older.
 * @param {() => void} props.onCancel - Called when the user cancels or closes the modal.
 * @returns {import('react').ReactElement} A React element that presents an age verification dialog with confirm and cancel actions.
 */
function AgeGateModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1C1C1E] rounded-2xl p-6 mx-6 max-w-sm w-full border border-white/10"
      >
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[#C8962C]/15 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-black text-[#C8962C]">18+</span>
          </div>
          <h3 className="text-white text-lg font-bold mb-2">Age Verification</h3>
          <p className="text-white/60 text-sm mb-6">
            This product is restricted to customers aged 18 and over. By proceeding, you confirm you meet this requirement.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-xl font-semibold text-white/60 bg-white/10 active:scale-95 transition-transform"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-12 rounded-xl font-bold text-black bg-[#C8962C] active:scale-95 transition-transform"
            >
              I confirm I am 18+
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ImageCarousel — Depop/Vinted-style swipeable image gallery
 * Horizontal scroll with dot indicators and snap scrolling.
 */
function ImageCarousel({ images = [], alt = 'Product' }) {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIdx(Math.max(0, Math.min(idx, images.length - 1)));
  }, [images.length]);

  if (!images.length) {
    return (
      <div className="aspect-square bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#C8962C]/10 border border-[#C8962C]/30 flex items-center justify-center mb-3">
            <ShoppingBag className="w-10 h-10 text-[#C8962C]/60" />
          </div>
          <p className="text-xs uppercase tracking-widest text-[#C8962C]/40 font-bold">HOTMESS Market</p>
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="aspect-square bg-black overflow-hidden">
        <img src={images[0]} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {images.map((url, i) => (
          <div key={i} className="aspect-square w-full flex-shrink-0 snap-center bg-black">
            <img
              src={url}
              alt={`${alt} ${i + 1}`}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              i === activeIdx ? 'bg-white w-4' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Render the internal product detail view and handle purchase flow with optional age verification.
 *
 * Displays product information (image, title, price, description) and a Buy Now action that:
 * - if the product is age-restricted, prompts an age-confirmation modal and persists confirmation to localStorage under `hnhmess_age_confirmed`;
 * - otherwise or after confirmation, opens the Shopify storefront cart for the configured variant in a new browser tab; if Shopify env variables are missing, shows a toast and does not open checkout.
 *
 * @param {Object} props
 * @param {Object} props.product - Product data from the internal products table. Expected fields used by the component include:
 *   `title` (string), `price` (number), `description` (string, optional), `images` (array, optional), and `metadata.ageVerifiedOnly` (boolean, optional).
 */
function InternalProductDetail({ product }) {
  const [showAgeGate, setShowAgeGate] = useState(false);
  const isAgeRestricted = product?.metadata?.ageVerifiedOnly === true;
  const shopifyStoreUrl = import.meta.env.VITE_SHOPIFY_STORE_URL;
  const shopifyVariantId = import.meta.env.VITE_SHOPIFY_LUBE_VARIANT_ID;

  const isAgeConfirmed = () => {
    try { return localStorage.getItem('hnhmess_age_confirmed') === 'true'; } catch { return false; }
  };

  const handleBuyNow = () => {
    if (isAgeRestricted && !isAgeConfirmed()) {
      setShowAgeGate(true);
      return;
    }
    proceedToCheckout();
  };

  const proceedToCheckout = () => {
    if (!shopifyStoreUrl || !shopifyVariantId) {
      toast('Shop coming soon — check back shortly', { icon: '🛍️' });
      return;
    }
    const checkoutUrl = `https://${shopifyStoreUrl}/cart/${shopifyVariantId}:1`;
    window.open(checkoutUrl, '_blank', 'noopener');
  };

  const handleAgeConfirm = () => {
    try { localStorage.setItem('hnhmess_age_confirmed', 'true'); } catch {}
    setShowAgeGate(false);
    proceedToCheckout();
  };

  const img = product?.images?.[0];

  return (
    <div className="pb-24">
      {showAgeGate && (
        <AgeGateModal
          onConfirm={handleAgeConfirm}
          onCancel={() => setShowAgeGate(false)}
        />
      )}

      {/* Product Image */}
      {img ? (
        <div className="aspect-square bg-black overflow-hidden">
          <img src={img} alt={product.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-square bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#C8962C]/10 border border-[#C8962C]/30 flex items-center justify-center mb-3">
              <ShoppingBag className="w-10 h-10 text-[#C8962C]/60" />
            </div>
            <p className="text-xs uppercase tracking-widest text-[#C8962C]/40 font-bold">HNH MESS London</p>
          </div>
        </div>
      )}

      <SheetSection>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-[#C8962C]/15 text-[#C8962C] text-[10px] font-black uppercase rounded-full">
            HNH MESS
          </span>
          {isAgeRestricted && (
            <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[10px] font-bold rounded-full">
              18+
            </span>
          )}
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{product.title}</h2>
        <span className="text-2xl font-black text-[#C8962C]">
          £{product.price.toFixed(2)}
        </span>

        {product.description && (
          <p className="text-white/70 text-sm leading-relaxed mt-3">{product.description}</p>
        )}
      </SheetSection>

      <SheetDivider />

      <SheetSection title="About HNH MESS">
        <p className="text-white/50 text-sm leading-relaxed">
          Premium personal care from HNH MESS London. Body-safe, long-lasting formula.
        </p>
      </SheetSection>

      <SheetDivider />

      <SheetActions>
        <Button
          onClick={handleBuyNow}
          className="flex-1 h-14 bg-[#C8962C] hover:bg-[#C8962C]/90 font-black text-base"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Buy Now — £{product.price.toFixed(2)}
        </Button>
      </SheetActions>
    </div>
  );
}

/**
 * Renders the shop sheet overlay that displays featured products, a single Shopify product, preloved product details, or an internal product detail depending on props and state.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.handle] - Optional Shopify product handle used to fetch and show a single product detail.
 * @param {Object} [props.product] - Optional product object; when its id starts with `internal_` the internal product detail is shown, and when it contains `seller_id` or `source === 'preloved'` the preloved (P2P) detail is shown.
 * @param {Object} [props.seller] - Seller information used when rendering a preloved product detail.
 * @param {string} [props.source] - Optional source hint (e.g., `'preloved'`) that forces the preloved detail flow.
 * @returns {JSX.Element} The sheet UI for browsing featured products, viewing product details, or interacting with preloved/internal product flows.
 */
export default function L2ShopSheet({ handle, product, seller, source }) {
  const { openSheet, updateSheetProps } = useSheet();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const { addItem } = useShopCart();

  // Fetch featured products (hooks must be called unconditionally)
  const { data: shopData, isLoading, error } = useQuery({
    queryKey: ['shopify', 'featured-products'],
    queryFn: async () => {
      const resp = await fetch('/api/shopify/featured');
      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        if (payload?.error?.includes('not configured')) {
          return { ok: false, notConfigured: true, products: [] };
        }
        throw new Error(payload?.error || 'Failed to load shop');
      }
      return payload;
    },
    refetchInterval: 10 * 60 * 1000,
  });

  // Fetch single product if handle provided
  const { data: singleProduct } = useQuery({
    queryKey: ['shopify', 'product', handle],
    queryFn: async () => {
      if (!handle) return null;
      const resp = await fetch(`/api/shopify/product/${handle}`);
      if (!resp.ok) return null;
      return await resp.json();
    },
    enabled: !!handle,
  });

  const products = shopData?.products || [];
  const notConfigured = !!shopData?.notConfigured;
  const displayProduct = singleProduct || selectedProduct;

  // ---- Internal product (from products table) ----
  if (product?.id?.startsWith('internal_')) {
    return <InternalProductDetail product={product} />;
  }

  // ---- Preloved product detail view ----
  // When source='preloved' or product has seller_id, render P2P detail
  const isPreloved = source === 'preloved' || product?.seller_id;
  if (isPreloved && product) {
    const allImages = Array.isArray(product.images) ? product.images : (product.images ? [product.images] : []);
    const img = allImages[0];
    const conditionLabels = {
      new: 'New with tags',
      like_new: 'Like new',
      good: 'Good',
      fair: 'Fair',
    };
    return (
      <div className="pb-24">
        <ImageCarousel images={allImages} alt={product.title} />

        <SheetSection>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[#C8962C]/15 text-[#C8962C] text-[10px] font-black uppercase rounded-full">
              Preloved
            </span>
            {product.condition && (
              <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[10px] font-bold rounded-full">
                {conditionLabels[product.condition] || product.condition}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{product.title}</h2>
          <span className="text-2xl font-black text-[#C8962C]">
            £{parseFloat(product.price || 0).toFixed(2)}
          </span>

          {product.description && (
            <p className="text-white/70 text-sm leading-relaxed mt-3">{product.description}</p>
          )}
        </SheetSection>

        <SheetDivider />

        {/* Seller info */}
        <SheetSection title="Seller">
          <div className="flex items-center gap-3 p-3 bg-[#1C1C1E] rounded-xl">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-sm">
              {(seller?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{seller?.name || 'HOTMESS Seller'}</p>
              <p className="text-white/40 text-xs">Verified seller</p>
            </div>
          </div>
        </SheetSection>

        <SheetDivider />

        <SheetActions>
          <Button
            onClick={() => {
              openSheet('chat', { recipientId: product.seller_id });
            }}
            variant="outline"
            className="flex-1 h-12 border-white/20"
          >
            <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
            Message Seller
          </Button>
          <Button
            onClick={() => {
              // Add preloved item to localStorage cart
              try {
                const existing = JSON.parse(localStorage.getItem('hm_cart') || '[]');
                const already = existing.find((i) => i.id === product.id);
                if (already) {
                  already.qty = (already.qty || 1) + 1;
                } else {
                  existing.push({
                    id: product.id,
                    title: product.title,
                    price: parseFloat(product.price || 0),
                    image: img,
                    seller_id: product.seller_id,
                    source: 'preloved',
                    qty: 1,
                  });
                }
                localStorage.setItem('hm_cart', JSON.stringify(existing));
                toast.success('Added to cart');
                openSheet('cart');
              } catch {
                toast.error('Failed to add to cart');
              }
            }}
            className="flex-1 h-12 bg-[#C8962C] hover:bg-[#C8962C]/90 font-black"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </SheetActions>
      </div>
    );
  }

  // View product detail
  const handleViewProduct = (prod) => {
    setSelectedProduct(prod);
    updateSheetProps({ title: prod.title, subtitle: 'HOTMESS Market' });
  };

  // Back to product list
  const handleBack = () => {
    setSelectedProduct(null);
    updateSheetProps({ title: 'Shop', subtitle: null });
  };

  // Open cart
  const handleOpenCart = () => {
    openSheet('cart');
  };

  // Product Detail View
  if (displayProduct) {
    const images = displayProduct.images?.nodes || [];
    const primaryImage = displayProduct.featuredImage?.url || images[0]?.url;
    const price = displayProduct.priceRange?.minVariantPrice;
    const comparePrice = displayProduct.compareAtPriceRange?.minVariantPrice;

    return (
      <div className="pb-24">
        {/* Back button */}
        {!handle && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 p-4 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span className="text-sm">Back to Shop</span>
          </button>
        )}

        {/* Product Images — Depop-style carousel */}
        <ImageCarousel
          images={[primaryImage, ...images.map(i => i.url)].filter(Boolean)}
          alt={displayProduct.title}
        />

        {/* Product Info */}
        <SheetSection>
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-2xl font-black text-white flex-1">{displayProduct.title}</h2>
            <button
              onClick={() => {
                const url = `${window.location.origin}/shop/${displayProduct.handle || ''}`;
                if (navigator.share) {
                  navigator.share({ title: displayProduct.title, url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url);
                  toast.success('Link copied');
                }
              }}
              className="ml-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white active:scale-95 transition-all flex-shrink-0"
              aria-label="Share product"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            {price && (
              <span className="text-2xl font-black text-[#C8962C]">
                {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
              </span>
            )}
            {comparePrice && parseFloat(comparePrice.amount) > parseFloat(price?.amount || 0) && (
              <span className="text-lg text-white/40 line-through">
                {comparePrice.currencyCode} {parseFloat(comparePrice.amount).toFixed(2)}
              </span>
            )}
          </div>

          {displayProduct.description && (
            <p className="text-white/70 text-sm leading-relaxed">
              {displayProduct.description}
            </p>
          )}
        </SheetSection>

        <SheetDivider />

        {/* Tags */}
        {displayProduct.tags?.length > 0 && (
          <>
            <SheetSection title="Tags">
              <div className="flex flex-wrap gap-2">
                {displayProduct.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </SheetSection>
            <SheetDivider />
          </>
        )}

        {/* Buy Actions */}
        <SheetActions>
          <Button
            onClick={handleOpenCart}
            variant="outline"
            className="flex-1 h-12 border-white/20"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            View Cart
          </Button>
          <Button
            disabled={addingToCart}
            onClick={async () => {
              const variants = displayProduct.variants?.nodes || [];
              const variant = variants.find(v => v.availableForSale) || variants[0];
              if (!variant?.id) {
                toast.error('No variant available');
                return;
              }
              setAddingToCart(true);
              try {
                await addItem({ variantId: variant.id, quantity: 1 });
                toast.success('Added to cart');
                openSheet('cart');
              } catch (err) {
                toast.error(err?.message || 'Failed to add to cart');
              } finally {
                setAddingToCart(false);
              }
            }}
            className="flex-1 h-12 bg-[#C8962C] hover:bg-[#C8962C]/90 font-black"
          >
            {addingToCart
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <ShoppingBag className="w-4 h-4 mr-2" />}
            {addingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
        </SheetActions>
      </div>
    );
  }

  // Product List View
  return (
    <div className="pb-24">
      {/* Cart button */}
      <SheetSection>
        <Button
          onClick={handleOpenCart}
          variant="outline"
          className="w-full border-white/20"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          View Cart
        </Button>
      </SheetSection>

      <SheetDivider />

      {/* Products */}
      <SheetSection title="Featured">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : notConfigured ? (
          <div className="text-center py-8 px-4">
            <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 font-bold">Shop temporarily unavailable</p>
            <p className="text-white/40 text-sm mt-1">
              Shopify not configured for this deployment
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4">
            <p className="text-red-400 font-bold">Failed to load shop</p>
            <p className="text-white/40 text-sm mt-1">{error.message}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 px-4">
            <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((prod) => {
              const img = prod.featuredImage?.url || prod.images?.nodes?.[0]?.url;
              const price = prod.priceRange?.minVariantPrice;

              return (
                <motion.button
                  key={prod.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleViewProduct(prod)}
                  className="bg-white/5 rounded-xl overflow-hidden text-left hover:bg-white/10 transition-colors border border-white/10"
                >
                  {img && (
                    <div className="aspect-square bg-black">
                      <img 
                        src={img} 
                        alt={prod.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-white font-bold text-sm truncate">{prod.title}</p>
                    {price && (
                      <p className="text-[#C8962C] font-black text-sm mt-1">
                        {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </SheetSection>

      {/* P2P link */}
      <SheetSection>
        <button
          onClick={() => openSheet(SHEET_TYPES.VAULT)}
          className="w-full p-4 bg-[#C8962C]/10 border border-[#C8962C]/30 rounded-xl text-center"
        >
          <Tag className="w-6 h-6 text-[#C8962C] mx-auto mb-2" />
          <p className="text-[#C8962C] font-bold">Creator Marketplace</p>
          <p className="text-white/40 text-xs mt-1">Buy from community sellers</p>
        </button>
      </SheetSection>
    </div>
  );
}
