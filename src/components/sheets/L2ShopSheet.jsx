/**
 * L2ShopSheet — Shopify store as a sheet overlay
 * 
 * Replaces: /market page navigation
 * Extracted from Shop.jsx + ShopProduct.jsx
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShoppingBag, ShoppingCart, Loader2,
  ChevronRight, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetSection, SheetActions, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { toast } from 'sonner';

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

  // ---- Preloved product detail view ----
  // When source='preloved' or product has seller_id, render P2P detail
  const isPreloved = source === 'preloved' || product?.seller_id;
  if (isPreloved && product) {
    const img = Array.isArray(product.images) ? product.images[0] : product.images;
    const conditionLabels = {
      new: 'New with tags',
      like_new: 'Like new',
      good: 'Good',
      fair: 'Fair',
    };
    return (
      <div className="pb-24">
        {img && (
          <div className="aspect-square bg-black overflow-hidden">
            <img src={img} alt={product.title} className="w-full h-full object-cover" />
          </div>
        )}

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

        {/* Product Image */}
        {primaryImage && (
          <div className="aspect-square bg-black overflow-hidden">
            <img 
              src={primaryImage} 
              alt={displayProduct.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Product Info */}
        <SheetSection>
          <h2 className="text-2xl font-black text-white mb-2">{displayProduct.title}</h2>
          
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
          className="w-full p-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl text-center"
        >
          <Tag className="w-6 h-6 text-[#FFD700] mx-auto mb-2" />
          <p className="text-[#FFD700] font-bold">Creator Marketplace</p>
          <p className="text-white/40 text-xs mt-1">Buy from community sellers</p>
        </button>
      </SheetSection>
    </div>
  );
}
